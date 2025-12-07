import React, { useState, useRef } from 'react';
import { Search, Upload, Type, Check } from 'lucide-react';
import { CustomFont } from '../types';

// Curated list of popular Google Fonts
const GOOGLE_FONTS = [
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Raleway',
    'Poppins', 'Merriweather', 'Nunito', 'Playfair Display', 'Rubik', 'Ubuntu',
    'Kanit', 'Bebas Neue', 'Lobster', 'Pacifico', 'Dancing Script', 'Abril Fatface',
    'Caveat', 'Shadows Into Light', 'Indie Flower', 'Permanent Marker', 'Amatic SC'
];

interface FontPickerProps {
    currentFont: string;
    onSelectFont: (font: string) => void;
    customFonts: CustomFont[];
    onUploadFont: (font: CustomFont) => void;
}

export const FontPicker: React.FC<FontPickerProps> = ({
    currentFont,
    onSelectFont,
    customFonts,
    onUploadFont
}) => {
    const [activeTab, setActiveTab] = useState<'google' | 'custom'>('google');
    const [search, setSearch] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredGoogleFonts = GOOGLE_FONTS.filter(f =>
        f.toLowerCase().includes(search.toLowerCase())
    );

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            const fontName = file.name.split('.')[0];
            const fontType = file.name.endsWith('.otf') ? 'otf' : 'ttf';

            const newFont: CustomFont = {
                name: fontName,
                src: result,
                type: fontType
            };

            // Inject font face immediately
            const style = document.createElement('style');
            style.textContent = `
        @font-face {
          font-family: '${fontName}';
          src: url('${result}') format('${fontType === 'ttf' ? 'truetype' : 'opentype'}');
        }
      `;
            document.head.appendChild(style);

            onUploadFont(newFont);
            onSelectFont(fontName);
        };
        reader.readAsDataURL(file);

        // Reset input
        e.target.value = '';
    };

    return (
        <div className="space-y-3">
            <div className="flex bg-[#09090b] p-1 rounded-lg border border-[#3f3f46]">
                <button
                    onClick={() => setActiveTab('google')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded ${activeTab === 'google' ? 'bg-[#27272a] text-white' : 'text-gray-400 hover:text-gray-200'}`}
                >
                    Google Fonts
                </button>
                <button
                    onClick={() => setActiveTab('custom')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded ${activeTab === 'custom' ? 'bg-[#27272a] text-white' : 'text-gray-400 hover:text-gray-200'}`}
                >
                    Custom Uploads
                </button>
            </div>

            {activeTab === 'google' ? (
                <div className="space-y-2">
                    <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search fonts..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-[#09090b] border border-[#3f3f46] rounded pl-8 pr-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="h-40 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                        {filteredGoogleFonts.map(font => (
                            <button
                                key={font}
                                onClick={() => {
                                    // Dynamically load Google Font
                                    const link = document.createElement('link');
                                    link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}&display=swap`;
                                    link.rel = 'stylesheet';
                                    document.head.appendChild(link);
                                    onSelectFont(font);
                                }}
                                className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between group ${currentFont === font ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-[#27272a] text-gray-300'}`}
                                style={{ fontFamily: font }}
                            >
                                {font}
                                {currentFont === font && <Check size={12} />}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border border-dashed border-[#3f3f46] hover:border-blue-500 hover:bg-blue-500/5 rounded-lg p-4 flex flex-col items-center justify-center gap-2 transition-colors group"
                    >
                        <div className="w-8 h-8 rounded-full bg-[#27272a] group-hover:bg-blue-500/20 flex items-center justify-center text-gray-400 group-hover:text-blue-400 transition-colors">
                            <Upload size={14} />
                        </div>
                        <span className="text-xs text-gray-400 group-hover:text-gray-200">Click to upload .ttf or .otf</span>
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".ttf,.otf"
                        className="hidden"
                    />

                    {customFonts.length > 0 && (
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-gray-500">Your Fonts</label>
                            <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1">
                                {customFonts.map(font => (
                                    <button
                                        key={font.name}
                                        onClick={() => onSelectFont(font.name)}
                                        className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between ${currentFont === font.name ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-[#27272a] text-gray-300'}`}
                                        style={{ fontFamily: font.name }}
                                    >
                                        {font.name}
                                        {currentFont === font.name && <Check size={12} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
