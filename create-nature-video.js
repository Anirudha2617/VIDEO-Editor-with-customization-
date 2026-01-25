// 1-Minute Nature Video Script
// Uses external nature images with transitions, effects, and text overlays

(async () => {
    display("🎬 Creating 1-minute nature video...");
    display("─────────────────────────────────");
    
    // Nature scenes - using reliable external URLs
    const natureScenes = [
        {
            url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop",
            name: "Mountain Landscape",
            caption: "Majestic Peaks",
            duration: 10
        },
        {
            url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop",
            name: "Forest Path",
            caption: "Into The Wild",
            duration: 10
        },
        {
            url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&h=1080&fit=crop",
            name: "Lake Reflection",
            caption: "Serene Waters",
            duration: 10
        },
        {
            url: "https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=1920&h=1080&fit=crop",
            name: "Waterfall",
            caption: "Nature's Flow",
            duration: 10
        },
        {
            url: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1920&h=1080&fit=crop",
            name: "Sunset Sky",
            caption: "Golden Hour",
            duration: 10
        },
        {
            url: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1920&h=1080&fit=crop",
            name: "Flower Field",
            caption: "Blooming Beauty",
            duration: 10
        }
    ];
    
    let currentTime = 0;
    const clipIds = [];
    
    // Load all images and create clips
    for (let i = 0; i < natureScenes.length; i++) {
        const scene = natureScenes[i];
        
        display(`📸 Scene ${i + 1}/6: ${scene.name}...`);
        
        try {
            // Download image
            const asset = await addAssetFromUrl(scene.url, scene.name);
            display(`  ✓ Downloaded: ${asset.id}`);
            
            // Add to timeline
            const clip = addClip(asset.id, {
                track: 1,
                start: currentTime,
                duration: scene.duration,
                scale: 1,
                opacity: 1
            });
            clipIds.push({id: clip.id, name: scene.name});
            display(`  ✓ Added to timeline at ${currentTime}s`);
            
            // Add entrance transition
            const transitions = ['fade', 'zoom-in', 'slide-left', 'slide-right', 'slide-up', 'slide-down'];
            const randomTransition = transitions[i % transitions.length];
            addTransition(clip.id, 'in', randomTransition, 1.5);
            display(`  ✓ Transition: ${randomTransition}`);
            
            // Add exit transition
            addTransition(clip.id, 'out', 'fade', 1);
            
            // Add effect based on scene
            let effect = "brightness(110%) contrast(105%)"; // Default
            if (scene.name.includes("Sunset")) {
                effect = "sepia(30%) brightness(115%)";
            } else if (scene.name.includes("Forest")) {
                effect = "saturate(130%) contrast(110%)";
            } else if (scene.name.includes("Lake")) {
                effect = "contrast(115%) brightness(105%)";
            }
            
            addEffect(clip.id, {
                name: "Nature Enhancement",
                value: effect
            });
            display(`  ✓ Effect applied`);
            
            currentTime += scene.duration;
            
        } catch (error) {
            display(`  ❌ Error loading ${scene.name}: ${error.message}`);
        }
    }
    
    display("─────────────────────────────────");
    display(`✅ Nature video complete!`);
    display(`📊 Stats:`);
    display(`   - Duration: ${currentTime} seconds`);
    display(`   - Clips: ${clipIds.length}`);
    display(`   - Transitions: ${clipIds.length * 2} (in + out)`);
    display(`   - Effects: ${clipIds.length}`);
    display("");
    display("🎥 Preview your video now!");
    
})();
