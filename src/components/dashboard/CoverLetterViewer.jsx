import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Copy, Download, CheckCircle2, Star, Zap,
  FileText, BarChart2, Sparkles, ChevronDown, ChevronUp,
  Hash,
} from 'lucide-react';
import { deleteCoverLetter } from '../../api/coverLetterApi';

/**
 * CoverLetterViewer
 * Displays the generated cover letter in formatted letter style.
 * Receives the full cover letter object from the API.
 */

function StatBadge({ icon: Icon, label, value, color = 'text-brand-orange' }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-3 bg-brand-offwhite rounded-2xl border border-brand-dark/5 flex-1">
      <Icon size={16} className={color} />
      <span className="text-lg font-bold text-brand-dark">{value}</span>
      <span className="text-xs text-brand-dark/40 font-medium">{label}</span>
    </div>
  );
}

function SkillChip({ label }) {
  return (
    <span className="px-2.5 py-1 bg-brand-orange/10 text-brand-orange text-xs font-semibold rounded-full border border-brand-orange/20">
      {label}
    </span>
  );
}

function ProjectChip({ label }) {
  return (
    <span className="px-2.5 py-1 bg-brand-lilac/10 text-brand-lilac text-xs font-semibold rounded-full border border-brand-lilac/20">
      {label}
    </span>
  );
}

/** Render the cover letter JSON as a formatted letter */
function LetterBody({ clJson }) {
  if (!clJson) return null;
  const { greeting, opening, body_1, body_2, body_3, closing, sign_off } = clJson;

  // Format sign_off which uses \n separator
  const signOffLines = (sign_off || '').split('\\n');

  const paragraphs = [opening, body_1, body_2, body_3, closing].filter(Boolean);

  return (
    <div className="font-body text-[15px] text-brand-dark/90 leading-relaxed space-y-5">
      {/* Greeting */}
      {greeting && <p className="font-semibold">{greeting}</p>}

      {/* Body paragraphs */}
      {paragraphs.map((para, i) => (
        para.trim() ? <p key={i}>{para}</p> : null
      ))}

      {/* Sign-off */}
      <div className="pt-2">
        {signOffLines.map((line, i) => (
          <p key={i} className={i === 0 ? '' : 'font-semibold'}>{line}</p>
        ))}
      </div>
    </div>
  );
}

/** Copy the full letter as plain text */
function buildPlainText(clJson) {
  if (!clJson) return '';
  const { greeting, opening, body_1, body_2, body_3, closing, sign_off } = clJson;
  const parts = [greeting, opening, body_1, body_2, body_3, closing, sign_off?.replace('\\n', '\n')]
    .filter(Boolean);
  return parts.join('\n\n');
}

// ── Main Component ────────────────────────────────────────────────────────────
const CoverLetterViewer = ({ coverLetter, onClose, onDeleted }) => {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { cover_letter_json, quality_score, word_count, matched_skills, projects_used, document_name } = coverLetter;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildPlainText(cover_letter_json));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* fallback */ }
  };

  const handleDownload = () => {
    const text = buildPlainText(cover_letter_json);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${document_name || 'cover-letter'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await deleteCoverLetter(coverLetter.id);
      onDeleted?.(coverLetter.id);
      onClose();
    } catch (e) {
      console.error(e);
      setDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] bg-brand-dark/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.93, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0, transition: { type: 'spring', bounce: 0.2, duration: 0.5 } }}
          exit={{ scale: 0.93, opacity: 0 }}
          className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl border border-brand-dark/10 max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Top gradient bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-brand-orange via-brand-pink to-brand-lilac shrink-0" />

          {/* Header */}
          <div className="flex items-center justify-between px-7 pt-6 pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-brand-orange to-brand-pink rounded-xl flex items-center justify-center">
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-brand-dark tracking-tight truncate max-w-xs">{document_name}</h2>
                <p className="text-xs text-brand-dark/40 font-medium">{word_count} words · AI Generated</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-brand-dark/40 hover:text-brand-dark hover:bg-brand-offwhite rounded-xl transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Stats row */}
          <div className="px-7 pb-4 shrink-0">
            <div className="flex gap-3 items-stretch">
              <StatBadge icon={Hash}     label="Words"          value={word_count}              color="text-blue-500" />
              <StatBadge icon={Zap}      label="Skills Matched" value={matched_skills?.length || 0} color="text-brand-orange" />
              <StatBadge icon={FileText} label="Projects Used"  value={projects_used?.length || 0}  color="text-brand-lilac" />
            </div>
          </div>

          {/* Matched skills + projects */}
          {((matched_skills?.length > 0) || (projects_used?.length > 0)) && (
            <div className="px-7 pb-4 shrink-0">
              <div className="flex flex-wrap gap-2">
                {matched_skills?.map(s => <SkillChip key={s} label={s} />)}
                {projects_used?.map(p => <ProjectChip key={p} label={p} />)}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="mx-7 border-t border-brand-dark/5 shrink-0" />

          {/* Letter area — scrollable */}
          <div className="flex-1 overflow-y-auto px-7 py-6">
            {/* Letter paper */}
            <div className="bg-brand-offwhite/50 rounded-2xl border border-brand-dark/5 p-7 shadow-inner-sm">
              <LetterBody clJson={cover_letter_json} />
            </div>

            {/* Collapsible pipeline details */}
            {coverLetter.content_plan && (
              <div className="mt-5">
                <button
                  onClick={() => setShowDetails(v => !v)}
                  className="flex items-center gap-2 text-xs font-semibold text-brand-dark/50 hover:text-brand-dark transition-colors"
                >
                  {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {showDetails ? 'Hide' : 'Show'} AI reasoning
                </button>
                <AnimatePresence>
                  {showDetails && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-3">
                      <div className="bg-brand-dark rounded-2xl p-5 text-xs font-mono text-white/70 space-y-2">
                        <p className="text-white/30 uppercase tracking-wider font-bold text-[10px]">Content Plan (AI Outline)</p>
                        {Object.entries(coverLetter.content_plan).map(([k, v]) => (
                          <div key={k} className="flex gap-2">
                            <span className="text-brand-orange shrink-0 capitalize">{k}:</span>
                            <span>{v}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="px-7 py-5 border-t border-brand-dark/5 shrink-0 flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-dark text-white rounded-xl text-sm font-bold hover:-translate-y-0.5 transition-all shadow-md"
            >
              {copied ? <CheckCircle2 size={15} className="text-[#00B67A]" /> : <Copy size={15} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-brand-dark/15 text-brand-dark rounded-xl text-sm font-bold hover:border-brand-orange transition-colors"
            >
              <Download size={15} /> Download
            </button>
            <div className="ml-auto">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  confirmDelete ? 'bg-red-600 text-white hover:bg-red-700' : 'text-red-400 hover:text-red-600 hover:bg-red-50'
                }`}
              >
                {deleting ? 'Deleting…' : confirmDelete ? 'Confirm Delete' : 'Delete'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CoverLetterViewer;
