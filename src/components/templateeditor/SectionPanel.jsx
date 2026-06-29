import React, { useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import { useSections } from '../../hooks/useSections';
import { ChevronRight, ChevronDown, Lock, Check, Sparkles, SidebarClose } from 'lucide-react';

export default function SectionPanel({ onClose }) {
  const { canvasRef, pushHistory, historyVersion } = useEditor();
  const { sections, rescan } = useSections(canvasRef, historyVersion);

  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const toggleElementVisibility = (element) => {
    const obj = element.obj;
    const nextVis = !obj.visible;
    obj.set('visible', nextVis);
    // Mark dirty by spreading customMeta
    obj.customMeta = { ...obj.customMeta };
    canvasRef.current?.requestRenderAll();
    pushHistory();
    rescan(); // Force rescan to update visible state in the hook immediately
  };

  return (
    <aside className="w-[280px] shrink-0 h-full bg-[#16161a] border-r border-white/5 flex flex-col shadow-2xl z-10 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/5 bg-[#16161a]/80 backdrop-blur">
        <h2 className="text-sm font-semibold text-white/90 tracking-tight">Layout</h2>
        <button 
          onClick={onClose}
          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-[#2A2A30] transition-colors"
          title="Close Layout Panel"
        >
          <SidebarClose size={16} />
        </button>
      </div>

      {/* Sections List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 editor-panel-scroll">
        {sections.length === 0 ? (
          <div className="text-center py-8 px-4 text-white/40 text-sm">
            No sections defined in this template.
          </div>
        ) : (
          sections.map(section => {
            const isExpanded = !!expandedSections[section.sectionId];
            return (
              <div key={section.sectionId} className="border border-white/5 bg-[#2A2A30] rounded-xl overflow-hidden transition-all shadow-sm">
                {/* Section Header */}
                <button
                  onClick={() => !section.isLocked && toggleSection(section.sectionId)}
                  disabled={section.isLocked}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors
                    ${section.isLocked ? 'cursor-default opacity-80' : 'hover:bg-[#34343A] active:bg-[#40404A]'}`}
                >
                  <div className="w-4 h-4 flex items-center justify-center shrink-0 text-white/40">
                    {section.isLocked ? (
                      <Lock size={12} />
                    ) : (
                      isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                    )}
                  </div>
                  
                  <span className="flex-1 text-xs font-semibold text-white/80 uppercase tracking-wider truncate">
                    {section.sectionName}
                  </span>

                  {section.aiContent && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-brand-orange/20 text-brand-orange text-[9px] font-bold tracking-wide">
                      <Sparkles size={10} />
                      AI
                    </span>
                  )}
                </button>

                {/* Elements List */}
                {(!section.isLocked && isExpanded) && (
                  <div className="px-2 pb-2 pt-0 space-y-0.5 border-t border-white/5 bg-[#1C1C21]">
                    {section.elements.map((element, idx) => (
                      <div 
                        key={idx}
                        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors group
                          ${element.isElementLocked ? 'opacity-70' : 'hover:bg-[#2A2A30]'}
                          ${element.visible ? '' : 'text-white/40'}`}
                      >
                        <button
                          disabled={element.isElementLocked}
                          onClick={() => toggleElementVisibility(element)}
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors
                            ${element.isElementLocked 
                              ? 'border-white/10 bg-[#2A2A30] text-white/30' 
                              : element.visible
                                ? 'border-brand-orange bg-brand-orange text-white shadow-[0_1px_4px_rgba(216,67,21,0.4)]'
                                : 'border-white/20 bg-transparent text-transparent group-hover:border-brand-orange/60'
                            }`}
                        >
                          {element.isElementLocked ? <Lock size={10} /> : <Check size={10} strokeWidth={3} />}
                        </button>
                        
                        <span className={`text-sm truncate select-none ${element.visible ? 'text-white/80' : 'text-white/40'}`}>
                          {element.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
