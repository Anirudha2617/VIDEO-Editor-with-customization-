// Test Script for AI Timeline Integration
// This tests all new features: text assets, transitions, and effects

(async () => {
    display("🎬 Starting 3-second video test...");
    
    // 1. Generate AI image
    display("  📸 Generating AI image...");
    const img = await ai.generateImage("beautiful sunset over ocean");
    display(`  ✓ Image generated: ${img.id}`);
    
    // 2. Add image clip to timeline
    const imgClip = addClip(img.id, {
        track: 1,
        start: 0,
        duration: 3,
        opacity: 1
    });
    display(`  ✓ Image clip added: ${imgClip.id}`);
    
    // 3. Create text overlay
    display("  📝 Creating text overlay...");
    const txt = addTextAsset("Beautiful Sunset", {
        fontSize: 64,
        fontColor: "#ffff00",
        isBold: true,
        backgroundColor: "#000000aa",
        borderRadius: 10,
        padding: 20
    });
    display(`  ✓ Text asset created: ${txt.id}`);
    
    // 4. Add text clip to timeline
    const txtClip = addClip(txt.id, {
        track: 2,
        start: 0.5,
        duration: 2,
        opacity: 1
    });
    display(`  ✓ Text clip added: ${txtClip.id}`);
    
    // 5. Add entrance transition
    display("  ✨ Adding transitions...");
    addTransition(imgClip.id, 'in', 'fade', 1);
    display(`  ✓ Fade-in transition added`);
    
    // 6. Add exit transition
    addTransition(imgClip.id, 'out', 'zoom-out', 0.8);
    display(`  ✓ Zoom-out exit transition added`);
    
    // 7. Add text entrance  
    addTransition(txtClip.id, 'in', 'slide-up', 0.5);
    display(`  ✓ Text slide-up transition added`);
    
    // 8. Add blur effect to image
    display("  🎨 Adding effects...");
    addEffect(imgClip.id, {
        name: "Subtle Blur",
        value: "blur(2px) brightness(110%)"
    });
    display(`  ✓ Blur effect added`);
    
    display("\n✅ SUCCESS! 3-second video created with:");
    display("   - AI-generated sunset image");
    display("   - Yellow text overlay with background");
    display("   - Fade-in and zoom-out transitions on image");
    display("   - Slide-up transition on text");
    display("   - Blur + brightness effect");
    display("\n🎥 Check the timeline and preview!");
})();
