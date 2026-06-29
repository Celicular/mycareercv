import React, { useState, useEffect } from 'react';
import { fabric } from 'fabric';
import { useEditor } from '../../context/EditorContext';
import { useAuth } from '../../context/AuthContext';
import { useSections } from '../../hooks/useSections';
import DataBindingCard from './DataBindingCard';
import SectionPresetModal from './SectionPresetModal';
import {
  Layers, LayoutTemplate,
  Lock, Unlock, Trash2, ChevronUp, ChevronDown,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Boxes, Layers2, Plus, Sparkles
} from 'lucide-react';
import AIFieldPopup from './AIFieldPopup';

// ── Shared UI primitives ──────────────────────────────────────────────────────
function SectionHeader({ label }) {
  return <p className="text-[9px] font-bold text-white/25 uppercase tracking-[0.14em] px-3 pt-3 pb-1">{label}</p>;
}

function Row({ label, children }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1">
      <span className="text-[10px] text-white/35 shrink-0 w-16">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function NumInput({ value, onChange, min, max, step = 1, suffix }) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={Math.round(value ?? 0)}
        min={min} max={max} step={step}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full bg-[#2A2A30] border border-white/5 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-brand-orange shadow-inner transition-colors text-right tabular-nums"
      />
      {suffix && <span className="text-[10px] text-white/30 shrink-0">{suffix}</span>}
    </div>
  );
}

function ColorInput({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-7 h-7 rounded-lg overflow-hidden border border-white/15 shrink-0">
        <input
          type="color"
          value={value && value !== 'transparent' ? value : '#000000'}
          onChange={e => onChange(e.target.value)}
          className="absolute inset-0 w-12 h-12 -top-1 -left-1 cursor-pointer opacity-0"
        />
        <div className="w-full h-full rounded-lg" style={{ background: value || '#000000' }} />
      </div>
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="flex-1 bg-[#2A2A30] border border-white/5 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-brand-orange shadow-inner transition-colors font-mono"
        maxLength={9}
      />
    </div>
  );
}

function SelectInput({ value, onChange, options }) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-[#2A2A30] border border-white/5 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-brand-orange shadow-inner transition-colors"
    >
      {options.map(o => (
        <option key={o.value ?? o} value={o.value ?? o} className="bg-[#1e1e22]">{o.label ?? o}</option>
      ))}
    </select>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'style',  label: 'Style',   icon: LayoutTemplate },
  { id: 'layout', label: 'Layout',  icon: Layers },
];

const GOOGLE_FONTS = ['Inter', 'Outfit', 'Roboto', 'Roboto Mono', 'Montserrat', 'Playfair Display', 'Lora', 'Open Sans', 'Lato', 'Poppins', 'Raleway', 'Merriweather', 'Source Serif Pro'];
const FONT_WEIGHTS = ['100','200','300','400','500','600','700','800','900'];
const ALIGN_OPTIONS = ['left','center','right','justify'];

