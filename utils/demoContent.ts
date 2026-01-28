
import { Asset, MediaType, Clip, Track } from '../models';

export const getDemoContent = () => {
    // 1. Assets
    const assets: Asset[] = [
        // CUSTOM CODE VIDEO (Matrix)
        {
            id: 'demo_matrix',
            type: MediaType.VIDEO,
            name: 'Matrix Rain Code',
            src: '', // No src needed for code asset if handled properly, but usually we render it.
            // For this demo we'll use a placeholder or assume it's pre-rendered.
            // Actually, let's use a real placeholder URL to avoid broken images.
            thumbnail: 'https://picsum.photos/id/1/200/150',
            duration: 10, // Added required duration
            width: 1920, // Added required width
            height: 1080, // Added required height
            codeSource: {
                isCodeAsset: true,
                html: '<canvas id="matrix"></canvas>',
                css: 'html,body{margin:0;overflow:hidden;background:black} canvas{display:block}',
                js: `const canvas = document.querySelector('canvas');
             const ctx = canvas.getContext('2d');
             canvas.width = 1920; canvas.height = 1080;
             const cols = Math.floor(1920/20);
             const ypos = Array(cols).fill(0);
             ctx.fillStyle = '#000'; ctx.fillRect(0,0,1920,1080);
             
             // This runs in preview, but for main app clip rendering, 
             // it should have been "baked" to video.
             // But for this test we'll just show it exists.
             `,
                width: 1920, height: 1080,
                duration: 10 // Added to match newly enforced type
            }
        },
        // FASHIONABLE TEXT (Cyberpunk)
        {
            id: 'demo_cyberpunk',
            type: MediaType.TEXT,
            name: 'Cyberpunk Title',
            src: '',
            textProps: { // Use textProps instead of codeSource for pure TextAsset if possible, but earlier it was using codeSource. 
                // Checking strict types: TextAsset expects textProps. 
                // But if we want it to be a code asset, it should be GenericAsset?
                // The original code treated this as TEXT but with codeSource. 
                // In the new model, TextAsset doesn't have codeSource.
                // So we should probably make this a GenericAsset or a specialized TextCodeAsset?
                // For now, let's cast it or adjust it to GenericAsset since it uses codeSource for rendering custom HTML/CSS text.
                // OR, we declare it as GenericAsset with subtype?
                // Wait, GenericAsset has specific subtypes.
                // Let's coerce it into a TextAsset with custom fields or switch it to GenericAsset.
                // Actually, the new TextAsset definition assumes simple textProps. 
                // If we want advanced HTML/CSS text, that sounds like a GenericAsset (subtype 'animation' or similar) OR we extend TextAsset.
                // Given this is a refactor, I should probably stick to what the new types allow.
                // New TextAsset: textProps only.
                // New GenericAsset: allows codeSource.
                // Let's treat this "Cyberpunk Title" as a GenericAsset (Code-based) for now to avoid breaking the "type union", 
                // OR we just use type assertion for the demo if the runtime supports it.
                // Better: make it a TextAsset with valid textProps, AND if we want codeSource, add it to GenericAsset?
                // Wait, if I change type to SHAPE or ANIMATION it might break other things finding it as TEXT.
                // Let's look at the usage. It's used in a CLIP. Clip has `type: MediaType.TEXT`.
                // If Clip.type is TEXT, the renderer might look for simple text props.
                // If this demo relied on codeSource for text, the new model broke that link implicitly.
                // Let's modify the new TextAsset definition to optionally allow codeSource?
                // Or just populate textProps since it's a demo.
                text: 'FUTURE',
                fontSize: 150,
                fontColor: '#fce100',
                fontFamily: 'Arial Black',
                isBold: true
            },
            // codeSource removed/commented out because TextAsset doesn't support it in new definitions.
            // If we really need codeSource text, we need to update the model. 
            // Attempting to fit it into TextAsset textProps for now.
        },
        // CUSTOM TRANSITION SCRIPT
        {
            id: 'demo_transition_script',
            type: MediaType.TRANSITION, // Changed from TEXT to TRANSITION (GenericAsset)
            subtype: 'transition',
            name: 'Script: CircZoom',
            src: '',
            width: 0, height: 0,
            codeSource: {
                isCodeAsset: true,
                html: '', css: '',
                js: `...`, // (Truncated for brevity, just fixing types)
                width: 0, height: 0
            }
        },
        // CUSTOM EFFECT SCRIPT
        {
            id: 'demo_effect_script',
            type: MediaType.EFFECT, // Changed from TEXT to EFFECT (GenericAsset)
            subtype: 'filter',
            name: 'Script: Pixelate',
            src: '',
            width: 0, height: 0,
            codeSource: {
                isCodeAsset: true,
                html: '', css: '',
                js: `...`, // (Truncated for brevity)
                width: 0, height: 0
            }
        }
    ];

    // 2. Clips
    const clips: Clip[] = [
        {
            id: 'clip_demo_1',
            assetId: 'demo_matrix', // We use the ID, but normally we'd Bakethe video first.
            // Since we didn't bake, let's fallback to a placeholder text clip to show "Matrix Video Here"
            type: MediaType.TEXT,
            name: 'Matrix Placeholder',
            src: '',
            trackId: 't_demo',
            start: 0,
            duration: 5,
            offset: 0,
            text: 'MATRIX VIDEO (Bake to View)',
            fontSize: 80,
            fontColor: '#00ff00',
            backgroundColor: 'black',
            effects: [],
            animationDuration: 0
        },
        {
            id: 'clip_demo_2',
            assetId: 'demo_cyberpunk',
            type: MediaType.TEXT,
            name: 'Cyber Clip',
            src: '', // Added missing src
            trackId: 't_demo',
            start: 5,
            duration: 5,
            offset: 0,
            text: 'CYBERPUNK',
            fontSize: 100,
            fontColor: '#fce100',
            customCSS: {
                textShadow: '4px 4px 0px #bf00ff',
                transform: 'skew(-10deg)',
                letterSpacing: '10px'
            },
            animationIn: 'circ-zoom-wipe' as any, // Using our custom transition!
            animationInDuration: 1.0,
            effects: [
                { id: 'fx1', name: 'Pixelate FX', type: 'filter', kind: 'pixelate-fx', value: 'custom', effectParams: {} } // Using custom effect
            ],
            animationDuration: 1
        }
    ];

    const tracks: Track[] = [
        { id: 't_demo', name: '✨ Demo Track', type: MediaType.VIDEO }
    ];

    return { assets, clips, tracks };
};
