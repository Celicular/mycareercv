import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, X, RefreshCw, Sparkles, ArrowRight } from 'lucide-react';
import { rewriteText } from '../../api/resumeApi';

function buildTargets(form) {
  const targets = [];
  if (form.summary && form.summary.trim().length > 10) {
    targets.push({ id: 'summary', path: ['summary'], label: 'Professional Summary', original: form.summary });
  }
  (form.work_experience || []).forEach((w, i) => {
    (w.responsibilities || []).forEach((r, j) => {
      if (r && r.trim().length > 10) {
        targets.push({ id: `we_${i}_${j}`, path: ['work_experience', i, 'responsibilities', j], label: `Experience: ${w.company || 'Role'} (Bullet ${j + 1})`, original: r });
      }
    });
  });
  (form.projects || []).forEach((p, i) => {
    if (p.description && p.description.trim().length > 10) {
      targets.push({ id: `proj_${i}`, path: ['projects', i, 'description'], label: `Project: ${p.name || `Project ${i + 1}`}`, original: p.description });
    }
  });
  (form.awards || []).forEach((a, i) => {
    if (a.description && a.description.trim().length > 10) {
      targets.push({ id: `awd_${i}`, path: ['awards', i, 'description'], label: `Award: ${a.title || `Award ${i + 1}`}`, original: a.description });
    }
  });
  (form.volunteer || []).forEach((v, i) => {
    if (v.description && v.description.trim().length > 10) {
      targets.push({ id: `vol_${i}`, path: ['volunteer', i, 'description'], label: `Volunteer: ${v.organisation || `Role ${i + 1}`}`, original: v.description });
    }
  });
  return targets.map(t => ({ ...t, enhanced: null, status: 'pending', selected: true }));
}

