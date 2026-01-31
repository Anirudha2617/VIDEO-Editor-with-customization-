
import requests
from django.http import StreamingHttpResponse, HttpResponse, HttpResponseForbidden, HttpResponseBadRequest
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from urllib.parse import urlparse

# 1. Allowlist ONLY the domains you trust
ALLOWED_HOSTS_SET = {
    "images.unsplash.com",
    "cdn.pixabay.com",
    "interactive-examples.mdn.mozilla.net",
    "upload.wikimedia.org",
    "api.allorigins.win", # In case we chain proxies (optional)
    # Add your own CDN/hosting domains here
}

# 2. Allow only media content-types you want to support
ALLOWED_CONTENT_TYPES = [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/ogg",
    "video/mp4",
    "image/jpeg",
    "image/png",
    "image/webp",
]

MAX_BYTES = 50 * 1024 * 1024  # 50MB
TIMEOUT_SEC = 20

def parse_and_validate(raw_url):
    try:
        u = urlparse(raw_url)
    except Exception:
        raise ValueError("Invalid URL")

    if u.scheme not in ["http", "https"]:
        raise ValueError("Only http/https URLs are allowed")

    if u.hostname not in ALLOWED_HOSTS_SET:
        raise ValueError(f"Host not allowed: {u.hostname}")

    return raw_url

@csrf_exempt
def media_proxy(request):
    raw_url = request.GET.get('url', '')
    if not raw_url:
        return HttpResponseBadRequest("Missing url param")

    try:
        target_url = parse_and_validate(raw_url)
    except ValueError as e:
        return HttpResponseForbidden(str(e))

    # Forward Range header (critical for audio/video playback/decoding)
    range_header = request.headers.get('range', None)
    headers = {
        "User-Agent": "LuminaMediaProxy/1.0",
        "Accept": "*/*",
    }
    if range_header:
        headers["Range"] = range_header

    try:
        # Stream=True is critical
        upstream = requests.get(target_url, headers=headers, stream=True, timeout=TIMEOUT_SEC)
        
        content_type = upstream.headers.get('Content-Type', '').split(';')[0].strip()

        # If upstream returns HTML, it's likely an error page
        if not content_type or "text/html" in content_type:
             return HttpResponse(f"Upstream returned non-media content-type: {content_type}", status=502)

        # Content-Type Check
        if content_type not in ALLOWED_CONTENT_TYPES:
             return HttpResponse(f"Unsupported content-type: {content_type}", status=415)
        
        # Size Check
        cl = upstream.headers.get('Content-Length')
        if cl:
            try:
                if int(cl) > MAX_BYTES:
                     return HttpResponse("File too large", status=413)
            except ValueError:
                pass

        # Prepare Response
        response = StreamingHttpResponse(
            upstream.iter_content(chunk_size=8192),
            status=upstream.status_code,
            content_type=content_type
        )

        # Passthrough Headers
        passthrough_headers = [
            "Content-Length",
            "Content-Range",
            "Accept-Ranges",
            "ETag",
            "Last-Modified",
            "Cache-Control",
        ]

        for h in passthrough_headers:
            val = upstream.headers.get(h) or upstream.headers.get(h.lower()) # requests headers are case-insensitive dict but let's be safe
            if val:
                response[h] = val

        # Ensure accept-ranges
        if not response.has_header('Accept-Ranges'):
            response['Accept-Ranges'] = 'bytes'

        # CORS Headers handled by django-cors-headers usually, but we can force them if needed
        # response["Access-Control-Allow-Origin"] = "*" 
        
        return response

    except requests.RequestException as e:
        return HttpResponse(f"Proxy failed: {str(e)}", status=502)
