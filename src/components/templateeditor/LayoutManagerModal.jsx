import React, { useState, useEffect } from 'react';
import { useEditor } from '../../context/EditorContext';
import { useSections } from '../../hooks/useSections';
import { X, Lock, ArchiveRestore, Sparkles } from 'lucide-react';

const A4_W = 595;
const A4_H = 842;
const MINI_W = 400; // slightly larger for better visibility
const SCALE = MINI_W / A4_W;
const MINI_H = A4_H * SCALE;
const GRID_SIZE = 10; 
const VISUAL_GRID = GRID_SIZE * SCALE;
const MARGIN = 36; // 0.5 inches at 72 DPI
const STASH_START_X = A4_W + 50; // Logical x-coordinate where stash bin starts
const STASH_W = 220; // Logical width of stash bin

export default function LayoutManagerModal({ onClose }) {
  const { canvasRef, pushHistory, historyVersion } = useEditor();
  const { sections } = useSections(canvasRef, historyVersion);
  
  const [items, setItems] = useState([]);
  const [originalItems, setOriginalItems] = useState([]);
  const [dragState, setDragState] = useState(null);

  useEffect(() => {
    if (!canvasRef.current || sections.length === 0) return;
    const canvas = canvasRef.current;
    
    let currentStashY = 20;

    const sectionStats = sections.map(sec => {
      const objects = canvas.getObjects().filter(o => o.customMeta?.sectionId === sec.sectionId);
      if (objects.length === 0) return null;

      const isStashed = objects.every(o => !o.visible);

      let fabricMinX = Infinity, fabricMaxX = -Infinity;
      let fabricMinY = Infinity, fabricMaxY = -Infinity;
      
      objects.forEach(obj => {
        const br = obj.getBoundingRect();
        const unzoomedLeft = br.left / canvas.getZoom();
        const unzoomedTop = br.top / canvas.getZoom();
        const unzoomedWidth = br.width / canvas.getZoom();
        const unzoomedHeight = br.height / canvas.getZoom();
        
        fabricMinX = Math.min(fabricMinX, unzoomedLeft);
        fabricMinY = Math.min(fabricMinY, unzoomedTop);
        fabricMaxX = Math.max(fabricMaxX, unzoomedLeft + unzoomedWidth);
        fabricMaxY = Math.max(fabricMaxY, unzoomedTop + unzoomedHeight);
      });
      
      let minX = fabricMinX;
      let minY = fabricMinY;
      
      if (isStashed) {
        minX = STASH_START_X + 20;
        minY = currentStashY;
        currentStashY += (fabricMaxY - fabricMinY) + 20;
      }

      return {
        id: sec.sectionId,
        sectionName: sec.sectionName,
        isLocked: sec.isLocked,
        fabricMinX,
        fabricMinY,
        minX,
        minY,
        width: fabricMaxX - fabricMinX,
        height: fabricMaxY - fabricMinY,
        objects,
        isColliding: false,
      };
    }).filter(Boolean);

    setItems(sectionStats);
    setOriginalItems(JSON.parse(JSON.stringify(sectionStats)));
  }, [sections, canvasRef]);

  useEffect(() => {
    if (!dragState) return;

    const onPointerMove = (e) => {
      const screenDeltaX = e.clientX - dragState.startX;
      const screenDeltaY = e.clientY - dragState.startY;
      const fabricDeltaX = screenDeltaX / SCALE;
      const fabricDeltaY = screenDeltaY / SCALE;

      setItems(prev => prev.map(item => {
        if (item.id === dragState.id) {
          const rawMinX = dragState.initialMinX + fabricDeltaX;
          const rawMinY = dragState.initialMinY + fabricDeltaY;
          
          let snappedMinX = Math.round(rawMinX / GRID_SIZE) * GRID_SIZE;
          let snappedMinY = Math.round(rawMinY / GRID_SIZE) * GRID_SIZE;

          let isColliding = false;

          // Check collisions if on A4 page
          if (snappedMinX < STASH_START_X) {
            // Margin check
            if (
              snappedMinX < MARGIN ||
              snappedMinX + item.width > A4_W - MARGIN ||
              snappedMinY < MARGIN ||
              snappedMinY + item.height > A4_H - MARGIN
            ) {
              isColliding = true;
            }

            // Locked section check
            if (!isColliding) {
              const lockedItems = prev.filter(p => p.isLocked && p.id !== item.id && p.minX < STASH_START_X);
              for (const locked of lockedItems) {
                if (
                  snappedMinX < locked.minX + locked.width &&
                  snappedMinX + item.width > locked.minX &&
                  snappedMinY < locked.minY + locked.height &&
                  snappedMinY + item.height > locked.minY
                ) {
                  isColliding = true;
                  break;
                }
              }
            }
          }

          return {
            ...item,
            minX: snappedMinX,
            minY: snappedMinY,
            isColliding
          };
        }
        return item;
      }));
    };

    const onPointerUp = () => {
      setItems(prev => prev.map(item => {
        if (item.id === dragState.id && item.isColliding) {
          // Snap back to initial position if dropped while colliding
          return {
            ...item,
            minX: dragState.initialMinX,
            minY: dragState.initialMinY,
            isColliding: false
          };
        }
        return item;
      }));
      setDragState(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [dragState]);

  const handlePointerDown = (e, item) => {
    if (item.isLocked) return;
    e.preventDefault();
    setDragState({
      id: item.id,
      startX: e.clientX,
      startY: e.clientY,
      initialMinX: item.minX,
      initialMinY: item.minY,
    });
  };

  const applyLayout = () => {
    if (items.length === 0) {
      onClose();
      return;
    }

    const canvas = canvasRef.current;
    
    items.forEach(item => {
      const original = originalItems.find(o => o.id === item.id);
      if (!original) return;

      const isNowStashed = item.minX >= STASH_START_X;

      if (isNowStashed) {
        item.objects.forEach(obj => obj.set('visible', false));
      } else {
        item.objects.forEach(obj => obj.set('visible', true));
        
        const deltaX = item.minX - original.fabricMinX;
        const deltaY = item.minY - original.fabricMinY;

        if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
          item.objects.forEach(obj => {
            obj.set('left', obj.left + deltaX);
            obj.set('top', obj.top + deltaY);
            obj.setCoords();
          });
        }
      }
    });

    canvas.requestRenderAll();
    pushHistory();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-8">
      
      {/* Main Modal Container */}
      <div className="bg-white rounded-3xl shadow-[0_16px_64px_rgba(0,0,0,0.4)] flex flex-col max-h-full max-w-[95vw] overflow-hidden relative border border-gray-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Sparkles size={20} className="text-brand-orange" />
              Document Layout
            </h2>
            <p className="text-sm text-gray-500 font-medium mt-0.5">Drag sections to rearrange. Drop in the Stash Bin to hide.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content Body (Flex row) */}
        <div className="flex flex-1 overflow-auto bg-gray-100/50 p-6 gap-8 justify-center">
          
          {/* Miniature A4 Canvas */}
          <div className="flex flex-col items-center gap-3 relative" style={{ zIndex: (dragState && items.find(i => i.id === dragState.id)?.minX < STASH_START_X) ? 50 : 10 }}>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Page</span>
            <div 
              className="bg-white shadow-md relative ring-1 ring-gray-900/5"
              style={{ 
                width: MINI_W, 
                height: MINI_H,
                backgroundImage: `linear-gradient(to right, #f3f4f6 1px, transparent 1px), linear-gradient(to bottom, #f3f4f6 1px, transparent 1px)`,
                backgroundSize: `${VISUAL_GRID}px ${VISUAL_GRID}px`
              }}
            >
              {/* Margin Guides */}
              <div 
                className="absolute border-2 border-red-200/50 border-dashed pointer-events-none"
                style={{
                  left: MARGIN * SCALE,
                  top: MARGIN * SCALE,
                  right: MARGIN * SCALE,
                  bottom: MARGIN * SCALE,
                }}
              />

              {items.filter(item => item.minX < STASH_START_X).map(item => (
                <SectionBlock key={item.id} item={item} dragState={dragState} onPointerDown={handlePointerDown} />
              ))}
            </div>
          </div>

          {/* Stash Bin */}
          <div className="flex flex-col items-center gap-3 relative" style={{ zIndex: (dragState && items.find(i => i.id === dragState.id)?.minX >= STASH_START_X) ? 50 : 10 }}>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <ArchiveRestore size={14} /> Stash Bin
            </span>
            <div 
              className="bg-gray-200/50 shadow-inner rounded-xl relative border-2 border-dashed border-gray-300"
              style={{ 
                width: STASH_W * SCALE, 
                height: MINI_H,
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                <span className="text-gray-500 font-medium text-sm px-8 text-center">Drag sections here to temporarily hide them</span>
              </div>
              
              {items.filter(item => item.minX >= STASH_START_X).map(item => (
                <SectionBlock 
                  key={item.id} 
                  item={item} 
                  dragState={dragState} 
                  onPointerDown={handlePointerDown} 
                  isStashedVisual 
                />
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-between items-center">
          <span className="text-xs font-semibold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg opacity-0 transition-opacity" style={{ opacity: items.some(i => i.isColliding) ? 1 : 0 }}>
            Cannot overlap locked sections or margins!
          </span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
              Cancel
            </button>
            <button 
              onClick={applyLayout}
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-brand-orange hover:bg-[#E65100] text-white transition-all shadow-[0_4px_14px_0_rgba(255,107,0,0.39)] hover:shadow-[0_6px_20px_rgba(255,107,0,0.23)] hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
            >
              <CheckIcon /> Save & Continue
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// Sub-component for rendering the individual blocks
function SectionBlock({ item, dragState, onPointerDown, isStashedVisual }) {
  
  // If rendering inside the stash bin visually, we must offset its logical minX
  // because the stash bin div has its own coordinate system visually, 
  // but we are positioning absolute! 
  // Wait, no! Both the A4 page and Stash Bin are relative containers!
  // If item is in stash bin, its item.minX is >= STASH_START_X.
  // We need to subtract STASH_START_X so it positions correctly inside the Stash Bin relative container.
  const visualLeft = isStashedVisual 
    ? (item.minX - STASH_START_X) * SCALE
    : item.minX * SCALE;

  // Scale down the width visually if it's in the stash bin to prevent clipping
  const visualWidth = isStashedVisual 
    ? Math.min(item.width * SCALE, (STASH_W - 40) * SCALE)
    : item.width * SCALE;

  return (
    <div
      onPointerDown={(e) => onPointerDown(e, item)}
      className={`absolute flex flex-col items-center justify-center border transition-all duration-75 overflow-hidden
        ${item.isLocked 
          ? 'bg-blue-900/40 border-blue-900/20 cursor-not-allowed backdrop-blur-sm' 
          : item.isColliding
            ? 'bg-red-500/80 border-red-600 shadow-[0_0_20px_rgba(239,68,68,0.5)] z-[60] cursor-grabbing'
            : 'bg-blue-100/80 border-blue-300 hover:shadow-lg cursor-grab active:cursor-grabbing hover:bg-blue-200/90 backdrop-blur-sm'
        }
        ${dragState?.id === item.id && !item.isColliding ? 'z-50 shadow-2xl opacity-95 scale-[1.02]' : 'z-10'}
      `}
      style={{
        left: visualLeft,
        top: item.minY * SCALE,
        width: visualWidth,
        height: Math.max(item.height * SCALE, 20), // minimum height so very thin lines don't disappear
        borderRadius: 6,
        touchAction: 'none'
      }}
    >
      {item.isLocked && (
        <Lock size={12} className="absolute top-1.5 left-1.5 text-gray-800 opacity-60" />
      )}
      
      {!item.isLocked && (
        <div className="absolute top-2 left-2 flex gap-0.5 opacity-40">
          <div className="flex flex-col gap-0.5"><div className="w-0.5 h-0.5 bg-current rounded-full" /><div className="w-0.5 h-0.5 bg-current rounded-full" /></div>
          <div className="flex flex-col gap-0.5"><div className="w-0.5 h-0.5 bg-current rounded-full" /><div className="w-0.5 h-0.5 bg-current rounded-full" /></div>
        </div>
      )}
      
      <span className={`text-[11px] font-bold text-center px-2 pointer-events-none break-words line-clamp-2 leading-tight
        ${item.isColliding ? 'text-white' : item.isLocked ? 'text-gray-800' : 'text-blue-900'}
      `}>
        {item.sectionName}
      </span>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}
