import React, { useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronUp, Eye, Save, X } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { SCHEMA_DEF } from '../../schema/resumeSchema';
import BindingModal from './BindingModal';

/**
 * IngestionReviewPanel — Collapsible sidebar panel for reviewing
 * low-confidence binding assignments after template ingestion.
 *
 * Shows flagged elements with confidence scores, lets users
 * change bindings, and provides a "Save & Finish" action.
 */
export default function IngestionReviewPanel() {
  const {
    ingestionReview,
    setIngestionReview,
    canvasRef,
    pushHistory,
    templateMeta,
    setIsDirty,
  } = useEditor();

  const [collapsed, setCollapsed] = useState(false);
  const [editingObj, setEditingObj] = useState(null);
  const [reviewedIds, setReviewedIds] = useState(new Set());

  if (!ingestionReview || !ingestionReview.flaggedIds?.length) return null;

  const { confidences, flaggedIds } = ingestionReview;
  const unreviewedCount = flaggedIds.filter(id => !reviewedIds.has(id)).length;

  // Get canvas objects mapped by their ingestion element ID
  const getCanvasObjectForId = (elementId) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getObjects().find((obj, idx) => {
      // Match by index since ingestion elements are added in order
      return `el_${String(idx + 1).padStart(3, '0')}` === elementId;
    });
  };

  // Select an element on the canvas
  const selectElement = (elementId) => {
    const canvas = canvasRef.current;
    const obj = getCanvasObjectForId(elementId);
    if (obj && canvas) {
      canvas.setActiveObject(obj);
      canvas.requestRenderAll();
    }
  };

  // Mark an element as reviewed
  const markReviewed = (elementId) => {
    setReviewedIds(prev => {
      const next = new Set(prev);
      next.add(elementId);
      return next;
    });

    // Remove the orange highlight from the canvas object
    const obj = getCanvasObjectForId(elementId);
    if (obj) {
      obj.set({
        stroke: '',
        strokeWidth: 0,
        strokeDashArray: null,
      });
      canvasRef.current?.requestRenderAll();
    }
  };

  // Open binding editor for an element
  const openBindingEditor = (elementId) => {
    const obj = getCanvasObjectForId(elementId);
    if (obj) {
      setEditingObj(obj);
      selectElement(elementId);
    }
  };

  // Save binding from modal
  const handleSaveBinding = (bindingData) => {
    if (editingObj) {
      const meta = editingObj.customMeta || {};
      editingObj.set('customMeta', { ...meta, ...bindingData });
      canvasRef.current?.requestRenderAll();
      pushHistory();
    }
    setEditingObj(null);
  };

  // Finish review — strip ingestion metadata and mark as done
  const finishReview = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Remove all orange highlights
    canvas.getObjects().forEach(obj => {
      if (obj.stroke === '#FF8C00') {
        obj.set({
          stroke: '',
          strokeWidth: 0,
          strokeDashArray: null,
        });
      }
    });

    canvas.requestRenderAll();
    setIngestionReview(null);
    setIsDirty(true);
    pushHistory();
  };

  // Get confidence colour
  const getConfidenceColor = (conf) => {
    if (conf >= 0.7) return 'text-emerald-400 bg-emerald-400/10';
    if (conf >= 0.5) return 'text-amber-400 bg-amber-400/10';
    return 'text-red-400 bg-red-400/10';
  };

  // Get the binding label for an element
  const getBindingLabel = (elementId) => {
    const obj = getCanvasObjectForId(elementId);
    if (!obj) return 'Unknown';
    const meta = obj.customMeta || {};
    if (meta.isStatic) return 'Static (no binding)';
    if (!meta.bindParent) return 'Unbound';

    const parentDef = SCHEMA_DEF[meta.bindParent];
    const fieldDef = parentDef?.fields.find(f => f.id === meta.bindField);
    return `${parentDef?.label || meta.bindParent} → ${fieldDef?.label || meta.bindField || '?'}`;
  };

  // Get element text preview
  const getElementText = (elementId) => {
    const obj = getCanvasObjectForId(elementId);
    if (!obj) return '—';
    const text = obj.text || obj.customMeta?.friendlyLabel || '';
    return text.slice(0, 40) + (text.length > 40 ? '…' : '') || '(shape)';
  };

  return (
    <>
      <div className={`
        absolute right-64 top-0 z-20 w-72 max-h-full
        bg-[#16161a]/95 backdrop-blur-xl border-l border-white/5
        flex flex-col shadow-2xl transition-all duration-300
        ${collapsed ? 'h-auto' : 'h-full'}
      `}>
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors shrink-0"
          onClick={() => setCollapsed(!collapsed)}
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <AlertTriangle size={14} className="text-amber-400" />
              {unreviewedCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center text-[7px] font-bold text-white">
                  {unreviewedCount}
                </span>
              )}
            </div>
            <span className="text-xs font-bold text-white/80 uppercase tracking-wider">
              Review Bindings
            </span>
          </div>
          {collapsed ? <ChevronDown size={14} className="text-white/40" /> : <ChevronUp size={14} className="text-white/40" />}
        </div>

        {!collapsed && (
          <>
            {/* Info */}
            <div className="px-4 py-2 bg-amber-500/5 border-b border-white/5 shrink-0">
              <p className="text-[10px] text-amber-200/70 leading-relaxed">
                {unreviewedCount} element{unreviewedCount !== 1 ? 's' : ''} need review.
                The AI was uncertain about these bindings.
              </p>
            </div>

            {/* Flagged elements list */}
            <div className="flex-1 overflow-y-auto editor-panel-scroll">
              {flaggedIds.map((elementId) => {
                const conf = confidences[elementId] || 0;
                const isReviewed = reviewedIds.has(elementId);

                return (
                  <div
                    key={elementId}
                    className={`
                      px-4 py-3 border-b border-white/5 transition-all
                      ${isReviewed ? 'opacity-50 bg-white/2' : 'hover:bg-white/5'}
                    `}
                  >
                    {/* Element text preview */}
                    <p className="text-[11px] text-white/80 font-medium truncate mb-1">
                      {getElementText(elementId)}
                    </p>

                    {/* Current binding */}
                    <p className="text-[10px] text-white/40 truncate mb-2">
                      {getBindingLabel(elementId)}
                    </p>

                    {/* Confidence + actions */}
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${getConfidenceColor(conf)}`}>
                        {Math.round(conf * 100)}% conf.
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => selectElement(elementId)}
                          className="p-1 text-white/30 hover:text-white transition-colors"
                          title="Select on canvas"
                        >
                          <Eye size={11} />
                        </button>
                        <button
                          onClick={() => openBindingEditor(elementId)}
                          className="px-2 py-1 text-[9px] font-semibold bg-[#2A2A30] hover:bg-brand-orange/20 text-white/60 hover:text-brand-orange rounded-md transition-all"
                          disabled={isReviewed}
                        >
                          Change
                        </button>
                        <button
                          onClick={() => markReviewed(elementId)}
                          disabled={isReviewed}
                          className={`p-1 rounded-md transition-all ${
                            isReviewed
                              ? 'text-emerald-400 bg-emerald-400/10'
                              : 'text-white/30 hover:text-emerald-400 hover:bg-emerald-400/10'
                          }`}
                          title={isReviewed ? 'Reviewed' : 'Mark as reviewed'}
                        >
                          <Check size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-white/10 shrink-0">
              <button
                onClick={finishReview}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold transition-all border border-emerald-500/20"
              >
                <Save size={13} />
                {unreviewedCount === 0 ? 'Looks Good — Save Template' : `Finish Review (${unreviewedCount} remaining)`}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Binding editor modal */}
      {editingObj && (
        <BindingModal
          selectedObj={editingObj}
          onClose={() => setEditingObj(null)}
          onSave={handleSaveBinding}
        />
      )}
    </>
  );
}
