import React, { useState, useEffect, useCallback } from 'react';
import { X, Sparkles, RefreshCw, Check, Loader2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { rewriteText } from '../../api/resumeApi';

// ── Normalizers (no AI cost) ──────────────────────────────────────────────────
function normalizeDate(val) {
  if (!val) return val;
  const months = {
    '01':'Jan','02':'Feb','03':'Mar','04':'Apr','05':'May','06':'Jun',
    '07':'Jul','08':'Aug','09':'Sep','10':'Oct','11':'Nov','12':'Dec',
  };
  // YYYY-MM → "Jan 2022"
  const m = val.match(/^(\d{4})-(\d{2})$/);
  if (m) return `${months[m[2]] || m[2]} ${m[1]}`;
  // Already looks good
  return val;
}

function normalizeDegree(val) {
  if (!val) return val;
  const expansions = {
    'bsc': 'Bachelor of Science', 'beng': 'Bachelor of Engineering',
    'ba': 'Bachelor of Arts', 'msc': 'Master of Science',
    'mba': 'Master of Business Administration', 'phd': 'Doctor of Philosophy',
    'btech': 'Bachelor of Technology', 'mtech': 'Master of Technology',
    'bca': 'Bachelor of Computer Applications', 'mca': 'Master of Computer Applications',
  };
  const lower = val.trim().toLowerCase().replace(/\./g, '');
  return expansions[lower] || val;
}

function normalizeContact(val, field) {
  if (!val) return val;
  if (field === 'phone') {
    // strip non-numeric except + and spaces, standardize
    const digits = val.replace(/[^\d+]/g, '');
    return digits;
  }
  if (field === 'email') return val.toLowerCase().trim();
  if (field === 'location') {
    // Capitalize each word
    return val.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }
  if (field === 'linkedin' || field === 'github' || field === 'portfolio') {
    // Ensure https:// prefix
    if (val && !val.startsWith('http')) return `https://${val}`;
  }
  return val;
}

function normalizeIssuer(val) {
  if (!val) return val;
  const expansions = {
    'aws': 'Amazon Web Services (AWS)',
    'gcp': 'Google Cloud Platform (GCP)',
    'ms': 'Microsoft',
    'az': 'Microsoft Azure',
    'meta': 'Meta (Facebook)',
  };
  return expansions[val.toLowerCase()] || val;
}

// ── Field config ──────────────────────────────────────────────────────────────
function getFieldConfig(bindParent, bindField) {
  const aiFields = {
    'identity:summary': {
      label: 'Professional Summary',
      type: 'ai',
      hint: 'Rewrites your summary for maximum ATS impact with strong action language.',
    },
    'identity:headline': {
      label: 'Headline / Title',
      type: 'ai',
      hint: 'Tailors your headline to read like a professional job title.',
    },
    'work_experience:responsibilities': {
      label: 'Responsibilities',
      type: 'ai_list',
      hint: 'Rewrites each bullet with stronger action verbs and quantified impact.',
    },
    'projects:description': {
      label: 'Project Description',
      type: 'ai',
      hint: 'Rewrites the description to highlight technical impact and relevance.',
    },
    'awards:description': {
      label: 'Award Description',
      type: 'ai',
      hint: 'Frames this achievement as an impactful professional accomplishment.',
    },
    'volunteer:description': {
      label: 'Volunteer Description',
      type: 'ai',
      hint: 'Highlights leadership, initiative, and transferable skills.',
    },
    'identity:full_name': { label: 'Full Name', type: 'none', hint: null },
    'contact:email': { label: 'Email', type: 'normalize', normalizer: v => normalizeContact(v, 'email'), hint: 'Normalizes to lowercase.' },
    'contact:phone': { label: 'Phone', type: 'normalize', normalizer: v => normalizeContact(v, 'phone'), hint: 'Strips non-numeric characters.' },
    'contact:location': { label: 'Location', type: 'normalize', normalizer: v => normalizeContact(v, 'location'), hint: 'Capitalizes each word.' },
    'contact:linkedin': { label: 'LinkedIn URL', type: 'normalize', normalizer: v => normalizeContact(v, 'linkedin'), hint: 'Ensures https:// prefix.' },
    'contact:github': { label: 'GitHub URL', type: 'normalize', normalizer: v => normalizeContact(v, 'github'), hint: 'Ensures https:// prefix.' },
    'contact:portfolio': { label: 'Portfolio URL', type: 'normalize', normalizer: v => normalizeContact(v, 'portfolio'), hint: 'Ensures https:// prefix.' },
    'work_experience:start_date': { label: 'Start Date', type: 'normalize', normalizer: normalizeDate, hint: 'Formats as "Jan 2022".' },
    'work_experience:end_date': { label: 'End Date', type: 'normalize', normalizer: normalizeDate, hint: 'Formats as "Jan 2022".' },
    'work_experience:title': { label: 'Job Title', type: 'ai', hint: 'Polishes your job title with industry-standard phrasing.' },
    'education:degree': { label: 'Degree', type: 'normalize', normalizer: normalizeDegree, hint: 'Expands abbreviations (e.g. BSc → Bachelor of Science).' },
    'education:graduation_year': { label: 'Graduation Year', type: 'none', hint: null },
    'certifications:issuer': { label: 'Issuer', type: 'normalize', normalizer: normalizeIssuer, hint: 'Expands common abbreviations (e.g. AWS → Amazon Web Services).' },
    'skills:technical': { label: 'Technical Skills', type: 'none', hint: 'Use the AI panel for bulk skills optimisation.' },
    'skills:soft': { label: 'Soft Skills', type: 'none', hint: 'Use the AI panel for bulk skills optimisation.' },
    'skills:languages': { label: 'Languages', type: 'none', hint: null },
    'skills:other': { label: 'Other Skills', type: 'none', hint: null },
  };
  return aiFields[`${bindParent}:${bindField}`] || { label: bindField, type: 'none', hint: null };
}

// ── Resolve field value from resume JSON ──────────────────────────────────────
function resolveValue(resumeData, bindParent, bindField, bindInstanceId = 1) {
  if (!resumeData) return null;
  // scalars
  if (bindParent === 'identity') return resumeData[bindField];
  if (bindParent === 'contact') return resumeData?.contact?.[bindField];
  if (bindParent === 'skills') return resumeData?.skills?.[bindField];
  // arrays
  const arr = resumeData[bindParent];
  if (!Array.isArray(arr)) return null;
  
  const idx = Math.max(0, bindInstanceId - 1); // bindInstanceId is 1-indexed
  const item = arr[idx];
  if (!item) return null;
  return item[bindField];
}

// ── Apply value back to resume JSON ──────────────────────────────────────────
function applyValue(resumeData, bindParent, bindField, bindInstanceId = 1, newValue) {
  const next = JSON.parse(JSON.stringify(resumeData));
  if (bindParent === 'identity') { next[bindField] = newValue; return next; }
  if (bindParent === 'contact') { if (!next.contact) next.contact = {}; next.contact[bindField] = newValue; return next; }
  if (bindParent === 'skills') { if (!next.skills) next.skills = {}; next.skills[bindField] = newValue; return next; }
  const arr = next[bindParent];
  
  const idx = Math.max(0, bindInstanceId - 1);
  if (Array.isArray(arr) && arr[idx] != null) {
    arr[idx][bindField] = newValue;
  }
  return next;
}

// ── Main component ────────────────────────────────────────────────────────────
// resumeData is passed as a prop from PropertiesPanel (which reads it from EditorContext)
export default function AIFieldPopup({ bindParent, bindField, bindInstanceId = 1, resumeData, onClose, onApply }) {
  const config = getFieldConfig(bindParent, bindField);
  const originalValue = resolveValue(resumeData, bindParent, bindField, bindInstanceId);

  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [enhanced, setEnhanced] = useState(null);

  // Format for display
  const displayOriginal = Array.isArray(originalValue) ? originalValue.join('\n') : (originalValue || '');
  const displayEnhanced = Array.isArray(enhanced) ? enhanced.join('\n') : (enhanced || '');

  const runEnhancement = useCallback(async () => {
    if (config.type === 'none' || !originalValue) return;
    setStatus('loading');
    try {
      if (config.type === 'normalize') {
        const val = Array.isArray(originalValue)
          ? originalValue.map(config.normalizer)
          : config.normalizer(originalValue);
        setEnhanced(val);
        setStatus('done');
      } else if (config.type === 'ai') {
        const text = Array.isArray(originalValue) ? originalValue.join('. ') : originalValue;
        const res = await rewriteText(text);
        setEnhanced(res.rewritten_text);
        setStatus('done');
      } else if (config.type === 'ai_list') {
        const items = Array.isArray(originalValue) ? originalValue : [originalValue];
        const results = [];
        for (const item of items) {
          if (!item || item.trim().length < 5) { results.push(item); continue; }
          const res = await rewriteText(item);
          results.push(res.rewritten_text);
        }
        setEnhanced(results);
        setStatus('done');
      }
    } catch (err) {
      console.error('AI enhancement failed:', err);
      setStatus('error');
    }
  }, [originalValue, config]);

  useEffect(() => {
    runEnhancement();
  }, []);

  const handleApply = () => {
    if (!enhanced || !resumeData) return;
    const newData = applyValue(resumeData, bindParent, bindField, bindInstanceId, enhanced);
    onApply(newData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18 }}
        className="bg-[#1A1A1F] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand-orange/20 flex items-center justify-center text-brand-orange">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">AI Assistant — {config.label}</h2>
              {config.hint && <p className="text-[11px] text-white/40 mt-0.5">{config.hint}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {config.type === 'none' ? (
            <div className="text-center py-8 text-white/40 text-sm">
              This field doesn't have an AI enhancement available yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {/* Original */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Original</span>
                <div className="bg-black/30 border border-white/5 rounded-xl p-3 text-sm text-white/60 leading-relaxed whitespace-pre-wrap flex-1 min-h-[120px]">
                  {displayOriginal || <span className="italic text-white/20">No content</span>}
                </div>
              </div>

              {/* Enhanced */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-orange/80 flex items-center gap-1">
                  <Sparkles size={9} /> Optimized
                </span>
                <div className="bg-black/30 border border-brand-orange/20 rounded-xl p-3 text-sm text-white leading-relaxed whitespace-pre-wrap flex-1 min-h-[120px] relative">
                  {status === 'loading' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/40 text-xs">
                      <Loader2 size={20} className="animate-spin text-brand-orange" />
                      <span>Optimizing with AI...</span>
                    </div>
                  )}
                  {status === 'error' && (
                    <div className="text-red-400 text-sm">Failed to optimize. Click Retry to try again.</div>
                  )}
                  {status === 'done' && displayEnhanced}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-white/8 shrink-0">
          <button
            onClick={runEnhancement}
            disabled={status === 'loading' || config.type === 'none'}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 border border-white/10 text-xs font-semibold transition-colors disabled:opacity-30"
          >
            <RefreshCw size={13} className={status === 'loading' ? 'animate-spin' : ''} />
            Regenerate
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-white/50 hover:text-white border border-white/10 hover:bg-white/5 text-xs font-semibold transition-colors"
            >
              Keep Original
            </button>
            <button
              onClick={handleApply}
              disabled={status !== 'done'}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-brand-orange hover:bg-[#E65100] text-white text-xs font-bold transition-colors disabled:opacity-40 shadow-lg shadow-brand-orange/20"
            >
              <Check size={14} /> Apply Changes
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
