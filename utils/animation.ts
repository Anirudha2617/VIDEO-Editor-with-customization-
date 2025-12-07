
import { EasingType } from '../types';

export const getEasedProgress = (t: number, type: EasingType = 'linear'): number => {
  const time = Math.max(0, Math.min(1, t));
  switch (type) {
    case 'ease-in': return time * time;
    case 'ease-out': return time * (2 - time);
    case 'ease-in-out': return time < .5 ? 2 * time * time : -1 + (4 - 2 * time) * time;
    case 'linear':
    default: return time;
  }
};

export const getFillStyle = (ctx: CanvasRenderingContext2D, width: number, height: number, colorStr?: string) => {
  if (!colorStr) return '#000000';

  if (colorStr.startsWith('grad_')) {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    switch (colorStr) {
      case 'grad_sunset': grad.addColorStop(0, '#ff9966'); grad.addColorStop(1, '#ff5e62'); break;
      case 'grad_ocean': grad.addColorStop(0, '#2193b0'); grad.addColorStop(1, '#6dd5ed'); break;
      case 'grad_purple': grad.addColorStop(0, '#834d9b'); grad.addColorStop(1, '#d04ed6'); break;
      case 'grad_dark': grad.addColorStop(0, '#232526'); grad.addColorStop(1, '#414345'); break;
      default: return '#000000';
    }
    return grad;
  }
  return colorStr;
};
