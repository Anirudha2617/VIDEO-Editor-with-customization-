
# Lumina Node Media Proxy

A robust Node/Express backend to proxy media requests, solving "silent audio" issues by strictly forwarding streaming headers like `Range` and `Accept-Ranges`.

## Installation

1. Navigate to this directory:
   ```bash
   cd node_backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Server

1. Start the server:
   ```bash
   npm start
   ```

The server runs on **port 3001** (to avoid conflicts with Django or other services on 8000/3000).

- **Proxy URL**: `http://localhost:3001/api/media/proxy?url=<ENCODED_URL>`
- **Health Check**: `http://localhost:3001/health`

## Usage in Script

```javascript
const originalUrl = "https://cdn.pixabay.com/download/audio/2022/03/09/audio_5f2c1f6b73.mp3";
const proxyUrl = "http://localhost:3001/api/media/proxy?url=" + encodeURIComponent(originalUrl);

const asset = await addAssetFromUrl(proxyUrl, "Proxy Audio");
```

## Security
- **Domain Allowlist**: configured in `src/mediaProxy.ts`.
- **Content-Type**: strictly limits to audio/video/image types.
