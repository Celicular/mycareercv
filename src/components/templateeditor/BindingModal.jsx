import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Database, Plus, CopyPlus, AlertCircle } from 'lucide-react';
import { SCHEMA_DEF, analyzeCanvasBindings } from '../../schema/resumeSchema';
import { useEditor } from '../../context/EditorContext';

export default function BindingModal({ selectedObj, onClose, onSave, initialBinding, groupMode = false }) {
  const { canvasRef } = useEditor();
  const [step, setStep] = useState(1);
  
  const isElementList = selectedObj?.customMeta?.bindingType === 'list';
  
  // State for selections
  const [parent, setParent] = useState(initialBinding?.parent || null);
  const [instanceId, setInstanceId] = useState(initialBinding?.instanceId || null);
  const [field, setField] = useState(initialBinding?.field || null);

  // Canvas analysis data
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    if (canvasRef.current) {
      setAnalysis(analyzeCanvasBindings(canvasRef.current));
    }
  }, [canvasRef]);

  const handleSave = (selectedField, customData = null) => {
    if (customData) {
      onSave({
        bindParent: customData.parent,
        bindInstanceId: customData.instanceId,
        bindField: selectedField
      });
      return;
    }
    onSave({
      bindParent: parent,
      bindInstanceId: instanceId,
      bindField: selectedField
    });
  };

  // Handle Step 1 -> 2/3
  const handleSelectParent = (key) => {
    setParent(key);
    setInstanceId(null);
    setField(null);
    if (SCHEMA_DEF[key].type === 'array') {
      setStep(2);
    } else {
      setInstanceId(0); // Objects use instance 0 implicitly
      if (groupMode) {
        handleSave(null, { parent: key, instanceId: 0 });
      } else {
        setStep(3);
      }
    }
  };

  // Handle Step 2 -> 3
  const handleSelectInstance = (id) => {
    setInstanceId(id);
    if (groupMode) {
      handleSave(null, { parent, instanceId: id });
    } else {
      setStep(3);
    }
  };

  const parents = Object.entries(SCHEMA_DEF).map(([key, def]) => ({ key, ...def }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#16161a] w-full max-w-xl rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#1c1c21]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-orange/10 rounded-lg text-brand-orange">
              <Database size={18} />
            </div>
            <div>
              <h2 className="text-white font-semibold leading-none mb-1 tracking-wider">Data Binding</h2>
              <div className="flex items-center gap-1.5 text-[11px] text-white/50 font-medium">
                <span className={step >= 1 ? 'text-white' : ''}>Category</span>
                <ChevronRight size={10} />
                <span className={step >= 2 ? 'text-white' : ''}>Instance</span>
                <ChevronRight size={10} />
                <span className={step >= 3 ? 'text-white' : ''}>Field</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto editor-panel-scroll">
          
          {/* STEP 1: SELECT PARENT */}
          {step === 1 && (
            <div className="animate-in slide-in-from-right-4">
              <h3 className="text-sm font-semibold text-white/90 mb-4 tracking-wider">Select Data Category</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {parents.map(p => (
                  <button
                    key={p.key}
                    onClick={() => handleSelectParent(p.key)}
                    className="flex flex-col items-start gap-1 p-4 rounded-xl bg-[#2A2A30] border border-white/5 hover:border-brand-orange hover:bg-[#34343A] transition-all text-left group"
                  >
                    <span className="text-xs font-semibold text-white/90 group-hover:text-brand-orange">{p.label}</span>
                    <span className="text-[10px] text-white/40">{p.type === 'array' ? 'List of entries' : 'Single entry'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: SELECT INSTANCE (Arrays only) */}
          {step === 2 && parent && SCHEMA_DEF[parent].type === 'array' && (
            <div className="animate-in slide-in-from-right-4">
              <button onClick={() => setStep(1)} className="text-[11px] text-white/40 hover:text-white mb-4 flex items-center gap-1">
                ← Back to Categories
              </button>
              
              <h3 className="text-sm font-semibold text-white/90 mb-4 tracking-wider">
                Which {SCHEMA_DEF[parent].label} is this?
              </h3>

              <div className="flex flex-col gap-3">
                {/* Create New Option */}
                <button
                  onClick={() => {
                    const currentMax = analysis?.counts[parent] || 0;
                    handleSelectInstance(currentMax + 1);
                  }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-brand-orange/10 border border-brand-orange/30 hover:bg-brand-orange/20 transition-all text-left"
                >
                  <div className="p-2 bg-brand-orange/20 rounded-lg text-brand-orange">
                    <Plus size={16} />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-brand-orange">Create New Entry</span>
                    <span className="block text-[10px] text-brand-orange/70">Start a new group for {SCHEMA_DEF[parent].label}</span>
                  </div>
                </button>

                {/* Existing Instances */}
                {analysis?.instances[parent] && Object.keys(analysis.instances[parent]).length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2 px-1">Or add to existing</p>
                    <div className="grid grid-cols-1 gap-2">
                      {Object.entries(analysis.instances[parent]).map(([idStr, data]) => {
                        const id = Number(idStr);
                        const boundCount = data.boundFields.length;
                        const reqCount = SCHEMA_DEF[parent].fields.filter(f => f.required).length;
                        
                        return (
                          <button
                            key={id}
                            onClick={() => handleSelectInstance(id)}
                            className="flex items-center justify-between p-4 rounded-xl bg-[#2A2A30] border border-white/5 hover:border-white/30 hover:bg-[#34343A] transition-all text-left group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white/5 rounded-lg text-white/40 group-hover:text-white">
                                <CopyPlus size={16} />
                              </div>
                              <div>
                                <span className="block text-xs font-semibold text-white/90 group-hover:text-white">
                                  {SCHEMA_DEF[parent].label} #{id}
                                </span>
                                <span className="block text-[10px] text-white/40">
                                  {boundCount} fields currently bound
                                </span>
                              </div>
                            </div>
                            {boundCount < reqCount && (
                              <div className="flex items-center gap-1 text-red-400 text-[10px] bg-red-400/10 px-2 py-1 rounded-md">
                                <AlertCircle size={10} />
                                Incomplete
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: SELECT FIELD */}
          {step === 3 && parent && (
            <div className="animate-in slide-in-from-right-4">
              <button 
                onClick={() => setStep(SCHEMA_DEF[parent].type === 'array' ? 2 : 1)} 
                className="text-[11px] text-white/40 hover:text-white mb-4 flex items-center gap-1"
              >
                ← Back to {SCHEMA_DEF[parent].type === 'array' ? 'Instances' : 'Categories'}
              </button>
              
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-white/90 tracking-wider">
                  Select Field to Bind
                </h3>
                <p className="text-[11px] text-white/50">
                  Binding to: <strong className="text-white/80">{SCHEMA_DEF[parent].label}</strong> 
                  {instanceId > 0 ? ` #${instanceId}` : ''}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SCHEMA_DEF[parent].fields.map(f => {
                  const isAlreadyBound = analysis?.instances[parent]?.[instanceId]?.boundFields.includes(f.id);
                  const typeMismatch = Boolean(f.isList) !== Boolean(isElementList);

                  return (
                    <button
                      key={f.id}
                      onClick={() => handleSave(f.id)}
                      disabled={typeMismatch}
                      className={`flex flex-col items-start p-3 rounded-xl border transition-all text-left
                        ${typeMismatch ? 'border-white/5 bg-[#1a1a1f] opacity-50 cursor-not-allowed' :
                          f.required ? 'border-brand-orange/30 bg-brand-orange/5 hover:bg-brand-orange/10' : 'border-white/5 bg-[#2A2A30] hover:bg-[#34343A] hover:border-white/20'}
                      `}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-semibold text-white/90">{f.label}</span>
                        {f.required && !typeMismatch && (
                          <span className="text-[9px] font-bold text-brand-orange tracking-wider uppercase">Required</span>
                        )}
                      </div>
                      <span className="text-[10px] text-white/40 font-mono">{f.id}</span>
                      
                      {typeMismatch ? (
                        <div className="mt-2 text-[9px] text-red-400 bg-red-400/10 px-2 py-0.5 rounded w-fit">
                          {f.isList ? 'Requires a Bullet List element' : 'Requires a normal Text element'}
                        </div>
                      ) : isAlreadyBound ? (
                        <div className="mt-2 text-[9px] text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded w-fit">
                          Already bound in this instance
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
