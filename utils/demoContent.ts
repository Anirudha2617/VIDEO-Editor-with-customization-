
import { Asset, MediaType, Clip, Track } from '../types';

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
            subtype: 'animation',
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
                width: 1920, height: 1080
            }
        },
        // FASHIONABLE TEXT (Cyberpunk)
        {
            id: 'demo_cyberpunk',
            type: MediaType.TEXT,
            name: 'Cyberpunk Title',
            src: '',
            subtype: undefined,
            codeSource: {
                isCodeAsset: true,
                html: '<h1 class="cyber">FUTURE</h1>',
                css: `.cyber {
          font-family: 'Arial Black';
          font-size: 150px;
          color: #fce100;
          text-shadow: 4px 4px 0px #bf00ff;
          transform: skew(-10deg);
          letter-spacing: 10px;
          background: linear-gradient(180deg, #fce100 0%, #ff0 50%, #fce100 100%);
          -webkit-background-clip: text;
        }`,
                js: '',
                width: 1920, height: 1080
            }
        },
        // CUSTOM TRANSITION SCRIPT
        {
            id: 'demo_transition_script',
            type: MediaType.TEXT,
            name: 'Script: CircZoom',
            src: '',
            subtype: 'transition',
            codeSource: {
                isCodeAsset: true,
                html: '', css: '',
                js: `
            return {
                id: 'circ-zoom-wipe',
                name: 'Circular Zoom',
                variables: [],
                apply: (ctxParams) => {
                    const { ctx, width, height, progress, isExit } = ctxParams;
                    const p = isExit ? progress : (1 - progress);
                    const maxR = Math.sqrt(width*width + height*height)/2;
                    const r = maxR * p;
                    
                    ctx.beginPath();
                    ctx.arc(width/2, height/2, r, 0, Math.PI*2);
                    ctx.fillStyle = 'black';
                    ctx.fill();
                    
                    return { overlayColor: { style: 'black', opacity: 0 } }; // Actual draw done above
                }
                }
            };
            `,
                width: 0, height: 0
            }
        },
        // CUSTOM EFFECT SCRIPT
        {
            id: 'demo_effect_script',
            type: MediaType.TEXT,
            name: 'Script: Pixelate',
            src: '',
            subtype: 'filter',
            codeSource: {
                isCodeAsset: true,
                html: '', css: '',
                js: `
             return {
                 id: 'pixelate-fx',
                 name: 'Pixelate FX',
                 variables: [],
                 apply: (ctxParams) => {
                     // We return a customDraw function
                     return {
                         customDraw: (ctx, width, height) => {
                            // Simple pixelate simulation (mosaic)
                            // Note: real pixelation needs reading pixel data which is expensive
                            // We can fake it by drawing a grid or reducing quality?
                            // Let's just draw a red tint to prove it works
                            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
                            ctx.fillRect(-width/2, -height/2, width, height);
                         }
                     };
                 }
             };
             `,
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
