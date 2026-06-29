import React, { useState } from 'react';
import { Database, AlertTriangle, PenSquare, X } from 'lucide-react';
import BindingModal from './BindingModal';
import { useEditor } from '../../context/EditorContext';
import { analyzeCanvasBindings, SCHEMA_DEF } from '../../schema/resumeSchema';

export default function DataBindingCard({ selectedObj, compact = false }) {
  const { canvasRef, pushHistory } = useEditor();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!selectedObj) return null;

  // For activeSelection, we allow setting the group parent/instance
  if (selectedObj.type === 'activeSelection') {
    const isTextGroup = selectedObj.getObjects().some(o => ['textbox', 'text', 'i-text'].includes(o.type));
    if (!isTextGroup) {
      return (
        <div className="mx-3 mt-3 p-3 bg-brand-orange/5 border border-brand-orange/20 rounded-xl">
          <p className="text-[10px] text-brand-orange leading-relaxed text-center">
            No text elements in selection. Group binding requires text elements.
          </p>
        </div>
      );
    }
    
    return (
      <div className="mx-3 mt-3 p-3 bg-[#2A2A30] border border-white/5 rounded-xl flex flex-col gap-2 shadow-sm shrink-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 text-white/80">
            <Database size={12} />
            <span className="text-[10px] font-bold tracking-wide uppercase">Group Binding</span>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full py-2 bg-[#34343A] hover:bg-brand-orange text-white text-[10px] font-bold rounded-lg transition-colors border border-white/5"
        >
          Set Group Parent
        </button>
        <p className="text-[9px] text-white/40 text-center leading-tight">
          Updates the parent category and instance for all text elements in the selection, preserving their individual fields.
        </p>

        {isModalOpen && (
          <BindingModal
            selectedObj={selectedObj}
            groupMode={true}
            onClose={() => setIsModalOpen(false)}
            onSave={(bindingData) => {
              const objs = selectedObj.getObjects();
              objs.forEach(obj => {
                if (!['textbox', 'text', 'i-text'].includes(obj.type)) return;
                const oldMeta = obj.customMeta || {};
                obj.set('customMeta', {
                  ...oldMeta,
                  bindParent: bindingData.bindParent,
                  bindInstanceId: bindingData.bindInstanceId
                  // Keep bindField intact
                });
              });
              canvasRef.current?.requestRenderAll();
              pushHistory();
              setIsModalOpen(false);
            }}
          />
        )}
      </div>
    );
  }

  // Disable if not a text element
  const isText = ['textbox', 'text', 'i-text'].includes(selectedObj.type);
  if (!isText) {
    return (
      <div className="mx-3 mt-3 p-3 bg-white/5 border border-white/10 rounded-xl">
        <p className="text-[10px] text-white/40 leading-relaxed text-center">
          Data binding is only available for text and list elements.
        </p>
      </div>
    );
  }

  const meta = selectedObj.customMeta || {};
  const isBound = !!meta.bindParent && !!meta.bindField;

  let warning = null;
  if (isBound && canvasRef.current) {
    const analysis = analyzeCanvasBindings(canvasRef.current);
    warning = analysis?.warnings.find(w => 
      w.parent === meta.bindParent && w.instanceId === (meta.bindInstanceId || 0)
    );
  }

  const removeBinding = () => {
    const newMeta = { ...meta };
    delete newMeta.bindParent;
    delete newMeta.bindInstanceId;
    delete newMeta.bindField;
    selectedObj.set('customMeta', newMeta);
    canvasRef.current?.requestRenderAll();
    pushHistory();
  };

  const handleSaveBinding = (bindingData) => {
    selectedObj.set('customMeta', { ...meta, ...bindingData });
    canvasRef.current?.requestRenderAll();
    pushHistory();
    setIsModalOpen(false);
  };

  const containerClass = compact 
    ? "px-3 pb-3 flex flex-col gap-2 shrink-0" 
    : "mx-3 my-3 p-3 bg-[#2A2A30] border border-white/5 rounded-xl flex flex-col gap-2 shadow-sm shrink-0";

  return (
    <>
      <div className={containerClass}>
        {!compact && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-white/80">
              <Database size={12} />
              <span className="text-[10px] font-bold tracking-wide uppercase">Data Binding</span>
            </div>
          </div>
        )}

        {!isBound ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full py-2 bg-[#34343A] hover:bg-brand-orange text-white text-[10px] font-bold rounded-lg transition-colors border border-white/5"
          >
            Add Binding
          </button>
        ) : (
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex items-center justify-between bg-[#1e1e22] border border-brand-orange/30 px-2 py-1.5 rounded-lg">
              <div className="flex flex-col">
                <span className="text-[9px] text-white/50 font-semibold">
                  {SCHEMA_DEF[meta.bindParent]?.label || meta.bindParent} 
                  {meta.bindInstanceId > 0 ? ` #${meta.bindInstanceId}` : ''}
                </span>
                <span className="text-[10px] text-brand-orange font-bold">
                  {SCHEMA_DEF[meta.bindParent]?.fields.find(f => f.id === meta.bindField)?.label || meta.bindField}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setIsModalOpen(true)} className="p-1 text-white/40 hover:text-white transition-colors" title="Edit">
                  <PenSquare size={12} />
                </button>
                <button onClick={removeBinding} className="p-1 text-white/40 hover:text-red-400 transition-colors" title="Remove">
                  <X size={12} />
                </button>
              </div>
            </div>

            {isBound && SCHEMA_DEF[meta.bindParent]?.fields.find(f => f.id === meta.bindField)?.isList && (
              <div className="mt-2 flex flex-col gap-1.5 border-t border-white/5 pt-2">
                <label className="text-[10px] text-white/50 font-bold uppercase">Display Style</label>
                <select
                  value={meta.displayStyle || 'bullets'}
                  onChange={e => {
                    const newMeta = { ...meta, displayStyle: e.target.value };
                    selectedObj.set('customMeta', newMeta);
                    canvasRef.current?.requestRenderAll();
                    pushHistory();
                  }}
                  className="w-full bg-[#1e1e22] border border-white/10 rounded px-2 py-1.5 text-[10px] text-white outline-none"
                >
                  <option value="bullets">Bullets</option>
                  <option value="badges">Badges (Underlined)</option>
                  <option value="comma">Comma-Separated</option>
                </select>

                {meta.displayStyle === 'badges' && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-white/50">Underline Color</span>
                    <input 
                      type="color" 
                      value={meta.badgeColor || '#FF6B00'} 
                      onChange={e => {
                        selectedObj.set('customMeta', { ...meta, badgeColor: e.target.value });
                        canvasRef.current?.requestRenderAll();
                        pushHistory();
                      }}
                      className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                    />
                  </div>
                )}
              </div>
            )}

            {warning && (
              <div className="flex items-start gap-1.5 mt-1 bg-red-500/10 p-2 rounded border border-red-500/20">
                <AlertTriangle size={12} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-[9px] text-red-200/80 leading-tight">
                  Missing required fields: <span className="font-bold text-red-300">{warning.missing.join(', ')}</span>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <BindingModal
          selectedObj={selectedObj}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveBinding}
        />
      )}
    </>
  );
}
