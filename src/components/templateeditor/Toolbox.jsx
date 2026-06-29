import React from 'react';
import { fabric } from 'fabric';
import { useEditor } from '../../context/EditorContext';
import {
  Type, AlignLeft, Circle, Minus, Image, User,
  Briefcase, GraduationCap, Award, Wrench, FileText,
  Square, ChevronDown,
} from 'lucide-react';
import {
  createTextField, createRichTextField, createBulletListField,
  createRect, createCircle, createLine, createDivider,
  createImagePlaceholder, createPhotoFrame,
  getSafeSpawnPos,
} from './fabricHelpers';
import SectionPresetModal from './SectionPresetModal';

// ── Primitive tools ───────────────────────────────────────────────────────────
const PRIMITIVES = [
  { id: 'text',     label: 'Text',        icon: Type,      factory: (c) => createTextField(getSafeSpawnPos(c)) },
  { id: 'richtext', label: 'Rich Text',   icon: AlignLeft, factory: (c) => createRichTextField(getSafeSpawnPos(c)) },
  { id: 'bullets',  label: 'Bullet List', icon: AlignLeft, factory: (c) => createBulletListField(getSafeSpawnPos(c)) },
  { id: 'rect',     label: 'Rectangle',   icon: Square,    factory: (c) => createRect(getSafeSpawnPos(c)) },
  { id: 'circle',   label: 'Circle',      icon: Circle,    factory: (c) => createCircle(getSafeSpawnPos(c)) },
  { id: 'line',     label: 'Line',        icon: Minus,     factory: (c) => createLine(getSafeSpawnPos(c)) },
  { id: 'divider',  label: 'Divider',     icon: Minus,     factory: (c) => createDivider(getSafeSpawnPos(c)) },
  { id: 'image',    label: 'Image',       icon: Image,     factory: (c) => createImagePlaceholder(getSafeSpawnPos(c)) },
  { id: 'photo',    label: 'Photo Frame', icon: User,      factory: (c) => createPhotoFrame(getSafeSpawnPos(c)) },
];

// ── Prebuilt section blocks ───────────────────────────────────────────────────
const PREBUILTS = [
  { id: 'identity',    label: 'Name & Headline', icon: FileText,      preset: 'header' },
  { id: 'contact',     label: 'Contact Bar',     icon: AlignLeft,     preset: 'blank' },
  { id: 'work',        label: 'Work Experience', icon: Briefcase,     preset: 'full-list' },
  { id: 'education',   label: 'Education',       icon: GraduationCap, preset: 'half-split' },
  { id: 'skills',      label: 'Skills',          icon: Wrench,        preset: 'grid' },
  { id: 'certs',       label: 'Certifications',  icon: Award,         preset: 'full-list' },
  { id: 'custom-hdr',  label: 'Section Header',  icon: ChevronDown,   preset: 'header' },
];

// ── Add helper — handles both single objects and arrays ───────────────────────
function addToCanvas(canvas, result, pushHistory) {
  if (Array.isArray(result)) {
    result.forEach(obj => canvas.add(obj));
    // Multi-select all added objects so the user can drag them as a unit
    const sel = new fabric.ActiveSelection(result, { canvas });
    canvas.setActiveObject(sel);
  } else {
    canvas.add(result);
    canvas.setActiveObject(result);
  }
  canvas.requestRenderAll();
  pushHistory();
}

export default function Toolbox() {
  const { canvasRef, pushHistory } = useEditor();
  const [activePreset, setActivePreset] = React.useState(null); // { id, preset }

  const add = (factory) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const result = factory(canvas);
    addToCanvas(canvas, result, pushHistory);
  };

  return (
    <aside className="flex flex-col h-full bg-[#16161a] border-r border-white/5 w-[320px] shrink-0 overflow-y-auto editor-panel-scroll">
      {/* Primitives */}
      <div className="px-3 pt-4 pb-2">
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.14em] mb-2 px-1">Elements</p>
        <div className="grid grid-cols-2 gap-1.5">
          {PRIMITIVES.map(({ id, label, icon: Icon, factory }) => (
            <button
              key={id}
              onClick={() => add(factory)}
              title={label}
              className="flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl bg-[#2A2A30] hover:bg-[#34343A] text-white/80 hover:text-white border border-white/5 shadow-sm transition-all group"
            >
              <Icon size={15} className="group-hover:text-brand-orange transition-colors" />
              <span className="text-[9px] font-semibold text-white/60 group-hover:text-white/90 leading-none">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/5 mx-3 my-2" />

      {/* Prebuilt sections */}
      <div className="px-3 pb-4">
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.14em] mb-2 px-1">Sections</p>
        <p className="text-[9px] text-white/20 px-1 mb-2 leading-snug">Double-click any text to edit it directly</p>
        <div className="flex flex-col gap-1">
          {PREBUILTS.map(({ id, label, icon: Icon, preset }) => (
            <button
              key={id}
              onClick={() => setActivePreset({ id, preset })}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#2A2A30] hover:bg-[#34343A] text-white/80 hover:text-brand-orange border border-white/5 shadow-sm transition-all text-left group"
            >
              <Icon size={13} className="shrink-0" />
              <span className="text-sm font-semibold leading-tight text-white/80 group-hover:text-brand-orange whitespace-normal">{label}</span>
            </button>
          ))}
        </div>
      </div>
      
      {activePreset && (
        <SectionPresetModal 
          onClose={() => setActivePreset(null)}
          onSave={() => setActivePreset(null)}
          initialSectionId={activePreset.id}
          initialPreset={activePreset.preset}
        />
      )}
    </aside>
  );
}
