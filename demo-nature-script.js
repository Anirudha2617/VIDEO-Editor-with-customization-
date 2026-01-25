// 5-Minute Nature Slideshow - Web Images Only
// Using free stock photos from Unsplash
// ==========================================

// Extended collection of nature images
const natureImages = [
    { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1280&h=720&fit=crop', name: 'Mountain Peak' },
    { url: 'https://images.unsplash.com/photo-1511497584788-876760111969?w=1280&h=720&fit=crop', name: 'Forest Path' },
    { url: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1280&h=720&fit=crop', name: 'Ocean Waves' },
    { url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1280&h=720&fit=crop', name: 'Golden Sunset' },
    { url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1280&h=720&fit=crop', name: 'Misty Valley' },
    { url: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=1280&h=720&fit=crop', name: 'Alpine Meadow' },
    { url: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1280&h=720&fit=crop', name: 'Lake Reflection' },
    { url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1280&h=720&fit=crop', name: 'Desert Landscape' },
    { url: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=1280&h=720&fit=crop', name: 'Cascading Falls' },
    { url: 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=1280&h=720&fit=crop', name: 'Snow Mountains' },
    { url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1280&h=720&fit=crop', name: 'Dense Forest' },
    { url: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=1280&h=720&fit=crop', name: 'Lakeside Dawn' },
    { url: 'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=1280&h=720&fit=crop', name: 'Cliff Coastline' },
    { url: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=1280&h=720&fit=crop', name: 'Canyon Vista' },
    { url: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=1280&h=720&fit=crop', name: 'Starry Sky' },
    { url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1280&h=720&fit=crop', name: 'Wildflowers' },
    { url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1280&h=720&fit=crop', name: 'Peak Summit' },
    { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1280&h=720&fit=crop', name: 'Rocky Ridge' },
    { url: 'https://images.unsplash.com/photo-1476231790875-69f0e9EDC3d6?w=1280&h=720&fit=crop', name: 'Beach Sunset' },
    { url: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1280&h=720&fit=crop', name: 'Aurora Sky' },
    { url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1280&h=720&fit=crop', name: 'Rolling Hills' },
    { url: 'https://images.unsplash.com/photo-1458668383970-8ddd3927deed?w=1280&h=720&fit=crop', name: 'River Valley' },
    { url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1280&h=720&fit=crop', name: 'Galaxy Night' },
    { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1280&h=720&fit=crop', name: 'Ice Peaks' },
    { url: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1280&h=720&fit=crop', name: 'Tropical Beach' },
    { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1280&h=720&fit=crop', name: 'Mountain Lake' },
    { url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1280&h=720&fit=crop', name: 'Desert Dunes' },
    { url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1280&h=720&fit=crop', name: 'Pine Forest' },
    { url: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1280&h=720&fit=crop', name: 'Sunrise Peak' },
    { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1280&h=720&fit=crop', name: 'Alpine Vista' }
];

const quotes = [
    "THE BEAUTY OF NATURE",
    "FIND PEACE IN THE WILD",
    "BREATHE IN THE MOMENT",
    "NATURE'S CANVAS",
    "EXPLORE THE UNKNOWN",
    "SERENITY AWAITS",
    "EMBRACE THE JOURNEY",
    "WILD AND FREE",
    "NATURE HEALS",
    "ADVENTURE CALLS",
    "INTO THE WILDERNESS",
    "MOUNTAINS ARE CALLING",
    "OCEAN OF TRANQUILITY",
    "FOREST WHISPERS",
    "SUNSET DREAMS"
];

let currentTime = 0;
const clipDuration = 10; // 10 seconds per image

display('🎬 Creating 5-Minute Nature Slideshow...\n');

// Add all nature images
for (let i = 0; i < natureImages.length; i++) {
    const { url, name } = natureImages[i];
    
    try {
        const asset = await addAssetFromUrl(url, name);
        
        const clip = addClip(asset.id, {
            track: 1,
            start: currentTime,
            duration: clipDuration,
            opacity: 1,
            scale: 1.05
        });
        
        updateClip(clip.id, {
            animationIn: 'fade',
            animationOut: 'fade',
            animationInDuration: 1.5,
            animationOutDuration: 1.5
        });
        
        if (i % 3 === 0) {
            addEffect(clip.id, {
                name: 'Soft Glow',
                value: 'blur(1px) brightness(105%) saturate(110%)'
            });
        }
        
        display(`✓ [${i + 1}/${natureImages.length}] ${name}`);
    } catch (e) {
        display(`⚠ Skipped: ${name}`);
    }
    
    currentTime += clipDuration;
}

// Add text overlays
display('\n📝 Adding text overlays...');
let textTime = 5;

for (let i = 0; i < quotes.length; i++) {
    const clip = addClip('txt_overlay', {
        track: 3,
        start: textTime,
        duration: 8
    });
    
    updateClip(clip.id, {
        text: quotes[i],
        fontSize: 72,
        fontColor: '#ffffff',
        isBold: true,
        animationIn: 'fade',
        animationOut: 'fade',
        animationInDuration: 1,
        animationOutDuration: 1,
        customCSS: {
            textShadow: '0 4px 20px rgba(0,0,0,0.8)',
            letterSpacing: '8px'
        }
    });
    
    display(`✓ Text: "${quotes[i]}"`);
    textTime += 20;
}

display('\n═══════════════════════════════════');
display('✨ SLIDESHOW COMPLETE!');
display('═══════════════════════════════════');
display(`⏱️  Duration: ${(currentTime / 60).toFixed(1)} minutes`);
display(`🖼️  Images: ${natureImages.length}`);
display(`📝 Texts: ${quotes.length}`);
display(`🎬 Total Clips: ${natureImages.length + quotes.length}`);
display('\n▶️  Click PLAY to watch!');
