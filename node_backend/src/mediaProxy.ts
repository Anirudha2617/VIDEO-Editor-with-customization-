
import type { Request, Response } from "express";
import { request as undiciRequest } from "undici";
import { URL } from "url";

// 1) Allowlist ONLY the domains you trust
const ALLOWED_HOSTS = new Set([
    "images.unsplash.com",
    "cdn.pixabay.com",
    "interactive-examples.mdn.mozilla.net",
    "upload.wikimedia.org",
    "api.allorigins.win",
    // add your own CDN/hosting domains here
]);

// 2) Allow only media content-types you want to support
const ALLOWED_CONTENT_TYPES = [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/ogg",
    "video/mp4",
    "image/jpeg",
    "image/png",
    "image/webp",
];

const MAX_BYTES = 50 * 1024 * 1024; // 50MB (tune as needed)
const TIMEOUT_MS = 20_000;

// Helper: validate URL + host allowlist
function parseAndValidate(raw: string): URL {
    let u: URL;
    try {
        u = new URL(raw);
    } catch {
        throw new Error("Invalid URL");
    }

    if (u.protocol !== "https:" && u.protocol !== "http:") {
        throw new Error("Only http/https URLs are allowed");
    }

    if (!ALLOWED_HOSTS.has(u.hostname)) {
        throw new Error(`Host not allowed: ${u.hostname}`);
    }

    return u;
}

export async function mediaProxy(req: Request, res: Response) {
    const rawUrl = String(req.query.url || "");
    if (!rawUrl) return res.status(400).send("Missing url param");

    let target: URL;
    try {
        console.log(`[Proxy] Validating URL: ${rawUrl}`);
        target = parseAndValidate(rawUrl);
        console.log(`[Proxy] Target Validated: ${target.hostname}`);
    } catch (e: any) {
        console.error(`[Proxy] Validation Failed: ${e.message}`);
        return res.status(403).send(e.message);
    }

    // Forward Range header (critical for audio/video playback/decoding)
    const range = req.headers["range"];

    try {
        console.log(`[Proxy] Fetching upstream...`);
        const upstream = await undiciRequest(target.toString(), {
            method: "GET",
            headers: {
                // Forward range for streaming
                ...(range ? { range: String(range) } : {}),
                // Some CDNs behave better with a UA
                "user-agent": "LuminaMediaProxy/1.0",
                "accept": "*/*",
                "referer": "https://pixabay.com/" // Try adding a referer as Pixabay might require it
            },
            // Timeouts
            headersTimeout: TIMEOUT_MS,
            bodyTimeout: TIMEOUT_MS,
            maxRedirections: 5,
        });

        const status = upstream.statusCode;
        console.log(`[Proxy] Upstream Status: ${status}`);
        const headers = upstream.headers as Record<string, string | string[] | undefined>;

        // Content-Type check
        const contentType = String(headers["content-type"] || "").split(";")[0].trim();

        // IMPORTANT: If upstream returns HTML, you're proxying an error page (will cause silent audio)
        if (!contentType || contentType.includes("text/html")) {
            res.status(502).send(`Upstream returned non-media content-type: ${contentType || "unknown"}`);
            upstream.body?.destroy();
            return;
        }

        // Restrict to known media types
        if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
            res.status(415).send(`Unsupported content-type: ${contentType}`);
            upstream.body?.destroy();
            return;
        }

        // Size limit (if known)
        const cl = headers["content-length"];
        if (cl) {
            const len = Number(cl);
            if (Number.isFinite(len) && len > MAX_BYTES) {
                res.status(413).send("File too large");
                upstream.body?.destroy();
                return;
            }
        }

        // Pass through status (200 or 206)
        res.status(status);

        // Pass through key headers (audio/video needs these)
        const passthroughHeaders = [
            "content-type",
            "content-length",
            "content-range",
            "accept-ranges",
            "etag",
            "last-modified",
            "cache-control",
        ];

        for (const h of passthroughHeaders) {
            const v = headers[h];
            if (typeof v !== "undefined") {
                // undici headers can be array strings, we just join them or take first
                const val = Array.isArray(v) ? v.join(', ') : String(v);
                res.setHeader(h, val);
            }
        }

        // Ensure accept-ranges is present (helpful even if upstream didn’t include)
        if (!res.getHeader("accept-ranges")) res.setHeader("accept-ranges", "bytes");

        // CORS Headers
        res.setHeader("access-control-allow-origin", "*");
        res.setHeader("access-control-allow-headers", "range, content-type");
        res.setHeader("access-control-expose-headers", "content-length, content-range, accept-ranges");

        // STREAM body (do not buffer)
        if (upstream.body) {
            // undici body is a ReadableStream or similar, pipe it to res
            // @ts-ignore - undici body piping needs specific handling or casting for express Response
            // Actually undici `body` is compatible with Node Streams usually, or .stream() method.
            // Let's use standard pipe if available or for await.
            // However, `upstream` is `Dispatcher.ResponseData`. `body` is `Readable` stream in Node.
            // So piping is correct.
            for await (const chunk of upstream.body) {
                res.write(chunk);
            }
            res.end();
        } else {
            res.end();
        }

        // Abort if client disconnects
        req.on("close", () => {
            try { upstream.body?.destroy(); } catch { }
        });

    } catch (err: any) {
        console.error("Proxy Error:", err);
        if (!res.headersSent) {
            return res.status(502).send(`Proxy failed: ${err.message || String(err)}`);
        } else {
            res.end();
        }
    }
}
