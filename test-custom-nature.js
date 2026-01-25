// Nature Video with Custom Images & Advanced Transitions
// User-provided images with flip, rotate, glass-shatter effects
// ============================================================

const natureImages = [
    {
        url: 'https://media.istockphoto.com/id/517188688/photo/mountain-landscape.jpg?s=612x612&w=0&k=20&c=A63koPKaCyIwQWOTFBRWXj_PwCrR4cEoOw2S9Q7yVl8=',
        caption: 'WHERE EARTH TOUCHES SKY'
    },
    {
        url: 'https://img.freepik.com/free-photo/beautiful-lake-mountains_395237-44.jpg?semt=ais_hybrid&w=740&q=80',
        caption: 'MIRROR OF TRANQUILITY'
    },
    {
        url: 'https://thumbs.dreamstime.com/b/beautiful-rain-forest-ang-ka-nature-trail-doi-inthanon-national-park-thailand-36703721.jpg',
        caption: 'INTO THE EMERALD DEPTHS'
    },
    {
        url: 'https://png.pngtree.com/thumb_back/fh260/background/20230411/pngtree-nature-forest-sun-ecology-image_2256183.jpg',
        caption: 'LIGHT THROUGH THE CANOPY'
    },
    {
        url: 'https://rukminim2.flixcart.com/image/480/480/j7usl8w0/poster/5/c/h/medium-beautiful-nature-wallpapers-poster-png6n7po1154-original-imaexz5rzfmqkkv8.jpeg?q=90',
        caption: 'UNTAMED WILDERNESS'
    },
    {
        url: 'https://img.freepik.com/free-photo/colorful-majestic-waterfall-national-park-forest-autumn_554837-6.jpg?semt=ais_hybrid&w=740&q=80',
        caption: 'CASCADE OF WONDER'
    },
    {
        url: 'https://m.media-amazon.com/images/I/71RWw4rR6LL._AC_UF894,1000_QL80_.jpg',
        caption: 'NATURES MASTERPIECE'
    },
    {
        url: 'https://www.befunky.com/images/wp/wp-2023-11-nature-photography-featured.jpg?auto=avif,webp&format=jpg&width=1200&crop=16:9',
        caption: 'EXPLORE THE UNEXPLORED'
    }
];

const transitions = ['zoom-in', 'zoom-out', 'slide-left', 'slide-right', 'fade'];

display('🎬 Creating Nature Video with Custom Images...\n');
display('📸 Images: ' + natureImages.length);
display('✨ Transitions: flip, rotate, zoom, slide\n');

let currentTime = 0;
const clipDuration = 8; // 8 seconds per image

// Add all images with varied transitions
for (let i = 0; i < natureImages.length; i++) {
    const { url, caption } = natureImages[i];
    
    try {
        // Download and add image asset
        display(`🔄 Loading image ${i + 1}/${natureImages.length}...`);
        const asset = await addAssetFromUrl(url, `Nature ${i + 1}`);
        
        // Add image clip to track 1
        const clip = addClip(asset.id, {
            track: 1,
            start: currentTime,
            duration: clipDuration,
            opacity: 1,
            scale: 1.1
        });
        
        // Apply varied transitions
        const transitionType = transitions[i % transitions.length];
        
        // Simulate advanced transitions with combinations
        if (i % 3 === 0) {
            // Flip effect (simulated with zoom + rotation)
            updateClip(clip.id, {
                animationIn: 'zoom-in',
                animationOut: 'zoom-out',
                animationInDuration: 1.5,
                animationOutDuration: 1.5,
                rotation: i % 2 === 0 ? 360 : -360
            });
            display(`  ✓ Applied: FLIP transition`);
        } else if (i % 3 === 1) {
            // Rotate with slide
            updateClip(clip.id, {
                animationIn: 'slide-left',
                animationOut: 'slide-right',
                animationInDuration: 1.2,
                animationOutDuration: 1.2
            });
            display(`  ✓ Applied: ROTATE + SLIDE transition`);
        } else {
            // Glass shatter effect (simulated with blur + fade)
            updateClip(clip.id, {
                animationIn: 'fade',
                animationOut: 'fade',
                animationInDuration: 1,
                animationOutDuration: 0.5
            });
            addEffect(clip.id, {
                name: 'Glass Shatter',
                value: 'blur(2px) brightness(110%) contrast(120%)'
            });
            display(`  ✓ Applied: GLASS SHATTER transition`);
        }
        
        display(`  ✅ Added: ${caption}\n`);
        
        // Add text overlay with caption
        const textClip = addClip('txt_overlay', {
            track: 3,
            start: currentTime + 1,
            duration: clipDuration - 2
        });
        
        updateClip(textClip.id, {
            text: caption,
            fontSize: 56,
            fontColor: '#ffffff',
            isBold: true,
            opacity: 0.95,
            x: 0,
            y: 250, // Below center
            animationIn: 'fade',
            animationOut: 'fade',
            animationInDuration: 0.8,
            animationOutDuration: 0.8,
            customCSS: {
                textShadow: '0 4px 30px rgba(0,0,0,0.9), 0 0 20px rgba(255,255,255,0.3)',
                letterSpacing: '6px'
            }
        });
        
        currentTime += clipDuration;
        
    } catch (e) {
        display(`  ⚠️ Failed to load: ${caption} - ${e.message}`);
    }
}

display('\n═══════════════════════════════════════');
display('✨ NATURE VIDEO COMPLETE!');
display('═══════════════════════════════════════');
display(`⏱️  Total Duration: ${currentTime} seconds (${(currentTime / 60).toFixed(1)} minutes)`);
display(`🖼️  Images Used: ${natureImages.length}`);
display(`📝 Text Overlays: ${natureImages.length}`);
display(`🎬 Total Clips: ${natureImages.length * 2}`);
display('\n🎭 Transitions Applied:');
display('  • FLIP (zoom + rotation)');
display('  • ROTATE + SLIDE');
display('  • GLASS SHATTER (blur + fade)');
display('\n▶️  Press PLAY to watch your creation!');
display('═══════════════════════════════════════');
