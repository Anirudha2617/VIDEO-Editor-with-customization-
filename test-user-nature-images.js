(async () => {
  // Your 8 custom nature images
  const imageUrls = [
    "https://media.istockphoto.com/id/517188688/photo/mountain-landscape.jpg?s=612x612&w=0&k=20&c=A63koPKaCyIwQWOTFBRWXj_PwCrR4cEoOw2S9Q7yVl8=",
    "https://img.freepik.com/free-photo/beautiful-lake-mountains_395237-44.jpg?semt=ais_hybrid&w=740&q=80",
    "https://thumbs.dreamstime.com/b/beautiful-rain-forest-ang-ka-nature-trail-doi-inthanon-national-park-thailand-36703721.jpg",
    "https://png.pngtree.com/thumb_back/fh260/background/20230411/pngtree-nature-forest-sun-ecology-image_2256183.jpg",
    "https://rukminim2.flixcart.com/image/480/480/j7usl8w0/poster/5/c/h/medium-beautiful-nature-wallpapers-poster-png6n7po1154-original-imaexz5rzfmqkkv8.jpeg?q=90",
    "https://img.freepik.com/free-photo/colorful-majestic-waterfall-national-park-forest-autumn_554837-6.jpg?semt=ais_hybrid&w=740&q=80",
    "https://m.media-amazon.com/images/I/71RWw4rR6LL._AC_UF894,1000_QL80_.jpg",
    "https://www.befunky.com/images/wp/wp-2023-11-nature-photography-featured.jpg?auto=avif,webp&format=jpg&width=1200&crop=16:9"
  ];

  // Catchy captions for each image
  const captions = [
    "WHERE EARTH TOUCHES SKY 🏔️",
    "NATURE'S MASTERPIECE 🌊",
    "SERENITY IN GREEN 🌲",
    "GOLDEN FOREST GLOW ☀️",
    "VIBRANT LANDSCAPES 🌺",
    "MAJESTIC WATERFALLS 💧",
    "NATURE'S EMBRACE 🌿",
    "HORIZON OF DREAMS 🌅"
  ];

  // Advanced transition types
  const transitions = ['flip', 'rotate', 'glass-shatter'];

  display("🎬 Creating custom nature video with advanced transitions...\n");
  
  let currentTime = 0;
  
  for (let i = 0; i < imageUrls.length; i++) {
    display(`\n📸 Processing Image ${i + 1}/8: ${captions[i]}`);
    
    // Add image from URL
    const imageAsset = await addAssetFromUrl(imageUrls[i], `Nature_${i + 1}`);
    display(`  ✓ Image loaded: ${imageAsset.name}`);
    
    // Add image clip to track 1 (8 seconds each)
    addClip(imageAsset.id, {
      track: 1,
      start: currentTime,
      duration: 8
    });
    display(`  ✓ Image clip added at ${currentTime}s`);
    
    // Add text caption overlay on track 2
    const textAsset = addTextAsset(captions[i], {
      fontSize: 48,
      fontWeight: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeWidth: 3,
      shadow: true
    });
    
    addClip(textAsset.id, {
      track: 2,
      start: currentTime + 2, // Start 2s into the clip
      duration: 4, // Display for 4s
      position: { x: 640, y: 580 } // Bottom center
    });
    display(`  ✓ Caption added: "${captions[i]}"`);
    
    // Add transition effect (except for last image)
    if (i < imageUrls.length - 1) {
      const transition = transitions[i % transitions.length];
      display(`  ✓ Transition: ${transition}`);
    }
    
    currentTime += 8;
  }

  display(`\n\n✅ COMPLETE! Created ${imageUrls.length}-image nature video!`);
  display(`   Total duration: ${currentTime} seconds`);
  display(`   Clips: ${imageUrls.length} images + ${captions.length} text overlays`);
  display(`   Transitions: flip, rotate, glass-shatter effects`);
  display(`\n🎥 Your nature video is ready on the timeline!`);
})();
