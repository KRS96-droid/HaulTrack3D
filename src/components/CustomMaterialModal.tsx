import React, { useState } from 'react';
import { X, Plus, Layers, Palette } from 'lucide-react';
import { Material } from '../types';

interface CustomMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMaterial: (material: Material) => void;
}

export const CustomMaterialModal: React.FC<CustomMaterialModalProps> = ({
  isOpen,
  onClose,
  onAddMaterial,
}) => {
  const [name, setName] = useState('');
  const [density, setDensity] = useState('1.60');
  const [color, setColor] = useState('#ec4899');
  const [description, setDescription] = useState('');

  const PRESET_COLORS = [
    '#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f97316', '#a855f7', '#6366f1', '#14b8a6', '#84cc16'
  ];

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const id = `custom_${Date.now()}`;
    const newMaterial: Material = {
      id,
      name: name.trim(),
      density: parseFloat(density) || 1.6,
      color,
      description: description.trim() || 'Custom site aggregate material.',
      isCustom: true,
    };

    onAddMaterial(newMaterial);
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-neutral-900 border border-neutral-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-tactical font-bold text-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-white font-tactical font-bold text-sm tracking-wide">ADD CUSTOM MATERIAL</h3>
              <p className="text-[11px] text-neutral-400 font-mono">Create custom aggregate or mix</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-neutral-400 text-[11px] mb-1 font-mono">Material Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Wet Mix Macadam (WMM)"
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500 font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-400 text-[11px] mb-1 font-mono">Bulk Density (T/m³)</label>
              <input
                type="number"
                step="0.05"
                min="0.5"
                max="3.0"
                value={density}
                onChange={(e) => setDensity(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-neutral-400 text-[11px] mb-1 font-mono">Color Code</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-9 h-9 rounded cursor-pointer bg-neutral-950 border border-neutral-700 p-0.5"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-1.5 text-white font-mono text-[11px] uppercase"
                />
              </div>
            </div>
          </div>

          {/* Color Presets */}
          <div>
            <label className="block text-neutral-400 text-[10px] mb-1.5 uppercase font-mono">Preset Palette</label>
            <div className="flex gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full border border-black/40 transition-transform hover:scale-110"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-neutral-400 text-[11px] mb-1 font-mono">Description / Usage</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Granular sub-layer mix for heavy axle roadway paving."
              rows={2}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500 text-xs"
            />
          </div>

          {/* Action */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 font-mono text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold font-tactical text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Register Material</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
