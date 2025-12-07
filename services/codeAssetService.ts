import { toPng } from 'html-to-image';
import { Asset, MediaType, Clip } from '../types';

export interface CodeAsset {
    id: string;
    name: string;
    html: string;
    css: string;
    js: string;
    width: number;
    height: number;
    type: 'image' | 'video' | 'text';
    duration?: number;
    fps?: number;
    thumbnail?: string;
    createdAt: number;
}

/**
 * Analyzes code to determine the best asset type
 */
export function analyzeCodeType(html: string, css: string, js: string): 'text' | 'image' | 'video' {
    const hasAnimation = css.includes('@keyframes') ||
        css.includes('animation:') ||
        css.includes('transition:') ||
        js.includes('requestAnimationFrame') ||
        js.includes('setInterval') ||
        js.includes('setTimeout');

    const hasComplexElements = html.includes('<img') ||
        html.includes('<video') ||
        html.includes('<canvas') ||
        html.includes('<svg');

    const hasOnlyText = !hasComplexElements &&
        (html.includes('<h1') ||
            html.includes('<h2') ||
            html.includes('<p') ||
            html.includes('<span') ||
            html.includes('<div'));

    if (hasAnimation) {
        return 'video';
    } else if (hasOnlyText && js.trim().length === 0) {
        return 'text';
    } else {
        return 'image';
    }
}

/**
 * Validates code for security issues
 */
