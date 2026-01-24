
import { Clip, MediaType, Asset, Effect } from '../types';
import { getEasedProgress, getFillStyle } from './animation';
import { getTransition } from '../transitions/registry';
import { TransitionContext } from '../transitions/types';
import { getEffect } from '../effects/registry';
import { EffectContext } from '../effects/types';

// --- Reverting Canvas Pool due to rendering artifacts/corruption ---
// Using fresh canvases ensures no dirty state leaks between frames

export const renderCanvas = (
  ctx: CanvasRenderingContext2D,
  clips: Clip[],
  assets: Asset[],
  mediaCache: Map<string, HTMLImageElement | HTMLVideoElement>,
  currentTime: number,
  width: number,
  height: number
) => {
  // 1. Clear Canvas
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // 2. Filter Active Clips
  const activeClips = clips
    .filter(clip => currentTime >= clip.start && currentTime < clip.start + clip.duration);

  // 3. Group by Track
  const clipsByTrack = new Map<string, Clip[]>();
  activeClips.forEach(clip => {
    if (!clipsByTrack.has(clip.trackId)) {
      clipsByTrack.set(clip.trackId, []);
    }
    clipsByTrack.get(clip.trackId)?.push(clip);
  });

  // Sort tracks to maintain render order (using existing logic: trackId string comparison)
  // Ideally this should use the track order from the project state, but we don't have it here.
  const sortedTrackIds = Array.from(clipsByTrack.keys()).sort();

  // 4. Render Each Track
  sortedTrackIds.forEach(trackId => {
    const trackClips = clipsByTrack.get(trackId) || [];

    // Separate Control Clips (Effects, Animations) from Content Clips
    const effectClips = trackClips.filter(c => c.type === MediaType.EFFECT);
    const animClips = trackClips.filter(c => c.type === MediaType.ANIMATION);
    const contentClips = trackClips.filter(c => c.type !== MediaType.EFFECT && c.type !== MediaType.ANIMATION);

    if (contentClips.length === 0 && animClips.length === 0 && effectClips.length === 0) return;

    ctx.save();

    // --- Track-Level Effects (Filters) ---
    let trackFilter = 'none';
    if (effectClips.length > 0) {
      const filters = effectClips.flatMap(c => c.effects.map(e => e.value));
      if (filters.length > 0) trackFilter = filters.join(' ');
    }
    ctx.filter = trackFilter;

    // --- Track-Level Animations (Transitions) ---
    let trackAnimOpacity = 1;
    let trackAnimOffsetX = 0;
    let trackAnimOffsetY = 0;
    let trackAnimScale = 1;
    let trackAnimRotation = 0;
    let trackOverlayColor = null;
    let trackCustomDraw: ((ctx: CanvasRenderingContext2D, width: number, height: number, snapshot?: HTMLCanvasElement | OffscreenCanvas) => void) | undefined = undefined;

    if (animClips.length > 0) {
      // Apply the last animation clip found (or maybe combine them? usually one at a time)
      const animClip = animClips[animClips.length - 1];
      const rawProgress = (currentTime - animClip.start) / animClip.duration;
      const p = getEasedProgress(rawProgress, animClip.easing || 'linear');

      const type = animClip.animationType;
      const transition = getTransition(type);

      if (transition) {
        // Handle Source Variables (Multi-Source Transitions)
        const sources: { [key: string]: HTMLCanvasElement | OffscreenCanvas } = {};

        transition.variables.forEach(v => {
          if (v.type === 'source') {
            const params = animClip.transitionParams || {};
            const sourceValue = params[v.key];

            if (sourceValue) {
              const offscreen = document.createElement('canvas');
              offscreen.width = width;
              offscreen.height = height;
              const offCtx = offscreen.getContext('2d');

              if (offCtx) {
                if (sourceValue === '__transparent__') {
                  // Transparent - leave canvas empty (already transparent by default)
                  sources[v.key] = offscreen;
                } else if (sourceValue === '__custom_fill__') {
                  // Custom fill - use a default color (can be made configurable later)
                  // Check if there's a color param for this source
                  const fillColor = params[`${v.key}_color`] || '#000000';
                  offCtx.fillStyle = fillColor;
                  offCtx.fillRect(0, 0, width, height);
                  sources[v.key] = offscreen;
                } else {
                  // It's a clip ID
                  const sourceClip = clips.find(c => c.id === sourceValue);
                  if (sourceClip) {
                    // Render the source clip to the offscreen canvas
                    // We use the SAME time as the main render to ensure sync
                    renderClip(offCtx, sourceClip, mediaCache, currentTime, width, height, 'none');
                    sources[v.key] = offscreen;
                  }
                }
              }
            }
          }
        });

        const ctxParams: TransitionContext = {
          ctx,
          width,
          height,
          progress: p,
          isExit: false,
          params: animClip.transitionParams || {},
          sources // Pass rendered sources
        };
        const res = transition.apply(ctxParams);

        if (res.opacity !== undefined) trackAnimOpacity = res.opacity;
        if (res.offsetX !== undefined) trackAnimOffsetX = res.offsetX;
        if (res.offsetY !== undefined) trackAnimOffsetY = res.offsetY;
        if (res.scale !== undefined) trackAnimScale = res.scale;
        if (res.rotation !== undefined) trackAnimRotation = res.rotation;
        if (res.overlayColor) trackOverlayColor = res.overlayColor;
        if (res.customDraw) trackCustomDraw = res.customDraw;
      } else {
        // Legacy Fallback
        if (type === 'slide-left') trackAnimOffsetX = -p * width;
        if (type === 'slide-right') trackAnimOffsetX = p * width;
        if (type === 'slide-up') trackAnimOffsetY = -p * height;
        if (type === 'slide-down') trackAnimOffsetY = p * height;
        if (type === 'zoom-in') trackAnimScale = 1 + p;
        if (type === 'zoom-out') trackAnimScale = 1 + (1 - p);

        if (type === 'fade' || type === 'wipe') {
          if (type === 'fade') trackAnimOpacity = p;
          if (animClip.transitionColor) {
            trackOverlayColor = { style: getFillStyle(ctx, width, height, animClip.transitionColor), opacity: 1 - p };
          }
        }
      }
    }

    // Apply Track Transforms
    ctx.translate(width / 2, height / 2);
    ctx.rotate(trackAnimRotation * Math.PI / 180);
    ctx.scale(trackAnimScale, trackAnimScale);
    ctx.translate(-width / 2, -height / 2);
    ctx.translate(trackAnimOffsetX, trackAnimOffsetY);
    ctx.globalAlpha = trackAnimOpacity;

    // --- Render Content Clips ---
    contentClips.forEach(clip => {
      renderClip(ctx, clip, mediaCache, currentTime, width, height, trackFilter);
    });

    // --- Render Track Overlay (Animation Clip Overlay) ---
    if (trackOverlayColor) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset to screen space
      // @ts-ignore
      ctx.fillStyle = trackOverlayColor.style;
      // @ts-ignore
      ctx.globalAlpha = trackOverlayColor.opacity;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    if (trackCustomDraw) {
      // Snapshot for track transition
      const snapshot = document.createElement('canvas');
      snapshot.width = width;
      snapshot.height = height;
      snapshot.getContext('2d')?.drawImage(ctx.canvas, 0, 0);

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      try {
        trackCustomDraw(ctx, width, height, snapshot);
      } catch (e) {
        console.error("[Renderer] trackCustomDraw failed:", e);
      }
      ctx.restore();
    }

    ctx.restore(); // End Track Context
  });
};

