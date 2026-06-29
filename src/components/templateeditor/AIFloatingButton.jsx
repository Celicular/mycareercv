import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { useAuth } from '../../context/AuthContext';
import AIFieldPopup from './AIFieldPopup';

/**
 * Renders a floating "✨ AI" badge at the bottom-left corner of the
 * currently selected canvas object, but only if that object has a
 * bindParent + bindField on its customMeta (i.e. it's a bound field).
 *
 * Must be placed inside the same relative-positioned container as the canvas.
 */
export default function AIFloatingButton() {
  const { selectedObj, zoom, resumeData, rebindCanvas } = useEditor();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [pos, setPos] = useState(null); // { left, top }
  const [showPopup, setShowPopup] = useState(false);
  const rafRef = useRef(null);

  const updatePos = useCallback(() => {
    if (!selectedObj || isAdmin) {
      setPos(null);
      return;
    }
    const meta = selectedObj.customMeta;
    if (!meta?.bindParent || !meta?.bindField) {
      setPos(null);
      return;
    }

    // getBoundingRect returns coords in canvas pixel space (already accounting for zoom)
    const br = selectedObj.getBoundingRect(true, true);

    // The canvas element itself has a CSS transform applied for zoom.
    // We need the visual position on the page — getBoundingRect is in canvas units,
    // so multiply by zoom to get screen-space pixels within the scrollable container.
    setPos({
      left: br.left * zoom,
      top: (br.top + br.height) * zoom, // bottom edge
    });
  }, [selectedObj, zoom, isAdmin]);

  // Update on every animation frame while something is selected,
  // so dragging/resizing keeps the badge locked to the object.
  useEffect(() => {
    const tick = () => {
      updatePos();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [updatePos]);

  if (!pos || !selectedObj || isAdmin) return null;

  const meta = selectedObj.customMeta;
  if (!meta?.bindParent || !meta?.bindField) return null;

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowPopup(true);
        }}
        style={{
          position: 'absolute',
          left: pos.left,
          top: pos.top + 4,
          zIndex: 40,
          pointerEvents: 'auto',
        }}
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-orange text-white text-[10px] font-bold shadow-lg shadow-brand-orange/40 hover:bg-[#E65100] transition-colors select-none border border-white/20 backdrop-blur-sm"
        title="Open AI Assistant for this field"
      >
        <Sparkles size={10} />
        AI
      </button>

      {showPopup && (
        <AIFieldPopup
          bindParent={meta.bindParent}
          bindField={meta.bindField}
          bindInstanceId={meta.bindInstanceId ?? 1}
          resumeData={resumeData}
          onClose={() => setShowPopup(false)}
          onApply={rebindCanvas}
        />
      )}
    </>
  );
}
