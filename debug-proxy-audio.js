
(async () => {
    const originalUrl = "https://cdn.pixabay.com/download/audio/2022/03/09/audio_5f2c1f6b73.mp3";
    const proxyUrl = "https://api.allorigins.win/raw?url=" + encodeURIComponent(originalUrl);

    display("🔍 Debugging Proxy Audio...");

    try {
        const response = await fetch(proxyUrl);
        display(`📡 Fetch Status: ${response.status}`);
        
        const blob = await response.blob();
        display(`📦 Blob Size: ${blob.size} bytes`);
        display(`🏷️ Blob Type: ${blob.type}`);

        if (blob.size < 1000) {
            display("⚠️ WARNING: Blob is too small! Likely an error page, not audio.");
            const text = await blob.text();
            display("📄 Content: " + text.substring(0, 100));
            return;
        }

        // Test Audio Element Metadata directly
        const audio = document.createElement('audio');
        const url = URL.createObjectURL(blob);
        audio.src = url;

        audio.onloadedmetadata = () => {
            display(`🎵 Metadata Loaded! Duration: ${audio.duration}s`);
            
            // Try playing a snippet
            audio.play().then(() => {
                 display("🔊 Playback Started! (You should hear sounds)");
                 setTimeout(() => {
                     audio.pause();
                     display("⏸️ Playback Paused after 2s check.");
                 }, 2000);
            }).catch(e => {
                 display("❌ Playback Failed: " + e.message);
            });
        };

        audio.onerror = (e) => {
             display("❌ Audio Error: " + (audio.error ? audio.error.message : "Unknown error"));
        };

    } catch (e) {
        display("❌ Fetch Failed: " + e.message);
    }
})();