export function validateCode(html: string, css: string, js: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for dangerous patterns
    const dangerousPatterns = [
        { pattern: /eval\s*\(/gi, message: 'eval() is not allowed for security reasons' },
        { pattern: /Function\s*\(/gi, message: 'Function() constructor is not allowed' },
        { pattern: /import\s*\(/gi, message: 'Dynamic imports are not allowed' },
        { pattern: /require\s*\(/gi, message: 'require() is not allowed' },
        { pattern: /<script[^>]*src=/gi, message: 'External scripts are not allowed' },
        { pattern: /<link[^>]*href=/gi, message: 'External stylesheets are not allowed' },
    ];

    const allCode = html + css + js;

    dangerousPatterns.forEach(({ pattern, message }) => {
        if (pattern.test(allCode)) {
            errors.push(message);
        }
    });

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Creates a sandboxed iframe for rendering code
 */
function createSandboxedIframe(html: string, css: string, js: string, width: number, height: number): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.width = `${width}px`;
    iframe.style.height = `${height}px`;
    iframe.style.border = 'none';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');

    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) throw new Error('Failed to access iframe document');

    // Inject code with transparent background
    doc.open();
    doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
            background-color: transparent !important;
            background: transparent !important;
            width: 100%;
            height: 100%;
            overflow: hidden;
          }
          ${css}
        </style>
      </head>
      <body>
        ${html}
        <script>
          try {
            ${js}
          } catch (e) {
            console.error('Code execution error:', e);
          }
        </script>
      </body>
    </html>
  `);
    doc.close();

    return iframe;
}

/**
 * Renders code to a static image (PNG with transparency)
 */
export async function renderCodeToImage(code: CodeAsset): Promise<string> {
    const validation = validateCode(code.html, code.css, code.js);
    if (!validation.valid) {
        throw new Error(`Code validation failed: ${validation.errors.join(', ')}`);
    }

    const iframe = createSandboxedIframe(code.html, code.css, code.js, code.width, code.height);

    try {
        // Wait for rendering and any initial animations
        await new Promise(resolve => setTimeout(resolve, 1000));

        const body = iframe.contentDocument?.body;
        if (!body) throw new Error('Failed to access iframe body');

        // Render to PNG with transparency
        const dataUrl = await toPng(body, {
            width: code.width,
            height: code.height,
            backgroundColor: null, // Preserve transparency
            pixelRatio: 2, // Higher quality
        });

        return dataUrl;
    } finally {
        // Cleanup
        document.body.removeChild(iframe);
    }
}

/**
 * Renders code to a video (WebM with transparency)
 */
export async function renderCodeToVideo(
    code: CodeAsset,
    onProgress?: (progress: number) => void
): Promise<Blob> {
    const validation = validateCode(code.html, code.css, code.js);
    if (!validation.valid) {
        throw new Error(`Code validation failed: ${validation.errors.join(', ')}`);
    }

    const iframe = createSandboxedIframe(code.html, code.css, code.js, code.width, code.height);
    const canvas = document.createElement('canvas');
    canvas.width = code.width;
    canvas.height = code.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        document.body.removeChild(iframe);
        throw new Error('Failed to get canvas context');
    }

    try {
        // Wait for initial render
        await new Promise(resolve => setTimeout(resolve, 500));

        const fps = code.fps || 30;
        const duration = code.duration || 3;
        const stream = canvas.captureStream(fps);

        // Setup MediaRecorder
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
            ? 'video/webm;codecs=vp9'
            : 'video/webm;codecs=vp8';

        const recorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: 8000000,
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunks.push(e.data);
            }
        };

        const recordingComplete = new Promise<Blob>((resolve, reject) => {
            recorder.onstop = () => {
                if (chunks.length > 0) {
                    resolve(new Blob(chunks, { type: 'video/webm' }));
                } else {
                    reject(new Error('No video data recorded'));
                }
            };
            recorder.onerror = (e) => reject(e);
        });

        recorder.start();

        // Capture frames
        const frameDuration = 1 / fps;
        const totalFrames = Math.ceil(duration * fps);
        let currentFrame = 0;

        const captureFrame = async () => {
            if (currentFrame >= totalFrames) {
                recorder.stop();
                return;
            }

            const body = iframe.contentDocument?.body;
            if (body) {
                // Clear canvas with transparency
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Render iframe to canvas
                const dataUrl = await toPng(body, {
                    width: code.width,
                    height: code.height,
                    backgroundColor: null,
                });

                const img = new Image();
                await new Promise((resolve) => {
                    img.onload = resolve;
                    img.src = dataUrl;
                });

                ctx.drawImage(img, 0, 0);
            }

            currentFrame++;
            if (onProgress) {
                onProgress((currentFrame / totalFrames) * 100);
            }

            setTimeout(captureFrame, frameDuration * 1000);
        };

        await captureFrame();
        return await recordingComplete;

    } finally {
        document.body.removeChild(iframe);
    }
}

/**
 * Extracts text content from HTML
 */
export function extractTextFromHTML(html: string): string {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
}

/**
 * Parses CSS and extracts relevant properties
 */
/**
 * Parses CSS and extracts relevant properties
 */
export function parseCSSProperties(css: string): any {
    const properties: any = {};

    // Improved CSS parser to handle more formats
    const patterns = {
        fontSize: /font-size:\s*([^;]+)/i,
        fontFamily: /font-family:\s*([^;]+)/i,
        color: /(?:^|[^-])color:\s*([^;]+)/i,
        fontWeight: /font-weight:\s*([^;]+)/i,
        fontStyle: /font-style:\s*([^;]+)/i,
        textAlign: /text-align:\s*([^;]+)/i,
        backgroundColor: /background-color:\s*([^;]+)/i,
        background: /background:\s*([^;]+)/i,
        padding: /padding:\s*([^;]+)/i,
        borderRadius: /border-radius:\s*([^;]+)/i,
        textShadow: /text-shadow:\s*([^;]+)/i,
        transform: /transform:\s*([^;]+)/i,
        letterSpacing: /letter-spacing:\s*([^;]+)/i,
        lineHeight: /line-height:\s*([^;]+)/i,
        textTransform: /text-transform:\s*([^;]+)/i,
        filter: /filter:\s*([^;]+)/i,
    };

    Object.entries(patterns).forEach(([key, pattern]) => {
        const match = css.match(pattern);
        if (match) {
            properties[key] = match[1].trim();
        }
    });

    return properties;
}

/**
 * Converts code asset to a TEXT clip
 */
export function createTextClipFromCode(code: CodeAsset): Partial<Clip> {
    const text = extractTextFromHTML(code.html);
    const cssProps = parseCSSProperties(code.css);

    // Parse font size
    let fontSize = 48; // Default larger for visibility
    if (cssProps.fontSize) {
        const sizeMatch = cssProps.fontSize.match(/(\d+)/);
        if (sizeMatch) fontSize = parseInt(sizeMatch[1]);
    }

    // Parse font weight
    const isBold = cssProps.fontWeight === 'bold' ||
        cssProps.fontWeight === '700' ||
        cssProps.fontWeight === '800' ||
        cssProps.fontWeight === '900';

    // Parse font style
    const isItalic = cssProps.fontStyle === 'italic';

    // Parse color
    let fontColor = '#ffffff';
    if (cssProps.color) {
        fontColor = cssProps.color;
    }

    // Parse background
    let backgroundColor = undefined;
    if (cssProps.backgroundColor) {
        backgroundColor = cssProps.backgroundColor;
    } else if (cssProps.background && !cssProps.background.includes('gradient')) {
        backgroundColor = cssProps.background;
    }

    // Parse padding
    let padding = 0;
    if (cssProps.padding) {
        const paddingMatch = cssProps.padding.match(/(\d+)/);
        if (paddingMatch) padding = parseInt(paddingMatch[1]);
    }

    // Parse border radius
    let borderRadius = 0;
    if (cssProps.borderRadius) {
        const radiusMatch = cssProps.borderRadius.match(/(\d+)/);
        if (radiusMatch) borderRadius = parseInt(radiusMatch[1]);
    }

    // Custom CSS effects - Map to the new customCSS field
    const customCSS: any = {};
    if (cssProps.textShadow) customCSS.textShadow = cssProps.textShadow;
    if (cssProps.transform) customCSS.transform = cssProps.transform;
    if (cssProps.letterSpacing) customCSS.letterSpacing = cssProps.letterSpacing;
    if (cssProps.lineHeight) customCSS.lineHeight = cssProps.lineHeight;
    if (cssProps.textTransform) customCSS.textTransform = cssProps.textTransform;
    if (cssProps.filter) customCSS.filter = cssProps.filter;
    // Also include font family in customCSS if it's complex, though we have a main field for it
    if (cssProps.fontFamily) customCSS.fontFamily = cssProps.fontFamily;

    return {
        text,
        fontSize,
        fontColor,
        fontFamily: cssProps.fontFamily?.replace(/['"]/g, '') || 'Arial',
        isBold,
        isItalic,
        backgroundColor,
        padding,
        borderRadius,
        customCSS: Object.keys(customCSS).length > 0 ? customCSS : undefined,
    };
}

/**
 * Creates an Asset from rendered code
 */
export function createAssetFromCode(
    code: CodeAsset,
    src: string,
    type: MediaType
): Asset {
    return {
        id: code.id,
        type,
        src,
        name: code.name,
        thumbnail: code.thumbnail,
        codeSource: {
            html: code.html,
            css: code.css,
            js: code.js,
            width: code.width,
            height: code.height,
            duration: code.duration,
            fps: code.fps,
            isCodeAsset: true,
        },
    };
}