const renderClip = (
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  mediaCache: Map<string, HTMLImageElement | HTMLVideoElement>,
  currentTime: number,
  width: number,
  height: number,
  trackFilter: string
) => {
  const media = mediaCache.get(clip.assetId);
  const clipTime = currentTime - clip.start + clip.offset;

  ctx.save();

  // Local Effects (Clip-level)
  const localFilters: string[] = [];
  const effectCustomDraws: ((ctx: CanvasRenderingContext2D, width: number, height: number) => void)[] = [];

  if (clip.effects) {
    clip.effects.forEach(e => {
      const effectDef = getEffect(e.kind || e.name.toLowerCase());
      if (effectDef) {
        const ctxParams: EffectContext = {
          ctx,
          width,
          height,
          params: e.effectParams || {}
        };
        const res = effectDef.apply(ctxParams);
        if (res.filter) localFilters.push(res.filter);
        if (res.customDraw) effectCustomDraws.push(res.customDraw);
      } else {
        localFilters.push(e.value);
      }
    });
  }

  if (localFilters.length > 0) {
    const localFilterStr = localFilters.join(' ');
    ctx.filter = trackFilter !== 'none' ? `${trackFilter} ${localFilterStr}` : localFilterStr;
  } else {
    // Inherit track filter (already set on ctx)
  }

  // Internal Animations (In/Out)
  let animOpacity = 1;
  let animOffsetX = 0;
  let animOffsetY = 0;
  let animScale = 1;
  let overlayColor = null;

  const durationIn = clip.animationInDuration ?? 1.0;
  const durationOut = clip.animationOutDuration ?? 1.0;
  const timeIn = currentTime - clip.start;
  const timeOut = (clip.start + clip.duration) - currentTime;

  let transitionType = 'none';
  let progress = 0;
  let easing = 'linear';
  let isExit = false;

  if (clip.animationIn && clip.animationIn !== 'none' && timeIn < durationIn) {
    transitionType = clip.animationIn;
    progress = timeIn / durationIn;
    easing = clip.animationInEasing || 'ease-out';
  }
  else if (clip.animationOut && clip.animationOut !== 'none' && timeOut < durationOut) {
    transitionType = clip.animationOut;
    progress = 1 - (timeOut / durationOut);
    easing = clip.animationOutEasing || 'ease-in';
    isExit = true;
  }

  const p = getEasedProgress(progress, easing as any);

  let result: any = null;
  if (transitionType !== 'none') {
    const transition = getTransition(transitionType);
    if (transition) {
      const ctxParams: TransitionContext = {
        ctx,
        width,
        height,
        progress: p,
        isExit,
        params: (isExit ? clip.transitionOutParams : clip.transitionInParams) || clip.transitionParams || {}
      };
      result = transition.apply(ctxParams);
      if (result.opacity !== undefined) animOpacity = result.opacity;
      if (result.offsetX !== undefined) animOffsetX = result.offsetX;
      if (result.offsetY !== undefined) animOffsetY = result.offsetY;
      if (result.scale !== undefined) animScale = result.scale;
      if (result.overlayColor) overlayColor = result.overlayColor;
    }
  }

  // Clip Transforms
  const baseW = 1280;
  const scaleFactor = width / baseW;

  const centerX = (width / 2) + ((clip.x || 0) * scaleFactor) + animOffsetX;
  const centerY = (height / 2) + ((clip.y || 0) * scaleFactor) + animOffsetY;
  const finalScale = ((clip.scale || 1) * animScale) * scaleFactor;

  ctx.translate(centerX, centerY);
  ctx.rotate((clip.rotation || 0) * Math.PI / 180);
  ctx.scale(finalScale, finalScale);
  ctx.globalAlpha = (clip.opacity ?? 1) * animOpacity;

  // Draw Content
  if (clip.type === MediaType.VIDEO && media instanceof HTMLVideoElement) {
    if (media.videoWidth > 0) {
      if (Math.abs(media.currentTime - clipTime) > 0.1) media.currentTime = clipTime;
      const aspect = media.videoWidth / media.videoHeight;
      let drawW = baseW; let drawH = baseW / aspect;
      if (drawH > 720) { drawH = 720; drawW = 720 * aspect; }
      ctx.drawImage(media, -drawW / 2, -drawH / 2, drawW, drawH);
    }
  }
  else if (clip.type === MediaType.IMAGE && media instanceof HTMLImageElement) {
    if (media.naturalWidth > 0) {
      const aspect = media.naturalWidth / media.naturalHeight;
      let drawW = baseW; let drawH = baseW / aspect;
      if (drawH > 720) { drawH = 720; drawW = 720 * aspect; }
      ctx.drawImage(media, -drawW / 2, -drawH / 2, drawW, drawH);
    }
  }

  // Apply Custom Draw Effects
  if (effectCustomDraws.length > 0) {
    effectCustomDraws.forEach(draw => {
      try {
        draw(ctx, baseW, 720); // Using base resolution for simplicity
      } catch (e) { console.error(e); }
    });
  }

  // Check for TEXT type separately below (it's in an else if)
  else if (clip.type === MediaType.TEXT) {
    const fontSize = clip.fontSize || 60;
    const fontFamily = clip.fontFamily || 'Inter';
    const color = clip.fontColor || '#ffffff';
    const bgColor = clip.backgroundColor;
    const padding = clip.padding || 8;
    const borderRadius = clip.borderRadius || 4;
    const fontWeight = clip.isBold ? 'bold' : 'normal';
    const fontStyle = clip.isItalic ? 'italic' : 'normal';

    // --- Apply Custom CSS ---
    const custom = clip.customCSS || {};

    // 1. Text Transform
    let textContent = clip.text || 'Text';
    if (custom.textTransform === 'uppercase') textContent = textContent.toUpperCase();
    else if (custom.textTransform === 'lowercase') textContent = textContent.toLowerCase();
    else if (custom.textTransform === 'capitalize') textContent = textContent.replace(/\b\w/g, l => l.toUpperCase());

    // 2. Font Setup
    let fontString = '';
    if (fontStyle !== 'normal') fontString += fontStyle + ' ';
    if (fontWeight !== 'normal') fontString += fontWeight + ' ';
    fontString += `${fontSize}px "${fontFamily}", sans-serif`;

    ctx.font = fontString;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 3. Letter Spacing (Modern Browsers)
    if (custom.letterSpacing) {
      // @ts-ignore - TS might not know about this recent property yet
      ctx.letterSpacing = custom.letterSpacing;
    } else {
      // @ts-ignore
      ctx.letterSpacing = '0px';
    }

    // 4. Line Height
    let lineHeight = fontSize * 1.2;
    if (custom.lineHeight) {
      if (custom.lineHeight.endsWith('px')) {
        lineHeight = parseFloat(custom.lineHeight);
      } else {
        // unitless or em, assume relative to font size if simple number
        const lh = parseFloat(custom.lineHeight);
        if (!isNaN(lh)) lineHeight = fontSize * lh;
      }
    }

    // 5. Filter (Append to existing)
    if (custom.filter) {
      ctx.filter = ctx.filter !== 'none' ? `${ctx.filter} ${custom.filter}` : custom.filter;
    }

    const lines = textContent.split('\n');
    const textMetrics = lines.map(line => ctx.measureText(line));
    const maxWidth = Math.max(...textMetrics.map(m => m.width));
    const totalHeight = lines.length * lineHeight;

    if (bgColor) {
      const boxWidth = maxWidth + (padding * 2);
      const boxHeight = totalHeight + (padding * 2);
      ctx.fillStyle = bgColor;

      // Save/Restore for shadow to not affect background if possible, 
      // OR let shadow affect background if that's standard. 
      // Usually text-shadow only affects text. Box shadow is different.
      // We'll apply text-shadow ONLY to text below.

      if (borderRadius > 0) {
        const x = -boxWidth / 2;
        const y = -boxHeight / 2;
        ctx.beginPath();
        // @ts-ignore
        if (ctx.roundRect) ctx.roundRect(x, y, boxWidth, boxHeight, borderRadius);
        else ctx.fillRect(x, y, boxWidth, boxHeight);
        ctx.fill();
      } else {
        ctx.fillRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
      }
    }

    ctx.fillStyle = color;

    // 6. Text Shadow
    // Default shadow
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    if (custom.textShadow) {
      // Simple parser for "2px 2px 4px red" or "0 0 10px #fff"
      // Complex parsing is hard, usually canvas expects specific properties.
      // We attempt to parse the string logic: [offsetX] [offsetY] [blur] [color]
      // But CSS allows color first or last.
      // For accurate rendering we might need a regex or library. 
      // Quick basic support:
      const shadowMatch = custom.textShadow.match(/(-?\d+px)?\s*(-?\d+px)?\s*(-?\d+px)?\s*(.*)/);
      if (shadowMatch) {
        // This is very loose. A better way for simple cases:
        // Let's assume standard order or try to extract color.
        // Actually, ctx.shadowColor etc need separate values. 
        // Canvas doesn't support a "shadow" shorthand property string directly like CSS.
        // We need to manually extract.
        // Regex for: 1px 2px 3px red
        const parts = custom.textShadow.split(/\s(?![^(]*\))/); // split by space not in parens
        // Try to find color
        let colorPart = 'black';
        let lengths = [];

        for (const p of parts) {
          if (/^[a-zA-Z]+$|^#|^rgb|^hsl/.test(p)) colorPart = p;
          else if (/px|0/.test(p)) lengths.push(parseFloat(p));
        }

        if (lengths.length >= 2) {
          ctx.shadowOffsetX = lengths[0] || 0;
          ctx.shadowOffsetY = lengths[1] || 0;
          ctx.shadowBlur = lengths[2] || 0;
          ctx.shadowColor = colorPart;
        }
      }
    }

    const startY = -(lines.length - 1) * lineHeight / 2;
    lines.forEach((line, i) => {
      const y = startY + (i * lineHeight);
      ctx.fillText(line, 0, y);
      if (clip.isUnderline) {
        const metrics = ctx.measureText(line);
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, fontSize / 20);
        ctx.moveTo(-metrics.width / 2, y + fontSize * 0.1);
        ctx.lineTo(metrics.width / 2, y + fontSize * 0.1);
        ctx.stroke();
      }
    });
    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    // @ts-ignore
    if (ctx.letterSpacing) ctx.letterSpacing = '0px';
  }
  else if (clip.type === MediaType.SHAPE) {
    const shapeType = clip.shapeType || 'rectangle';
    const fillColor = clip.fillColor || '#3b82f6';
    const strokeColor = clip.strokeColor || '#ffffff';
    const strokeWidth = clip.strokeWidth || 2;
    const shapeWidth = 200;
    const shapeHeight = 200;

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;

    ctx.beginPath();
    if (shapeType === 'rectangle') {
      const radius = clip.borderRadius || 0;
      // @ts-ignore
      if (radius > 0 && ctx.roundRect) ctx.roundRect(-shapeWidth / 2, -shapeHeight / 2, shapeWidth, shapeHeight, radius);
      else ctx.rect(-shapeWidth / 2, -shapeHeight / 2, shapeWidth, shapeHeight);
    } else if (shapeType === 'circle') {
      ctx.arc(0, 0, shapeWidth / 2, 0, Math.PI * 2);
    } else if (shapeType === 'arrow') {
      ctx.moveTo(-shapeWidth / 2, 0);
      ctx.lineTo(shapeWidth / 4, 0);
      ctx.lineTo(shapeWidth / 4, -shapeHeight / 4);
      ctx.lineTo(shapeWidth / 2, 0);
      ctx.lineTo(shapeWidth / 4, shapeHeight / 4);
      ctx.lineTo(shapeWidth / 4, 0);
    } else if (shapeType === 'star') {
      const spikes = 5;
      const outerRadius = shapeWidth / 2;
      const innerRadius = outerRadius / 2.5;
      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / spikes - Math.PI / 2;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
    if (strokeWidth > 0) ctx.stroke();
  }

  // Clip Overlay (Flash/Wipe)
  if (overlayColor) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset to screen space
    // @ts-ignore
    ctx.fillStyle = overlayColor.style;
    // @ts-ignore
    ctx.globalAlpha = overlayColor.opacity;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // Custom Draw (Post-Render)
  if (result?.customDraw) {
    // Snapshot for clip transition
    const snapshot = document.createElement('canvas');
    snapshot.width = width;
    snapshot.height = height;
    snapshot.getContext('2d')?.drawImage(ctx.canvas, 0, 0);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    try {
      result.customDraw(ctx, width, height, snapshot);
    } catch (e) {
      console.error(`[Renderer] customDraw failed for ${transitionType}:`, e);
    }
    ctx.restore();
  }

  ctx.restore(); // End Clip Context
};