// ── Main PropertiesPanel ──────────────────────────────────────────────────────
export default function PropertiesPanel() {
  const { selectedObj, canvasRef, pushHistory, resumeData, rebindCanvas } = useEditor();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState('style');
  const [, forceUpdate] = useState(0);
  const [showAIPopup, setShowAIPopup] = useState(false);
  
  // New section input state
  const [newSectionId, setNewSectionId] = useState('');
  const [isAddingSection, setIsAddingSection] = useState(false);

  const tabs = isAdmin ? [...TABS, { id: 'section', label: 'Section', icon: Layers2 }] : TABS;

  // Re-render when object changes
  useEffect(() => {
    forceUpdate(n => n + 1);
    if (!isAdmin && tab === 'section') setTab('style');
  }, [selectedObj, isAdmin, tab]);

  const getProp = (key) => {
    if (!selectedObj) return undefined;
    if (selectedObj.type === 'activeSelection') {
      const first = selectedObj.getObjects().find(o => o[key] !== undefined);
      return first ? first[key] : undefined;
    }
    return selectedObj[key];
  };

  // Generic property setter
  const set = (key, val) => {
    if (!selectedObj) return;
    
    if (selectedObj.type === 'activeSelection') {
      const baseVal = getProp(key);
      const isNumericProp = typeof val === 'number';
      const delta = isNumericProp && typeof baseVal === 'number' ? val - baseVal : null;

      const objs = selectedObj.getObjects();
      canvasRef.current?.discardActiveObject();

      objs.forEach(obj => {
        const isTextOnlyProp = ['fontSize', 'fontWeight', 'fontFamily', 'fontStyle', 'textAlign', 'lineHeight'].includes(key);
        if (isTextOnlyProp && !['textbox', 'text', 'i-text'].includes(obj.type)) return;
        
        if (delta !== null && typeof obj[key] === 'number' && key !== 'rx' && key !== 'ry' && key !== 'angle') {
           obj.set(key, obj[key] + delta);
        } else {
           obj.set(key, val);
        }
        obj.setCoords();
      });

      const sel = new fabric.ActiveSelection(objs, { canvas: canvasRef.current });
      canvasRef.current?.setActiveObject(sel);
    } else {
      selectedObj.set(key, val);
    }
    canvasRef.current?.requestRenderAll();
    forceUpdate(n => n + 1);
    pushHistory();
  };

  const isText = selectedObj && (
    ['textbox', 'text', 'i-text'].includes(selectedObj.type) ||
    (selectedObj.type === 'activeSelection' && selectedObj.getObjects().some(o => ['textbox', 'text', 'i-text'].includes(o.type)))
  );
  const isShape = selectedObj && (
    ['rect', 'circle', 'ellipse', 'triangle'].includes(selectedObj.type) ||
    (selectedObj.type === 'activeSelection' && selectedObj.getObjects().some(o => ['rect', 'circle', 'ellipse', 'triangle'].includes(o.type)))
  );

  const setMeta = (key, val) => {
    if (!selectedObj) return;
    
    const isSectionWideProp = key === 'sectionName' || key === 'sectionOrder' || key === 'isSectionLocked';
    const activeSectionIds = new Set();

    if (selectedObj.type === 'activeSelection') {
      selectedObj.getObjects().forEach(obj => {
        obj.customMeta = { ...(obj.customMeta || {}), [key]: val };
        if (isSectionWideProp && obj.customMeta.sectionId) {
          activeSectionIds.add(obj.customMeta.sectionId);
        }
      });
    } else {
      selectedObj.customMeta = { ...(selectedObj.customMeta || {}), [key]: val };
      if (isSectionWideProp && selectedObj.customMeta.sectionId) {
        activeSectionIds.add(selectedObj.customMeta.sectionId);
      }
    }

    // Sync section-wide properties to all other elements in the same section
    if (isSectionWideProp && activeSectionIds.size > 0 && canvasRef.current) {
      canvasRef.current.getObjects().forEach(obj => {
        if (obj.customMeta?.sectionId && activeSectionIds.has(obj.customMeta.sectionId)) {
          obj.customMeta = { ...obj.customMeta, [key]: val };
        }
      });
    }

    canvasRef.current?.requestRenderAll();
    forceUpdate(n => n + 1);
    pushHistory();
  };

  const getMeta = (key) => {
    if (!selectedObj) return undefined;
    if (selectedObj.type === 'activeSelection') {
      const first = selectedObj.getObjects().find(o => o.customMeta?.[key] !== undefined);
      return first?.customMeta?.[key];
    }
    return selectedObj.customMeta?.[key];
  };

  // Extract unique sections from canvas for dropdown
  const canvasSections = [];
  if (canvasRef.current) {
    const map = new Map();
    canvasRef.current.getObjects().forEach(o => {
      if (o.customMeta?.sectionId && !map.has(o.customMeta.sectionId)) {
        map.set(o.customMeta.sectionId, o.customMeta.sectionName || o.customMeta.sectionId);
      }
    });
    map.forEach((name, id) => canvasSections.push({ value: id, label: name }));
  }

  // ── Placeholder panel ─────────────────────────────────────────────────────
  if (!selectedObj) {
    return (
      <aside className="w-[320px] shrink-0 h-full bg-[#16161a] border-l border-white/5 flex flex-col">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-white/5">
          <LayoutTemplate size={14} className="text-white/25" />
          <span className="text-xs font-semibold text-white/25">Properties</span>
        </div>
        <div className="flex-1 flex items-center justify-center px-6 text-center">
          <p className="text-xs text-white/20 leading-relaxed">Select an element on the canvas to edit its properties</p>
        </div>
      </aside>
    );
  }

  return (
    <>
      <aside className="w-[320px] shrink-0 h-full bg-[#16161a] border-l border-white/5 flex flex-col overflow-y-auto overflow-x-hidden editor-panel-scroll">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-white/5 shrink-0">
        <div>
          <p className="text-[10px] font-bold text-brand-orange uppercase tracking-widest">
            {selectedObj.customMeta?.friendlyLabel || selectedObj.type}
          </p>
          <p className="text-[9px] text-white/25 font-mono">{selectedObj.type}</p>
        </div>
        <div className="flex items-center gap-1">
          {/* AI Assistant button — shown for non-admins on bound elements */}
          {!isAdmin && selectedObj.customMeta?.bindParent && selectedObj.customMeta?.bindField && (
            <button
              onClick={() => setShowAIPopup(true)}
              title="AI Assistant"
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-brand-orange/15 hover:bg-brand-orange/25 text-brand-orange border border-brand-orange/30 text-[10px] font-bold transition-all"
            >
              <Sparkles size={11} /> AI
            </button>
          )}
          {/* Select all in section */}
          {selectedObj.customMeta?.sectionGroupId && (
            <button
              title="Select all elements in this section"
              onClick={() => {
                const gid = selectedObj.customMeta.sectionGroupId;
                const all = canvasRef.current?.getObjects().filter(
                  o => o.customMeta?.sectionGroupId === gid
                ) || [];
                if (all.length > 1) {
                  const sel = new fabric.ActiveSelection(all, { canvas: canvasRef.current });
                  canvasRef.current.setActiveObject(sel);
                  canvasRef.current.requestRenderAll();
                }
              }}
              className="p-1.5 rounded-lg bg-[#2A2A30] hover:bg-brand-orange/15 text-white/60 hover:text-brand-orange shadow-sm transition-all"
            >
              <Boxes size={12} />
            </button>
          )}
          {/* Lock / Unlock */}
          <button
            onClick={() => {
              const isLocked = !!selectedObj.customMeta?.locked;
              const next     = !isLocked;
              // Toggle individual movement/transform locks — never touch evented
              // so the object stays clickable and can always be unlocked.
              selectedObj.set({
                lockMovementX:  next,
                lockMovementY:  next,
                lockScalingX:   next,
                lockScalingY:   next,
                lockRotation:   next,
                hasControls:    !next,
              });
              selectedObj.customMeta = { ...(selectedObj.customMeta || {}), locked: next };
              canvasRef.current?.requestRenderAll();
              forceUpdate(n => n + 1);
              pushHistory();
            }}
            className={`p-1.5 rounded-lg shadow-sm transition-all ${
              selectedObj.customMeta?.locked
                ? 'bg-brand-orange/15 text-brand-orange border border-brand-orange/30'
                : 'bg-[#2A2A30] hover:bg-[#34343A] text-white/60 hover:text-white'
            }`}
            title={selectedObj.customMeta?.locked ? 'Unlock element' : 'Lock element'}
          >
            {selectedObj.customMeta?.locked ? <Lock size={12} /> : <Unlock size={12} />}
          </button>
          {/* Delete */}
          <button
            onClick={() => { canvasRef.current?.remove(selectedObj); canvasRef.current?.requestRenderAll(); pushHistory(); }}
            className="p-1.5 rounded-lg bg-[#2A2A30] hover:bg-red-500/15 text-white/60 hover:text-red-400 shadow-sm transition-all"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 border-b border-white/5">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[9px] font-bold uppercase tracking-widest transition-all
              ${tab === t.id ? 'text-brand-orange border-b-2 border-brand-orange bg-[#2A2A30]' : 'text-white/40 hover:text-white/80 border-b-2 border-transparent hover:bg-white/5'}`}
          >
            <t.icon size={12} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Panel body ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto editor-panel-scroll">

        {/* ══ STYLE TAB ═══════════════════════════════════════════════════ */}
        {tab === 'style' && (
          <div className="pb-4">
            {/* Text properties */}
            {isText && (
              <>
                <SectionHeader label="Typography" />
                <Row label="Font">
                  <SelectInput
                    value={getProp('fontFamily') || 'Inter'}
                    onChange={v => set('fontFamily', v)}
                    options={GOOGLE_FONTS.map(f => ({ value: f, label: f }))}
                  />
                </Row>
                <Row label="Size">
                  <NumInput value={getProp('fontSize')} onChange={v => set('fontSize', v)} min={6} max={200} />
                </Row>
                <Row label="Weight">
                  <SelectInput
                    value={String(getProp('fontWeight') || '400')}
                    onChange={v => set('fontWeight', v)}
                    options={FONT_WEIGHTS.map(w => ({ value: w, label: w }))}
                  />
                </Row>
                <Row label="Style">
                  <SelectInput
                    value={getProp('fontStyle') || 'normal'}
                    onChange={v => set('fontStyle', v)}
                    options={['normal','italic','oblique'].map(v => ({ value: v, label: v }))}
                  />
                </Row>
                <Row label="Align">
                  <div className="flex gap-1">
                    {ALIGN_OPTIONS.map(a => {
                      const Icon = { left: AlignLeft, center: AlignCenter, right: AlignRight, justify: AlignJustify }[a];
                      const titleMap = { left: 'Align Left', center: 'Align Center', right: 'Align Right', justify: 'Justify' };
                      return (
                        <button key={a} onClick={() => set('textAlign', a)} title={titleMap[a]}
                          className={`flex-1 flex items-center justify-center py-1.5 rounded-lg transition-all ${getProp('textAlign') === a ? 'bg-brand-orange text-white shadow-md' : 'bg-[#2A2A30] text-white/60 hover:text-white hover:bg-[#34343A] shadow-sm'}`}>
                          <Icon size={11} />
                        </button>
                      );
                    })}
                  </div>
                </Row>
                <Row label="Line H">
                  <NumInput value={getProp('lineHeight')} onChange={v => set('lineHeight', v)} step={0.1} min={0.8} max={4} />
                </Row>
                <Row label="Color">
                  <ColorInput value={getProp('fill')} onChange={v => set('fill', v)} />
                </Row>
              </>
            )}

            {/* Fill color (shapes) */}
            {!isText && (
              <>
                <SectionHeader label="Fill" />
                <Row label="Color">
                  <ColorInput value={getProp('fill')} onChange={v => set('fill', v)} />
                </Row>
              </>
            )}

            {/* Stroke */}
            <SectionHeader label="Stroke" />
            <Row label="Color">
              <ColorInput value={getProp('stroke') || '#000000'} onChange={v => set('stroke', v)} />
            </Row>
            <Row label="Width">
              <NumInput value={getProp('strokeWidth') || 0} onChange={v => set('strokeWidth', v)} min={0} max={20} />
            </Row>

            {/* Border radius for Rects */}
            {isShape && (selectedObj.type === 'rect' || (selectedObj.type === 'activeSelection' && selectedObj.getObjects().some(o => o.type === 'rect'))) && (
              <>
                <SectionHeader label="Border Radius" />
                <Row label="Radius">
                  <NumInput value={getProp('rx') || 0} onChange={v => { set('rx', v); set('ry', v); }} min={0} max={100} suffix="px" />
                </Row>
              </>
            )}

            {/* Opacity */}
            <SectionHeader label="Appearance" />
            <Row label="Opacity">
              <div className="flex items-center gap-2">
                <input type="range" min={0} max={1} step={0.01}
                  value={getProp('opacity') ?? 1}
                  onChange={e => set('opacity', parseFloat(e.target.value))}
                  className="flex-1 accent-brand-orange h-1.5"
                />
                <span className="text-[10px] text-white/40 tabular-nums w-8 text-right">
                  {Math.round((getProp('opacity') ?? 1) * 100)}%
                </span>
              </div>
            </Row>
          </div>
        )}

        {/* ══ LAYOUT TAB ══════════════════════════════════════════════════ */}
        {tab === 'layout' && (
          <div className="pb-4">
            <SectionHeader label="Position" />
            <Row label="X"><NumInput value={getProp('left')} onChange={v => set('left', v)} suffix="px" /></Row>
            <Row label="Y"><NumInput value={getProp('top')}  onChange={v => set('top', v)}  suffix="px" /></Row>

            <SectionHeader label="Size" />
            <Row label="W"><NumInput value={getProp('width')  * (getProp('scaleX') || 1)} onChange={v => set('scaleX', v / (getProp('width')  || 1))} suffix="px" min={1} /></Row>
            <Row label="H"><NumInput value={getProp('height') * (getProp('scaleY') || 1)} onChange={v => set('scaleY', v / (getProp('height') || 1))} suffix="px" min={1} /></Row>

            <SectionHeader label="Transform" />
            <Row label="Rotate"><NumInput value={getProp('angle') || 0} onChange={v => set('angle', v)} min={-360} max={360} suffix="°" /></Row>

            <SectionHeader label="Layer Order" />
            <div className="px-3 grid grid-cols-2 gap-1.5 pt-1">
              {[
                { label: 'To Front', icon: ChevronUp,   action: () => canvasRef.current?.bringToFront(selectedObj) },
                { label: 'Forward',  icon: ChevronUp,   action: () => canvasRef.current?.bringForward(selectedObj) },
                { label: 'Backward', icon: ChevronDown, action: () => canvasRef.current?.sendBackwards(selectedObj) },
                { label: 'To Back',  icon: ChevronDown, action: () => canvasRef.current?.sendToBack(selectedObj) },
              ].map(({ label, icon: Icon, action }) => (
                <button key={label} onClick={() => { action(); canvasRef.current?.requestRenderAll(); pushHistory(); }}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#2A2A30] hover:bg-[#34343A] text-white/70 hover:text-white text-[10px] shadow-sm font-semibold transition-all">
                  <Icon size={11} /> {label}
                </button>
              ))}
            </div>

            <SectionHeader label="Flip" />
            <div className="px-3 grid grid-cols-2 gap-1.5 pt-1">
              <button onClick={() => set('flipX', !selectedObj.flipX)} className="px-2.5 py-2 rounded-xl bg-[#2A2A30] hover:bg-[#34343A] text-white/70 hover:text-white shadow-sm text-[10px] font-semibold transition-all">Flip H</button>
              <button onClick={() => set('flipY', !selectedObj.flipY)} className="px-2.5 py-2 rounded-xl bg-[#2A2A30] hover:bg-[#34343A] text-white/70 hover:text-white shadow-sm text-[10px] font-semibold transition-all">Flip V</button>
            </div>
          </div>
        )}

        {/* ══ SECTION TAB (ADMIN ONLY) ═══════════════════════════════════ */}
        {isAdmin && tab === 'section' && (
          <div className="pb-4">
            <SectionHeader label="Section Membership" />
            
            <Row label="Section">
              <div className="flex items-center gap-1">
                <div className="flex-1">
                  <SelectInput
                    value={getMeta('sectionId') || ''}
                    onChange={v => setMeta('sectionId', v)}
                    options={[{ value: '', label: '-- None --' }, ...canvasSections]}
                  />
                </div>
                <button onClick={() => {
                  const sName = window.prompt("Enter new section name (e.g. Work Experience):");
                  if (sName) {
                    const sId = sName.toLowerCase().replace(/[^a-z0-9]/g, '-');
                    setMeta('sectionId', sId);
                    setMeta('sectionName', sName);
                  }
                }} className="p-1.5 rounded bg-[#2A2A30] hover:bg-brand-orange text-white/50 hover:text-white transition-colors" title="Add New Section">
                  <Plus size={12} />
                </button>
              </div>
            </Row>

            <Row label="Name">
              <input
                type="text"
                value={getMeta('sectionName') || ''}
                onChange={e => setMeta('sectionName', e.target.value)}
                className="w-full bg-[#2A2A30] border border-white/5 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-brand-orange"
                placeholder="E.g. Work Experience"
              />
            </Row>

            <Row label="Order">
              <NumInput value={getMeta('sectionOrder')} onChange={v => setMeta('sectionOrder', v)} min={0} max={99} />
            </Row>

            <Row label="Elem Label">
              <input
                type="text"
                value={selectedObj.type === 'activeSelection' ? '' : (getMeta('elementLabel') || '')}
                onChange={e => setMeta('elementLabel', e.target.value)}
                disabled={selectedObj.type === 'activeSelection'}
                className="w-full bg-[#2A2A30] border border-white/5 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-brand-orange disabled:opacity-50"
                placeholder={selectedObj.type === 'activeSelection' ? 'Multiple selected' : 'E.g. Job Title'}
              />
            </Row>

            <SectionHeader label="Options" />
            <Row label="AI Content">
              <input type="checkbox" checked={!!getMeta('aiContent')} onChange={e => setMeta('aiContent', e.target.checked)} className="accent-brand-orange" />
            </Row>
            <Row label="Optional">
              <input type="checkbox" checked={!!getMeta('isOptional')} onChange={e => setMeta('isOptional', e.target.checked)} className="accent-brand-orange" />
            </Row>
            <Row label="Section Locked">
              <input type="checkbox" checked={!!getMeta('isSectionLocked')} onChange={e => setMeta('isSectionLocked', e.target.checked)} className="accent-brand-orange" />
            </Row>

            <SectionHeader label="Data Binding" />
            <DataBindingCard selectedObj={selectedObj} compact />
          </div>
        )}
      </div>
    </aside>

      {/* ── New Section Modal ─────────────────────────────────────────────────── */}
      {isAddingSection && (
        <SectionPresetModal 
          onClose={() => setIsAddingSection(false)}
          onSave={(sId, sName) => {
            // Assign to selected object if applicable
            if (selectedObj && selectedObj.type !== 'activeSelection') {
              setMeta('sectionId', sId);
              setMeta('sectionName', sName);
            }
            setIsAddingSection(false);
          }}
          selectedObj={selectedObj}
        />
      )}

      {/* AI Field Popup */}
      {showAIPopup && selectedObj?.customMeta?.bindParent && (
        <AIFieldPopup
          bindParent={selectedObj.customMeta.bindParent}
          bindField={selectedObj.customMeta.bindField}
          bindInstanceId={selectedObj.customMeta.bindInstanceId ?? 1}
          resumeData={resumeData}
          onClose={() => setShowAIPopup(false)}
          onApply={rebindCanvas}
        />
      )}
    </>
  );
}
