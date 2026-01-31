
import express from "express";
import cors from "cors";
import { mediaProxy } from "./mediaProxy";

const app = express();
const PORT = 3001; // Using 3001 to avoid conflict with Django (8000)

// Enable CORS for all routes (Dev convenience)
app.use(cors());

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "media-proxy" });
});

// Media Proxy Route
app.get("/api/media/proxy", mediaProxy);

app.listen(PORT, () => {
    console.log(`✅ Media Proxy running at http://localhost:${PORT}`);
    console.log(`📝 Test URL: http://localhost:${PORT}/api/media/proxy?url=https%3A%2F%2Fcdn.pixabay.com%2F...`);
});
