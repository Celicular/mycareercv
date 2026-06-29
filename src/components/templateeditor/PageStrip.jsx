import React from 'react';
import { Plus, Trash2, FileText } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';

/**
 * PageStrip — vertical sidebar showing one thumbnail card per page.
 * Sits between the Toolbox and the Canvas in the editor layout.
 */
export default function PageStrip() {
  const {
    activePageIdx, pageCount, pageThumbnails,
    switchPage, addPage, deletePage,
  } = useEditor();

  return (
    <div className="w-[110px] shrink-0 h-full bg-[#111114] border-r border-white/5 flex flex-col items-center pt-4 pb-4 gap-3 overflow-y-auto editor-panel-scroll">

      {Array.from({ length: pageCount }).map((_, idx) => {
        const isActive = idx === activePageIdx;
        const thumb    = pageThumbnails[idx];

        return (
          <div key={idx} className="relative group w-[76px] flex flex-col items-center gap-1">

            {/* Thumbnail card */}
            <button
              onClick={() => switchPage(idx)}
              title={`Page ${idx + 1}`}
              className={`w-[76px] h-[108px] rounded-xl overflow-hidden border-2 transition-all duration-150 focus:outline-none ${
                isActive
                  ? 'border-brand-orange shadow-lg shadow-brand-orange/30 scale-105'
                  : 'border-white/10 hover:border-white/35 hover:scale-102'
              }`}
            >
              {thumb ? (
                <img
                  src={thumb}
                  alt={`Page ${idx + 1}`}
                  className="w-full h-full object-cover object-top bg-white"
                />
              ) : (
                <div className="w-full h-full bg-white flex items-center justify-center">
                  <FileText size={18} className="text-gray-300" />
                </div>
              )}
            </button>

            {/* Page number label */}
            <span className={`text-[9px] font-bold tabular-nums transition-colors ${
              isActive ? 'text-brand-orange' : 'text-white/30'
            }`}>
              Page {idx + 1}
            </span>

            {/* Delete button — appears on hover, hidden when only 1 page */}
            {pageCount > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); deletePage(idx); }}
                title={`Delete page ${idx + 1}`}
                className="absolute -top-1 -right-0.5 w-5 h-5 rounded-full bg-[#2a1515] border border-red-500/40
                           text-red-400 opacity-0 group-hover:opacity-100 transition-all
                           flex items-center justify-center hover:bg-red-500 hover:text-white"
              >
                <Trash2 size={10} />
              </button>
            )}
          </div>
        );
      })}

      {/* Divider */}
      <div className="w-12 h-px bg-white/8 my-1 shrink-0" />

      {/* Add page button */}
      <button
        onClick={addPage}
        title="Add page"
        className="w-[76px] h-12 rounded-xl border border-dashed border-white/15 hover:border-brand-orange/60
                   hover:bg-brand-orange/8 text-white/25 hover:text-brand-orange transition-all duration-150
                   flex items-center justify-center gap-1.5 text-[10px] font-semibold"
      >
        <Plus size={14} /> Add Page
      </button>

    </div>
  );
}
