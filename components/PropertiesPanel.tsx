
import React from 'react';
import { Clip, MediaType } from '../types';
import { X, Trash2, Layers, Settings2, Film, Image as ImageIcon, Move, Wand2, Bold, Italic, Underline, Superscript, Subscript } from 'lucide-react';
import { TransitionSettings } from './properties/TransitionSettings';
import { EffectSettings } from './properties/EffectSettings';
import AudioSettings from './properties/AudioSettings';
import { FontPicker } from './FontPicker';
import { CustomFont } from '../types';

interface PropertiesPanelProps {
  clips: Clip[];
  allClips?: Clip[];
  onUpdate: (updates: Partial<Clip>) => void;
  onDelete: () => void;
  onClose: () => void;
  onSeek: (time: number) => void;
  onDetachAudio?: () => void;
  customFonts?: CustomFont[];
  onUploadFont?: (font: CustomFont) => void;
  timerInputRef?: React.RefObject<HTMLInputElement>;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ clips, allClips = [], onUpdate, onDelete, onClose, onSeek, onDetachAudio, customFonts = [], onUploadFont = () => { }, timerInputRef }) => {
  if (clips.length === 0) return null;

  if (clips.length > 1) {
    return (
      <div className="w-[300px] bg-[#18181b] border-l border-[#27272a] flex flex-col h-full z-20">
        <div className="h-12 border-b border-[#27272a] flex items-center justify-between px-4 bg-[#202024]">
          <span className="font-semibold text-sm text-gray-200 flex items-center gap-2"><Layers size={14} /> Selection ({clips.length})</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={16} /></button>
        </div>
        <div className="p-4 space-y-4">
          <button onClick={onDelete} className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-3 rounded text-xs font-bold transition"><Trash2 size={14} /> Delete All</button>
        </div>
      </div>
    );
  }

  const clip = clips[0];
  const isMediaClip = clip.type === MediaType.VIDEO || clip.type === MediaType.IMAGE || clip.type === MediaType.TEXT || clip.type === MediaType.SHAPE;

  return (
    <div className="w-[300px] bg-[#18181b]/80 backdrop-blur-xl border-l border-white/5 flex flex-col h-full z-20 shadow-2xl">
      <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-white/5">
        <div className="flex items-center gap-2 overflow-hidden">
          {clip.type === MediaType.VIDEO ? <Film size={14} className="text-blue-400" /> :
            clip.type === MediaType.IMAGE ? <ImageIcon size={14} className="text-purple-400" /> :
              clip.type === MediaType.ANIMATION ? <Move size={14} className="text-orange-400" /> :
                clip.type === MediaType.EFFECT ? <Wand2 size={14} className="text-pink-400" /> : <Settings2 size={14} className="text-gray-400" />}
          <span className="font-semibold text-sm text-gray-200 truncate">{clip.name}</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white ml-2"><X size={16} /></button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Name</label>
          <input type="text" value={clip.name} onChange={(e) => onUpdate({ name: e.target.value })} className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors" />
        </div>

        {/* Timing Control - Element Timer */}
        <div className="space-y-3 bg-[#202024]/50 p-3 rounded-lg border border-[#27272a]">
          <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-2">
            Timing <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-mono">T</span>
            <span className="h-px bg-[#3f3f46] flex-1"></span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400">Start Time (s)</label>
              <input
                ref={timerInputRef}
                type="number"
                step="0.01"
                min="0"
                value={Number(clip.start.toFixed(2))}
                onChange={(e) => onUpdate({ start: Math.max(0, parseFloat(e.target.value)) })}
                className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400">Duration (s)</label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                value={Number(clip.duration.toFixed(2))}
                onChange={(e) => onUpdate({ duration: Math.max(0.1, parseFloat(e.target.value)) })}
                className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Transitions Section */}
        {(isMediaClip || clip.type === MediaType.ANIMATION) && (
          <TransitionSettings clip={clip} allClips={allClips} onUpdate={onUpdate} onSeek={onSeek} />
        )}

        {/* Audio Settings */}
        {(clip.type === MediaType.AUDIO || clip.type === MediaType.VIDEO) && (
          <AudioSettings clip={clip} onUpdate={onUpdate} />
        )}

        {/* Effects Section */}
        {(isMediaClip || clip.type === MediaType.EFFECT) && (
          <EffectSettings clip={clip} onUpdate={onUpdate} />
        )}

        {/* Text Settings */}
        {clip.type === MediaType.TEXT && (
          <div className="space-y-3">
            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-2">Text<span className="h-px bg-[#3f3f46] flex-1"></span></label>
            <textarea value={clip.text || ""} onChange={(e) => onUpdate({ text: e.target.value })} className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-3 py-2 text-xs h-20 resize-none text-white" />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-[10px] text-gray-400">Size</label><input type="number" value={clip.fontSize || 60} onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })} className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1.5 text-xs text-white" /></div>
              <div className="space-y-1"><label className="text-[10px] text-gray-400">Color</label><input type="color" value={clip.fontColor || "#ffffff"} onChange={(e) => onUpdate({ fontColor: e.target.value })} className="h-8 w-full bg-[#09090b] border border-[#3f3f46] rounded" /></div>

              {/* Font Selector */}
              <div className="space-y-1 col-span-2">
                <label className="text-[10px] text-gray-400">Font Family</label>
                <FontPicker
                  currentFont={clip.fontFamily || 'Inter'}
                  onSelectFont={(font) => onUpdate({ fontFamily: font })}
                  customFonts={customFonts}
                  onUploadFont={onUploadFont}
                />
              </div>
            </div>
            {/* Rich Text Toolbar */}
            <div className="flex items-center gap-1 bg-[#27272a] p-1 rounded">
              <button
                onClick={() => onUpdate({ isBold: !clip.isBold })}
                className={`p-1.5 rounded hover:bg-[#3f3f46] ${clip.isBold ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
                title="Bold"
              >
                <Bold size={14} />
              </button>
              <button
                onClick={() => onUpdate({ isItalic: !clip.isItalic })}
                className={`p-1.5 rounded hover:bg-[#3f3f46] ${clip.isItalic ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
                title="Italic"
              >
                <Italic size={14} />
              </button>
              <button
                onClick={() => onUpdate({ isUnderline: !clip.isUnderline })}
                className={`p-1.5 rounded hover:bg-[#3f3f46] ${clip.isUnderline ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
                title="Underline"
              >
                <Underline size={14} />
              </button>
              <div className="w-px h-4 bg-[#3f3f46] mx-1"></div>
              <button
                onClick={() => onUpdate({ isSuperscript: !clip.isSuperscript, isSubscript: false })}
                className={`p-1.5 rounded hover:bg-[#3f3f46] ${clip.isSuperscript ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
                title="Superscript"
              >
                <Superscript size={14} />
              </button>
              <button
                onClick={() => onUpdate({ isSubscript: !clip.isSubscript, isSuperscript: false })}
                className={`p-1.5 rounded hover:bg-[#3f3f46] ${clip.isSubscript ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
                title="Subscript"
              >
                <Subscript size={14} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-gray-400">Background Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={clip.backgroundColor || "#000000"}
                  onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
                  className="h-8 w-8 bg-[#09090b] border border-[#3f3f46] rounded cursor-pointer"
                />
                <button
                  onClick={() => onUpdate({ backgroundColor: undefined })}
                  className="text-[10px] text-gray-400 hover:text-white underline"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400">Padding</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={clip.padding || 8}
                  onChange={(e) => onUpdate({ padding: Number(e.target.value) })}
                  className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1.5 text-xs text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400">Corner Radius</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={clip.borderRadius || 4}
                  onChange={(e) => onUpdate({ borderRadius: Number(e.target.value) })}
                  className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Shape Settings */}
        {clip.type === MediaType.SHAPE && (
          <div className="space-y-3">
            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-2">Shape<span className="h-px bg-[#3f3f46] flex-1"></span></label>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400">Fill Color</label>
                <input
                  type="color"
                  value={clip.fillColor || "#3b82f6"}
                  onChange={(e) => onUpdate({ fillColor: e.target.value })}
                  className="h-8 w-full bg-[#09090b] border border-[#3f3f46] rounded cursor-pointer"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400">Stroke Color</label>
                <input
                  type="color"
                  value={clip.strokeColor || "#ffffff"}
                  onChange={(e) => onUpdate({ strokeColor: e.target.value })}
                  className="h-8 w-full bg-[#09090b] border border-[#3f3f46] rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400">Stroke Width</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={clip.strokeWidth || 2}
                  onChange={(e) => onUpdate({ strokeWidth: Number(e.target.value) })}
                  className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1.5 text-xs text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400">Corner Radius</label>
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={clip.borderRadius || 0}
                  onChange={(e) => onUpdate({ borderRadius: Number(e.target.value) })}
                  className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Transform */}
        {isMediaClip && (
          <div className="space-y-3">
            <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-2">Transform<span className="h-px bg-[#3f3f46] flex-1"></span></label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-[10px] text-gray-400">Scale</label><input type="number" step="0.1" value={clip.scale ?? 1} onChange={(e) => onUpdate({ scale: parseFloat(e.target.value) })} className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1 text-xs text-white" /></div>
              <div className="space-y-1"><label className="text-[10px] text-gray-400">Rotate</label><input type="number" value={clip.rotation ?? 0} onChange={(e) => onUpdate({ rotation: parseFloat(e.target.value) })} className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1 text-xs text-white" /></div>
              <div className="space-y-1"><label className="text-[10px] text-gray-400">X</label><input type="number" value={clip.x ?? 0} onChange={(e) => onUpdate({ x: parseFloat(e.target.value) })} className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1 text-xs text-white" /></div>
              <div className="space-y-1"><label className="text-[10px] text-gray-400">Y</label><input type="number" value={clip.y ?? 0} onChange={(e) => onUpdate({ y: parseFloat(e.target.value) })} className="w-full bg-[#09090b] border border-[#3f3f46] rounded px-2 py-1 text-xs text-white" /></div>
            </div>
          </div>
        )}

        <div className="pt-4 mt-4 border-t border-[#27272a] space-y-2">
          {clip.type === MediaType.VIDEO && clip.hasAudio !== false && onDetachAudio && (
            <button onClick={onDetachAudio} className="w-full flex items-center justify-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 py-2.5 rounded text-xs font-bold transition">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              Detach Audio
            </button>
          )}
          <button onClick={onDelete} className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-2.5 rounded text-xs font-bold transition"><Trash2 size={14} /> Delete Clip</button>
        </div>
      </div>
    </div>
  );
};

export default PropertiesPanel;