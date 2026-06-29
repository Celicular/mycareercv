import React, { useEffect, useRef } from 'react';
import { useEditor } from '../../context/EditorContext';
import { useSections } from '../../hooks/useSections';
import { Lock, Check, X } from 'lucide-react';

export default function SectionPopup() {
  const { activeSectionPopup, setActiveSectionPopup, canvasRef, pushHistory, historyVersion } = useEditor();
  const { sections, rescan } = useSections(canvasRef, historyVersion);
  const popupRef = useRef(null);

  // Close popup if clicked outside
  useEffect(() => {
    const onClick = (e) => {
      // If click is inside canvas, TemplateCanvas's mouse:down handles it.
      // We only care about closing it if they click somewhere else in the UI.
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        // We only close if they didn't click on the canvas (handled separately)
        if (!e.target.closest('canvas')) {
          setActiveSectionPopup(null);
        }
      }
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [setActiveSectionPopup]);

  if (!activeSectionPopup) return null;

  const { sectionId, x, y } = activeSectionPopup;
  const section = sections.find(s => s.sectionId === sectionId);

  if (!section) return null;

  const { zoom } = useEditor();

  const toggleElementVisibility = (element) => {
    const obj = element.obj;
    const nextVis = !obj.visible;
    const canvas = canvasRef.current;
    
    // Use true logical height (unzoomed)
    const unzoomedHeight = obj.height * obj.scaleY;
    
    if (!obj.customMeta.elementId) {
      obj.customMeta.elementId = Math.random().toString(36).substr(2, 9);
    }
    const myId = obj.customMeta.elementId;

    const allSectionObjects = canvas.getObjects().filter(o => o.customMeta?.sectionId === sectionId);
    let siblingObjects = [];
    
    if (!nextVis) {
      // HIDING: Find elements spatially below this element
      const thresholdTop = obj.top + (unzoomedHeight / 2);
      siblingObjects = allSectionObjects.filter(o => o !== obj && o.top > thresholdTop);
    } else {
      // SHOWING: Find elements that were historically shifted by this specific element
      siblingObjects = allSectionObjects.filter(o => o.customMeta?.shiftedBy?.includes(myId));
    }

    // If hiding, shift siblings UP. If showing, shift siblings DOWN.
    let deltaY = nextVis ? unzoomedHeight : -unzoomedHeight;

    // Collision check: if moving these siblings would cause them to collide with ANY non-moving visible element in the section
    const nonMovingVisible = allSectionObjects.filter(o => o.visible && o !== obj && !siblingObjects.includes(o));
    
    let hasCollision = false;
    for (let sibling of siblingObjects) {
      const sRect = sibling.getBoundingRect();
      const sLeft = sRect.left / zoom;
      const sTop = sRect.top / zoom + deltaY;
      const sRight = sLeft + sRect.width / zoom;
      const sBottom = sTop + sRect.height / zoom;

      for (let nm of nonMovingVisible) {
        const nmRect = nm.getBoundingRect();
        const nmLeft = nmRect.left / zoom;
        const nmTop = nmRect.top / zoom;
        const nmRight = nmLeft + nmRect.width / zoom;
        const nmBottom = nmTop + nmRect.height / zoom;

        // Check intersection (with a tiny 1px margin to avoid rounding collisions)
        if (
          sLeft < nmRight - 1 &&
          sRight > nmLeft + 1 &&
          sTop < nmBottom - 1 &&
          sBottom > nmTop + 1
        ) {
          hasCollision = true;
          break;
        }
      }
      if (hasCollision) break;
    }

    if (!hasCollision) {
      siblingObjects.forEach(sibling => {
        sibling.set('top', sibling.top + deltaY);
        sibling.setCoords();
        
        // Update history tracking for this sibling
        const shiftedBy = sibling.customMeta.shiftedBy || [];
        if (!nextVis) {
          // Add to tracking
          if (!shiftedBy.includes(myId)) {
            sibling.customMeta = { ...sibling.customMeta, shiftedBy: [...shiftedBy, myId] };
          }
        } else {
          // Remove from tracking
          sibling.customMeta = { 
            ...sibling.customMeta, 
            shiftedBy: shiftedBy.filter(id => id !== myId) 
          };
        }
      });
    }

    obj.set('visible', nextVis);
    obj.customMeta = { ...obj.customMeta, elementId: myId };
    canvas.requestRenderAll();
    pushHistory();
    rescan(); // Force rescan
  };

  return (
    <div 
      ref={popupRef}
      className="absolute z-50 bg-[#1C1C21]/80 backdrop-blur-md border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col w-[240px] overflow-hidden"
      style={{ left: x, top: y }}
    >
      <div className="flex items-center justify-between px-3 py-2 bg-[#2A2A30]/80 border-b border-white/5">
        <span className="text-xs font-semibold text-white/90 truncate pr-2">
          {section.sectionName}
        </span>
        <button onClick={() => setActiveSectionPopup(null)} className="text-white/40 hover:text-white p-1 rounded hover:bg-[#34343A] transition-colors">
          <X size={12} />
        </button>
      </div>

      <div className="p-2 flex flex-col gap-0.5 max-h-[300px] overflow-y-auto editor-panel-scroll">
        {section.elements.map((element, idx) => (
          <div 
            key={idx}
            className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors group
              ${element.isSectionLocked ? 'opacity-70' : 'hover:bg-[#2A2A30]'}
              ${element.visible ? '' : 'text-white/40'}`}
          >
            <button
              disabled={element.isSectionLocked}
              onClick={() => toggleElementVisibility(element)}
              className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors
                ${element.isSectionLocked 
                  ? 'border-white/10 bg-[#2A2A30] text-white/30' 
                  : element.visible
                    ? 'border-brand-orange bg-brand-orange text-white shadow-[0_1px_4px_rgba(216,67,21,0.4)]'
                    : 'border-white/20 bg-transparent text-transparent group-hover:border-brand-orange/60'
                }`}
            >
              {element.isSectionLocked ? <Lock size={10} /> : <Check size={10} strokeWidth={3} />}
            </button>
            
            <span className={`text-xs truncate select-none ${element.visible ? 'text-white/80' : 'text-white/40'}`}>
              {element.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