export default function AIEnhancementModal({ form, onComplete }) {
  const [items, setItems] = useState(() => buildTargets(form));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState(items.length > 0 ? 'processing' : 'review'); // processing, review
  
  // Processing loop
  useEffect(() => {
    if (phase !== 'processing') return;

    let isMounted = true;
    const processAll = async () => {
      for (let i = 0; i < items.length; i++) {
        if (!isMounted) break;

        setCurrentIndex(i);
        setItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'processing' } : it));

        try {
          // Note: items[i] from the closure is fine because the original text doesn't change
          const res = await rewriteText(items[i].original);
          if (!isMounted) break;
          
          setItems(prev => prev.map((it, idx) => idx === i ? { 
            ...it, 
            status: 'success', 
            enhanced: res.rewritten_text,
            selected: true 
          } : it));
        } catch (err) {
          console.error("AI enhancement failed for item", items[i].id, err);
          if (!isMounted) break;
          setItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'failed', selected: false } : it));
        }
      }

      if (isMounted) {
        setPhase('review');
      }
    };

    processAll();
    return () => { isMounted = false; };
  }, [phase]); // Only run once when phase becomes 'processing'

  const handleRetry = async (idx) => {
    const currentItem = items[idx];
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, status: 'processing' } : it));
    try {
      const res = await rewriteText(currentItem.original);
      setItems(prev => prev.map((it, i) => i === idx ? { ...it, status: 'success', enhanced: res.rewritten_text, selected: true } : it));
    } catch (err) {
      setItems(prev => prev.map((it, i) => i === idx ? { ...it, status: 'failed', selected: false } : it));
    }
  };

  const toggleSelect = (idx) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, selected: !it.selected } : it));
  };

  const handleApply = () => {
    const nextForm = JSON.parse(JSON.stringify(form)); // deep clone
    
    // Apply selected enhancements
    items.forEach(it => {
      if (it.selected && it.status === 'success' && it.enhanced) {
        // traverse path
        let obj = nextForm;
        for (let i = 0; i < it.path.length - 1; i++) {
          obj = obj[it.path[i]];
        }
        obj[it.path[it.path.length - 1]] = it.enhanced;
      }
    });

    // Add meta tag
    if (!nextForm.meta) nextForm.meta = {};
    nextForm.meta.enhanced_by_ai = true;

    onComplete(nextForm);
  };

  if (items.length === 0) {
    // Edge case: nothing to enhance
    return (
      <div className="fixed inset-0 z-[120] bg-brand-dark/90 backdrop-blur-sm flex items-center justify-center p-6 font-body">
        <div className="bg-[#1a1a1a] rounded-3xl max-w-md w-full p-8 border border-white/10 text-center">
          <Sparkles className="mx-auto text-brand-orange mb-4" size={40} />
          <h2 className="text-xl font-bold text-white mb-2">Nothing to enhance</h2>
          <p className="text-white/50 text-sm mb-6">Your resume doesn't have enough descriptive text for the AI to optimize yet.</p>
          <button onClick={() => onComplete(form)} className="w-full py-3 rounded-xl bg-brand-orange text-white font-bold">Continue to Editor</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[120] bg-brand-dark/95 backdrop-blur-md flex flex-col font-body">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-black/20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-orange/20 flex items-center justify-center text-brand-orange">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">AI Resume Enhancement</h2>
            <p className="text-xs font-medium text-brand-orange/80">
              {phase === 'processing' ? `Optimizing ${currentIndex} of ${items.length}...` : 'Review your optimized content'}
            </p>
          </div>
        </div>
        {phase === 'review' && (
          <button onClick={handleApply} className="flex items-center gap-2 px-6 py-2.5 bg-brand-orange text-white rounded-xl font-bold hover:bg-brand-orange/90 transition-all text-sm shadow-lg shadow-brand-orange/20">
            Apply & Finish <ArrowRight size={16} />
          </button>
        )}
      </div>

      {/* Main scrollable area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 builder-scroll" data-lenis-prevent>
        <div className="max-w-4xl mx-auto space-y-6">
          {items.map((it, idx) => {
            const isProcessing = it.status === 'processing' || (phase === 'processing' && idx >= currentIndex);
            
            return (
              <motion.div 
                key={it.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                className={`p-5 rounded-2xl border transition-colors ${it.selected && it.status === 'success' ? 'border-brand-orange/50 bg-brand-orange/5' : 'border-white/10 bg-white/5'}`}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    {it.status === 'success' && (
                      <button onClick={() => toggleSelect(idx)} className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors shrink-0 ${it.selected ? 'bg-brand-orange border-brand-orange text-white' : 'border-white/30 text-transparent hover:border-brand-orange'}`}>
                        <Check size={14} />
                      </button>
                    )}
                    {(it.status === 'pending' || it.status === 'processing') && (
                      <div className="w-6 h-6 rounded-md border border-white/10 flex items-center justify-center shrink-0">
                        {idx === currentIndex && phase === 'processing' ? <Loader2 size={12} className="animate-spin text-brand-orange" /> : <span className="w-1.5 h-1.5 rounded-full bg-white/20" />}
                      </div>
                    )}
                    {it.status === 'failed' && (
                      <div className="w-6 h-6 rounded-md bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400 shrink-0"><X size={14} /></div>
                    )}
                    
                    <h3 className="text-sm font-bold text-white">{it.label}</h3>
                  </div>

                  {it.status === 'success' && phase === 'review' && (
                    <button onClick={() => handleRetry(idx)} className="text-xs font-semibold text-white/40 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
                      <RefreshCw size={12} /> Retry
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-9">
                  {/* Original */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Original</span>
                    <div className="p-3 rounded-xl bg-black/40 text-sm text-white/60 leading-relaxed border border-white/5 line-clamp-6 hover:line-clamp-none transition-all">
                      {it.original}
                    </div>
                  </div>

                  {/* Enhanced */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-orange/80 flex items-center gap-1">
                      <Sparkles size={10} /> Optimized
                    </span>
                    <div className="p-3 rounded-xl bg-black/40 text-sm text-white leading-relaxed border border-white/5 min-h-[4rem] relative">
                      {isProcessing ? (
                        <div className="absolute inset-0 flex items-center justify-center gap-2 text-white/40 text-xs font-medium">
                          <Loader2 size={14} className="animate-spin" /> Rewriting...
                        </div>
                      ) : it.status === 'failed' ? (
                        <div className="text-red-400 text-xs">Failed to optimize this field.</div>
                      ) : (
                        <div className="whitespace-pre-wrap">{it.enhanced}</div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
