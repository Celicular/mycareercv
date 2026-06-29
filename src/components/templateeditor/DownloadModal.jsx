import React from 'react';
import { X, FileText, Image as ImageIcon } from 'lucide-react';

export default function DownloadModal({ onClose, onDownloadPDF, onDownloadImage }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1C1C21] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold text-white">Download Resume</h2>
            <p className="text-sm text-white/50 mt-0.5">Select a format</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4">
          <button 
            onClick={() => { onDownloadPDF(); onClose(); }}
            className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-[#2A2A30] hover:bg-brand-orange/10 hover:border-brand-orange transition-colors text-left group"
          >
            <div className="p-3 bg-black/20 rounded-lg group-hover:text-brand-orange text-white/50">
              <FileText size={24} />
            </div>
            <div>
              <div className="font-bold text-white group-hover:text-brand-orange">PDF Document</div>
              <div className="text-xs text-white/40 mt-1">Best for printing and ATS systems</div>
            </div>
          </button>

          <button 
            onClick={() => { onDownloadImage(); onClose(); }}
            className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-[#2A2A30] hover:bg-brand-orange/10 hover:border-brand-orange transition-colors text-left group"
          >
            <div className="p-3 bg-black/20 rounded-lg group-hover:text-brand-orange text-white/50">
              <ImageIcon size={24} />
            </div>
            <div>
              <div className="font-bold text-white group-hover:text-brand-orange">Image (PNG)</div>
              <div className="text-xs text-white/40 mt-1">Best for sharing on social media</div>
            </div>
          </button>
        </div>

      </div>
    </div>
  );
}
