import { Transition, TransitionContext, TransitionResult } from '../types';

export const breakingGlassTransition: Transition = {
    id: 'breaking-glass',
    name: 'Breaking Glass',
    description: 'Shatters the screen like breaking glass.',
    variables: [
        {
            name: 'Shards',
            key: 'shards',
            type: 'number',
            min: 10,
            max: 100,
            step: 5,
            defaultValue: 30
        },
        {
            name: 'Impact X',
            key: 'impactX',
            type: 'number',
            min: 0,
            max: 1,
            step: 0.1,
            defaultValue: 0.5
        },
        {
            name: 'Impact Y',
            key: 'impactY',
            type: 'number',
            min: 0,
            max: 1,
            step: 0.1,
            defaultValue: 0.5
        },
        {
            name: 'Screen 1',
            key: 'screen1',
            type: 'source',
            defaultValue: ''
        },
        {
            name: 'Screen 2',
            key: 'screen2',
            type: 'source',
            defaultValue: ''
        }
    ],
    apply: (context: TransitionContext): TransitionResult => {
        const { progress, params, sources } = context;
        const shardCount = params.shards || 30;
        const impactX = params.impactX || 0.5;
        const impactY = params.impactY || 0.5;
        const screen1 = sources?.['screen1'];
        const screen2 = sources?.['screen2'];

        // Generate glass shards (only once, stored in closure)
        const shards: Array<{
            points: Array<{ x: number; y: number }>;
            centerX: number;
            centerY: number;
            velocityX: number;
            velocityY: number;
            rotation: number;
            rotationSpeed: number;
        }> = [];

        // Create random polygonal shards
        for (let i = 0; i < shardCount; i++) {
            const centerX = Math.random();
            const centerY = Math.random();

            // Distance from impact point
            const dx = centerX - impactX;
            const dy = centerY - impactY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Velocity based on distance from impact (closer = faster)
            const speed = (1 - distance) * 2 + 0.5;
            const angle = Math.atan2(dy, dx);

            const shard = {
                points: [] as Array<{ x: number; y: number }>,
                centerX,
                centerY,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed + 0.5, // Add gravity
                rotation: 0,
                rotationSpeed: (Math.random() - 0.5) * 10
            };

            // Create irregular polygon for shard
            const sides = 4 + Math.floor(Math.random() * 4); // 4-7 sides
            const size = 0.05 + Math.random() * 0.08;

            for (let j = 0; j < sides; j++) {
                const a = (j / sides) * Math.PI * 2;
                const r = size * (0.7 + Math.random() * 0.6);
                shard.points.push({
                    x: Math.cos(a) * r,
                    y: Math.sin(a) * r
                });
            }

            shards.push(shard);
        }

        return {
            customDraw: (ctx, w, h) => {
                ctx.save();

                // Draw screen2 (background - what's behind the glass)
                if (screen2) {
                    ctx.drawImage(screen2, 0, 0, w, h);
                }

                // Draw shattering glass shards
                if (screen1) {
                    shards.forEach(shard => {
                        // Calculate shard position based on progress
                        const t = progress;
                        const x = (shard.centerX + shard.velocityX * t * t) * w;
                        const y = (shard.centerY + shard.velocityY * t * t) * h;
                        const rotation = shard.rotation + shard.rotationSpeed * t;

                        // Fade out as they fall
                        const alpha = Math.max(0, 1 - t * 1.5);

                        if (alpha > 0) {
                            ctx.save();
                            ctx.translate(x, y);
                            ctx.rotate(rotation);
                            ctx.globalAlpha = alpha;

                            // Create clipping path for this shard
                            ctx.beginPath();
                            shard.points.forEach((point, i) => {
                                const px = point.x * w;
                                const py = point.y * h;
                                if (i === 0) ctx.moveTo(px, py);
                                else ctx.lineTo(px, py);
                            });
                            ctx.closePath();
                            ctx.clip();

                            // Draw the portion of screen1 for this shard
                            ctx.drawImage(screen1, -x, -y, w, h);

                            // Add glass edge effect (white outline)
                            ctx.globalAlpha = alpha * 0.5;
                            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                            ctx.lineWidth = 2;
                            ctx.stroke();

                            ctx.restore();
                        }
                    });
                }

                // Add impact flash at the beginning
                if (progress < 0.1) {
                    const flashAlpha = (1 - progress / 0.1) * 0.3;
                    ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
                    ctx.fillRect(0, 0, w, h);
                }

                ctx.restore();
            }
        };
    }
};
