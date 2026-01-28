import React from 'react';
import { MediaType } from '../../models';
import { Square, Circle, ArrowRight, Star, Shapes } from 'lucide-react';

interface ShapesPanelProps {
    onDragStart: (e: React.DragEvent, item: any, type: string) => void;
}

const ShapesPanel: React.FC<ShapesPanelProps> = ({ onDragStart }) => {
    const shapePresets = [
        { id: 'shape_rectangle', type: MediaType.SHAPE, shapeType: 'rectangle', name: 'Rectangle', icon: <Square size={16} /> },
        { id: 'shape_circle', type: MediaType.SHAPE, shapeType: 'circle', name: 'Circle', icon: <Circle size={16} /> },
        { id: 'shape_arrow', type: MediaType.SHAPE, shapeType: 'arrow', name: 'Arrow', icon: <ArrowRight size={16} /> },
        { id: 'shape_star', type: MediaType.SHAPE, shapeType: 'star', name: 'Star', icon: <Star size={16} /> },
    ];

    return (
        <div className="h-full overflow-y-auto p-4 custom-scrollbar bg-[#18181b]">
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                <Shapes size={12} /> Shapes
            </h3>
            <div className="grid grid-cols-2 gap-2">
                {shapePresets.map((shape) => (
                    <div
                        key={shape.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, shape, 'shape')}
                        className="bg-[#27272a] hover:bg-[#3f3f46] p-4 rounded cursor-grab active:cursor-grabbing border border-[#3f3f46] flex flex-col items-center justify-center gap-2 transition text-gray-300 hover:text-white"
                    >
                        {shape.icon}
                        <span className="text-xs">{shape.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ShapesPanel;
