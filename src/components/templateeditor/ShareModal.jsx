import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink } from 'lucide-react';

export default function ShareModal({ onClose, shareUrl, onRepublish, isPublishing }) {
  const [copied, setCopied] = useState(false);

  const fullUrl = window.location.origin + shareUrl;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1C1C21] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold text-white">Share Resume</h2>
            <p className="text-sm text-white/50 mt-0.5">Your resume is live and ready to share</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-6">
          
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/70 uppercase tracking-widest">Public Link</label>
            <div className="flex items-center gap-2 bg-[#2A2A30] border border-white/10 p-1.5 rounded-xl">
              <input 
                type="text" 
                readOnly 
                value={fullUrl}
                className="flex-1 bg-transparent text-sm text-white px-3 outline-none"
              />
              <button 
                onClick={handleCopy}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-semibold text-sm transition-colors"
              >
                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <a 
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-brand-orange hover:underline flex items-center gap-1 mt-1"
            >
              Open link in new tab <ExternalLink size={12} />
            </a>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-2">
            <h3 className="text-sm font-bold text-white">Made changes?</h3>
            <p className="text-xs text-white/50">If you've updated your resume, you need to republish it for the changes to be visible on the public link.</p>
            <button 
              onClick={onRepublish}
              disabled={isPublishing}
              className="mt-2 w-full py-2.5 rounded-lg bg-brand-orange hover:bg-[#E65100] text-white font-bold text-sm transition-colors disabled:opacity-50"
            >
              {isPublishing ? 'Publishing...' : 'Update Published Version'}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
