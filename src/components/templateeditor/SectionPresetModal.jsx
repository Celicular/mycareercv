import React, { useState } from 'react';
import { X, LayoutTemplate, AlignLeft, Grid2X2, Type, Square } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { 
  createNameHeaderBlock, 
  createContactBar, 
  createWorkExperienceSection, 
  createEducationSection,
  createSkillsSection,
  createSectionHeader,
  getSafeSpawnPos
} from './fabricHelpers';

const ALL_PRESETS = [
  { id: 'blank', label: 'Blank Section', icon: Square, desc: 'Empty section to build from scratch' },
  { id: 'full-list', label: 'Full Width List', icon: AlignLeft, desc: 'Standard stacked layout spanning the page' },
  { id: 'half-split', label: 'Half Page Split', icon: LayoutTemplate, desc: 'Narrow left column, wide right column' },
  { id: 'grid', label: 'Square Grid', icon: Grid2X2, desc: '2x2 grid layout (2 columns side by side)' },
  { id: 'header', label: 'Header Block', icon: Type, desc: 'Large styled section title' },
];

function getAvailablePresets(sectionId) {
  if (sectionId === 'identity' || sectionId === 'custom-hdr') {
    return ALL_PRESETS.filter(p => ['header', 'blank'].includes(p.id));
  }
  if (sectionId === 'contact') {
    return ALL_PRESETS.filter(p => ['full-list', 'blank'].includes(p.id));
  }
  return ALL_PRESETS;
}

// No local getSpawnPos

export default function SectionPresetModal({ onClose, onSave, selectedObj, initialSectionId = '', initialPreset = 'blank' }) {
  const [sectionId, setSectionId] = useState(initialSectionId);
  const [selectedPreset, setSelectedPreset] = useState(initialPreset);
  const { canvasRef, pushHistory } = useEditor();

  const handleSave = () => {
    if (!sectionId.trim()) return;
    
    const sId = sectionId.trim();
    const sName = sId.replace(/-/g, ' ');
    
    // If a preset other than blank is selected, spawn those items
    if (selectedPreset !== 'blank' && canvasRef.current) {
      const canvas = canvasRef.current;
      let generatedObjects = [];
      const spawnPos = getSafeSpawnPos(canvas);

      // Route by sectionId if it's one of the known prebuilt section types
      if (selectedPreset === 'header') {
        generatedObjects = createSectionHeader(sName || 'New Section', spawnPos);
      } else if (initialSectionId === 'work' || initialSectionId === 'work-experience') {
        generatedObjects = createWorkExperienceSection(spawnPos, selectedPreset);
      } else if (initialSectionId === 'education' || initialSectionId === 'edu') {
        generatedObjects = createEducationSection(spawnPos, selectedPreset);
      } else if (initialSectionId === 'skills') {
        generatedObjects = createSkillsSection(spawnPos, selectedPreset);
      } else if (initialSectionId === 'certs') {
        generatedObjects = createWorkExperienceSection(spawnPos, selectedPreset); // Certs behaves similarly to Work
      } else if (initialSectionId === 'identity') {
        generatedObjects = createNameHeaderBlock(spawnPos);
      } else if (initialSectionId === 'contact') {
        generatedObjects = createContactBar(spawnPos);
      } else {
        // Fallback for custom sections or 'custom-hdr'
        if (selectedPreset === 'full-list') {
          generatedObjects = createWorkExperienceSection(spawnPos, selectedPreset);
        } else if (selectedPreset === 'half-split') {
          generatedObjects = createEducationSection(spawnPos, selectedPreset);
        } else if (selectedPreset === 'grid') {
          generatedObjects = createSkillsSection(spawnPos, selectedPreset);
        }
      }

      // Flatten results — some helpers return arrays, some return a single object
      // createSectionHeader returns [textbox, line], other helpers return flat arrays
      const flatObjects = Array.isArray(generatedObjects)
        ? generatedObjects.flat()
        : generatedObjects ? [generatedObjects] : [];

      // Assign the new section ID to all generated objects and add to canvas
      flatObjects.forEach(obj => {
        if (obj && typeof obj._set === 'function') {
          obj.customMeta = { ...(obj.customMeta || {}), sectionId: sId, sectionName: sName };
          canvas.add(obj);
        }
      });
      
      canvas.requestRenderAll();
      pushHistory();
    }

    onSave(sId, sName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1C1C21] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Create New Section</h2>
            <p className="text-sm text-white/50 mt-0.5">Define an ID and choose a starting layout</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-6 overflow-y-auto">
          
          {/* ID Input */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/70 uppercase tracking-widest">Section ID</label>
            <input
              autoFocus
              type="text"
              placeholder="e.g. work-experience"
              value={sectionId}
              onChange={e => setSectionId(e.target.value)}
              className="w-full bg-[#2A2A30] border border-white/10 focus:border-brand-orange rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors shadow-inner"
            />
            <p className="text-xs text-white/40">This ID binds the section to your backend data structure.</p>
          </div>

          {/* Presets Grid */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-bold text-white/70 uppercase tracking-widest">Layout Preset</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {getAvailablePresets(initialSectionId).map(preset => {
                const Icon = preset.icon;
                const isSelected = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedPreset(preset.id)}
                    className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all
                      ${isSelected 
                        ? 'bg-brand-orange/10 border-brand-orange shadow-[0_0_15px_rgba(216,67,21,0.15)]' 
                        : 'bg-[#2A2A30] border-white/5 hover:border-white/20 hover:bg-[#34343A]'
                      }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-brand-orange/20 text-brand-orange' : 'bg-black/20 text-white/50'}`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-sm font-bold ${isSelected ? 'text-brand-orange' : 'text-white'}`}>
                        {preset.label}
                      </span>
                      <span className="text-xs text-white/50 mt-1 leading-snug">
                        {preset.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/20 shrink-0 flex justify-end gap-3 rounded-b-2xl">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!sectionId.trim()}
            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-brand-orange hover:bg-[#E65100] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_0_rgba(255,107,0,0.39)]"
          >
            Create Section
          </button>
        </div>

      </div>
    </div>
  );
}
