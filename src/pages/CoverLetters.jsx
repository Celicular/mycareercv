import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, UploadCloud, FileText, Plus,
  Loader2, ChevronRight, Star, Zap, Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/dashboard/Sidebar';
import CoverLetterGeneratorModal from '../components/dashboard/CoverLetterGeneratorModal';
import CoverLetterViewer from '../components/dashboard/CoverLetterViewer';
import { listCoverLetters, getCoverLetter } from '../api/coverLetterApi';
import { listResumes } from '../api/resumeApi';

// ── Score badge ───────────────────────────────────────────────────────────────
function ScoreBadge({ score }) {
  const pct = score || 0;
  const color = pct >= 85 ? 'text-[#00B67A] bg-[#00B67A]/10 border-[#00B67A]/20'
    : pct >= 70 ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-red-500 bg-red-50 border-red-200';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${color}`}>
      <Star size={10} /> {pct}
    </span>
  );
}

// ── Cover Letter card ─────────────────────────────────────────────────────────
function CoverLetterCard({ cl, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, boxShadow: '0 12px 36px rgba(0,0,0,0.08)' }}
      onClick={onClick}
      className="bg-white rounded-2xl border border-brand-dark/5 p-5 cursor-pointer transition-shadow flex flex-col gap-3"
    >
      {/* Icon + name */}
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 bg-gradient-to-br from-brand-orange/20 to-brand-pink/20 rounded-xl flex items-center justify-center shrink-0">
          <Sparkles size={20} className="text-brand-orange" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-brand-dark text-base truncate">{cl.document_name}</h3>
          <p className="text-xs text-brand-dark/40 mt-0.5">{new Date(cl.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
        <ScoreBadge score={cl.quality_score} />
      </div>

      {/* Skills chips */}
      {cl.matched_skills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {cl.matched_skills.slice(0, 4).map(s => (
            <span key={s} className="px-2 py-0.5 bg-brand-orange/8 text-brand-orange text-[11px] font-semibold rounded-full border border-brand-orange/15">
              {s}
            </span>
          ))}
          {cl.matched_skills.length > 4 && (
            <span className="px-2 py-0.5 bg-brand-offwhite text-brand-dark/40 text-[11px] font-semibold rounded-full">
              +{cl.matched_skills.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-brand-dark/5 text-xs font-semibold text-brand-orange">
        <span className="flex items-center gap-1 text-brand-dark/40">
          <Zap size={12} /> {cl.word_count || 0} words
        </span>
        <span className="flex items-center gap-1">
          View Letter <ChevronRight size={13} />
        </span>
      </div>
    </motion.div>
  );
}

// ── Empty state cards ─────────────────────────────────────────────────────────
function EmptyStateCards({ onOpenModal }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Select Existing Resume */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        onClick={() => onOpenModal('existing')}
        className="relative bg-brand-dark rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[320px] group hover:shadow-2xl hover:-translate-y-1 overflow-hidden"
      >
        {/* Ambient glows */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-orange/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-lilac/10 rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl pointer-events-none" />

        <div className="relative z-10 w-20 h-20 bg-brand-orange/20 rounded-3xl flex items-center justify-center mb-6 text-brand-orange group-hover:scale-110 group-hover:bg-brand-orange group-hover:text-white transition-all duration-300">
          <FileText size={36} />
        </div>
        <h3 className="relative z-10 text-2xl font-bold text-white mb-3">Use Existing Resume</h3>
        <p className="relative z-10 text-white/60 text-sm leading-relaxed max-w-xs">
          Pick one of your saved resumes and generate a tailored cover letter in minutes.
        </p>
        <div className="relative z-10 mt-6 px-5 py-2.5 rounded-full border border-white/20 text-sm font-medium text-white/70 group-hover:border-brand-orange group-hover:text-brand-orange transition-colors">
          Select Resume
        </div>
      </motion.div>

      {/* Upload New Resume */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        onClick={() => onOpenModal('upload')}
        className="relative bg-white rounded-3xl border-2 border-dashed border-brand-dark/15 p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[320px] group hover:border-brand-orange hover:shadow-xl hover:-translate-y-1"
      >
        <div className="w-20 h-20 bg-brand-peach/20 text-brand-orange rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-brand-orange group-hover:text-white transition-all duration-300">
          <UploadCloud size={36} />
        </div>
        <h3 className="text-2xl font-bold text-brand-dark mb-3">Upload a Resume</h3>
        <p className="text-brand-dark/60 text-sm leading-relaxed max-w-xs">
          Upload a PDF or DOCX. Our AI will parse it and generate a perfect cover letter.
        </p>
        <div className="mt-6 px-5 py-2.5 rounded-full border border-brand-dark/15 text-sm font-medium text-brand-dark/70 group-hover:border-brand-orange group-hover:text-brand-orange transition-colors">
          Upload Resume
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const CoverLetters = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (!user) navigate('/'); }, [user, navigate]);

  const [letters, setLetters]           = useState([]);
  const [resumes, setResumes]           = useState([]);
  const [loadingList, setLoadingList]   = useState(true);

  const [showModal, setShowModal]       = useState(false);
  const [defaultMode, setDefaultMode]   = useState(null);

  const [viewingLetter, setViewingLetter] = useState(null); // full letter object
  const [loadingLetter, setLoadingLetter] = useState(false);

  // Load cover letters + resumes in parallel
  const fetchData = async () => {
    setLoadingList(true);
    try {
      const [cls, rList] = await Promise.all([listCoverLetters(), listResumes()]);
      setLetters(cls);
      setResumes(rList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openModal = (mode = null) => {
    setDefaultMode(mode);
    setShowModal(true);
  };

  const handleGenerated = (result) => {
    setShowModal(false);
    // Open the viewer immediately with the result
    setViewingLetter(result);
    // Refresh list in background
    fetchData();
  };

  const handleCardClick = async (cl) => {
    setLoadingLetter(true);
    try {
      const full = await getCoverLetter(cl.id);
      setViewingLetter(full);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLetter(false);
    }
  };

  const handleDeleted = (id) => {
    setLetters(prev => prev.filter(cl => cl.id !== id));
  };

  return (
    <div className="flex h-screen bg-brand-offwhite overflow-hidden font-body selection:bg-brand-orange selection:text-white">
      <Sidebar />

      {/* Generator modal */}
      <AnimatePresence>
        {showModal && (
          <CoverLetterGeneratorModal
            onClose={() => setShowModal(false)}
            onGenerated={handleGenerated}
            existingResumes={resumes}
          />
        )}
      </AnimatePresence>

      {/* Viewer modal */}
      <AnimatePresence>
        {viewingLetter && (
          <CoverLetterViewer
            coverLetter={viewingLetter}
            onClose={() => setViewingLetter(null)}
            onDeleted={handleDeleted}
          />
        )}
      </AnimatePresence>

      {/* Loading overlay for fetching full cover letter */}
      <AnimatePresence>
        {loadingLetter && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[105] bg-brand-dark/50 backdrop-blur-sm flex items-center justify-center gap-4 flex-col"
          >
            <Loader2 size={36} className="text-brand-orange animate-spin" />
            <p className="text-white font-semibold text-sm">Loading cover letter…</p>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 overflow-y-auto mt-16 md:mt-0 p-6 md:p-10">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <header className="mb-10 flex items-start justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-brand-dark mb-2 tracking-tight">
                Cover Letters
              </h1>
              <p className="text-brand-dark/60 font-medium">
                AI-generated cover letters tailored to every job description.
              </p>
            </div>
            {letters.length > 0 && !loadingList && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => openModal('existing')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-brand-dark text-white rounded-xl text-sm font-bold shadow-md hover:-translate-y-0.5 transition-transform"
                >
                  <FileText size={15} /> Select Resume
                </button>
                <button
                  onClick={() => openModal('upload')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-brand-dark/10 text-brand-dark rounded-xl text-sm font-bold shadow-sm hover:border-brand-orange transition-colors"
                >
                  <UploadCloud size={15} /> Upload Resume
                </button>
              </div>
            )}
          </header>

          {/* Content */}
          {loadingList ? (
            <div className="flex justify-center py-24">
              <Loader2 className="animate-spin text-brand-orange" size={40} />
            </div>
          ) : letters.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {letters.map(cl => (
                <CoverLetterCard key={cl.id} cl={cl} onClick={() => handleCardClick(cl)} />
              ))}
            </motion.div>
          ) : (
            <div>
              {/* Hero banner */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 bg-gradient-to-br from-brand-dark to-brand-dark/90 rounded-3xl p-8 flex items-center gap-6 overflow-hidden relative"
              >
                <div className="absolute right-0 top-0 w-72 h-72 bg-brand-orange/10 rounded-full translate-x-1/3 -translate-y-1/2 blur-3xl pointer-events-none" />
                <div className="w-16 h-16 bg-gradient-to-br from-brand-orange to-brand-pink rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
                  <Sparkles size={28} className="text-white" />
                </div>
                <div className="relative z-10">
                  <h2 className="text-xl font-bold text-white mb-1">Generate your first cover letter</h2>
                  <p className="text-white/50 text-sm leading-relaxed max-w-lg">
                    Our 6-step AI pipeline analyzes your resume against the job description, matches your skills, plans the structure, writes the letter, and quality-checks it — all automatically.
                  </p>
                </div>
              </motion.div>

              <EmptyStateCards onOpenModal={openModal} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CoverLetters;
