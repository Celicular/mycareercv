import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, UploadCloud, FileText, ChevronRight, ChevronLeft,
  Loader2, CheckCircle2, BrainCircuit, Sparkles, ScanSearch,
  ShieldCheck, Pencil, ListChecks, Lightbulb, BarChart2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  uploadResumeForCoverLetter,
  getCoverUploadStatus,
  loadCoverUploadResume,
  generateCoverLetter,
} from '../../api/coverLetterApi';

// ── Constants ────────────────────────────────────────────────────────────────
const TONE_OPTIONS      = ['Professional', 'Confident', 'Enthusiastic', 'Technical', 'Formal', 'Executive'];
const LENGTH_OPTIONS    = [
  { key: 'short',  label: 'Short',  desc: '~150 words' },
  { key: 'medium', label: 'Medium', desc: '~250 words' },
  { key: 'long',   label: 'Long',   desc: '~400 words' },
];
const FOCUS_OPTIONS     = ['Experience', 'Projects', 'Skills', 'Leadership', 'Research', 'Career Change'];
const EXP_LEVEL_OPTIONS = ['Internship', 'Entry', 'Mid', 'Senior', 'Executive'];

// Pipeline stages shown in generation modal
const GEN_STAGES = [
  { id: 'analyze_resume', label: 'Analyzing Resume',       icon: ScanSearch,   color: 'text-brand-orange',  activeBg: 'bg-brand-orange',  duration: 8000  },
  { id: 'analyze_jd',     label: 'Analyzing Job Description', icon: ListChecks, color: 'text-brand-lilac', activeBg: 'bg-brand-lilac',   duration: 8000  },
  { id: 'matching',       label: 'Matching Skills',         icon: BarChart2,    color: 'text-blue-500',      activeBg: 'bg-blue-500',      duration: 3000  },
  { id: 'planning',       label: 'Planning Structure',      icon: Lightbulb,    color: 'text-brand-pink',    activeBg: 'bg-brand-pink',    duration: 8000  },
  { id: 'writing',        label: 'Writing Cover Letter',    icon: Pencil,       color: 'text-violet-500',    activeBg: 'bg-violet-500',    duration: 14000 },
  { id: 'quality',        label: 'Quality Check',           icon: ShieldCheck,  color: 'text-[#00B67A]',     activeBg: 'bg-[#00B67A]',     duration: 8000  },
];

const TOTAL_GEN_DURATION = GEN_STAGES.reduce((s, st) => s + st.duration, 0);

// ── Sub-components ───────────────────────────────────────────────────────────

/** Step indicator dots */
function StepDots({ total, current }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current ? 'w-6 h-2 bg-brand-orange' : i < current ? 'w-2 h-2 bg-brand-orange/40' : 'w-2 h-2 bg-brand-dark/15'
          }`}
        />
      ))}
    </div>
  );
}

/** Upload zone + poll for parsing  */
function UploadZone({ onParsed, uploading, setUploading }) {
  const { user } = useAuth();
  const fileRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [stage, setStage] = useState('idle'); // idle | uploading | processing | done
  const [filename, setFilename] = useState('');
  const pollerRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    const valid = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!valid.includes(file.type)) { setError('Only PDF or DOCX supported.'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('File must be under 2 MB.'); return; }
    setError('');
    setStage('uploading');
    setUploading(true);
    try {
      const res = await uploadResumeForCoverLetter(file);
      setFilename(res.filename);
      if (!res.processing) {
        // DOCX — no pipeline, load directly
        setStage('done');
        onParsed({ resumeJson: null, fileUrl: `/uploads/${user.id}/coveruploads/${res.filename}`, filename: res.filename });
        return;
      }
      setStage('processing');
      // Poll
      pollerRef.current = setInterval(async () => {
        try {
          const status = await getCoverUploadStatus(user.id, res.filename);
          if (status.status === 'complete') {
            clearInterval(pollerRef.current);
            const stem = res.filename.replace(/\.[^.]+$/, '');
            const parsed = await loadCoverUploadResume(user.id, stem);
            setStage('done');
            onParsed({ resumeJson: parsed, fileUrl: `/uploads/${user.id}/coveruploads/${res.filename}`, filename: res.filename });
          }
        } catch { /* retry */ }
      }, 2500);
    } catch (e) {
      setError(e.response?.data?.detail || 'Upload failed.');
      setStage('idle');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => () => clearInterval(pollerRef.current), []);

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => stage === 'idle' && fileRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[160px] ${
          isDragging ? 'border-brand-orange bg-brand-peach/10 scale-[1.01]'
          : stage !== 'idle' ? 'border-brand-dark/10 bg-brand-offwhite cursor-default'
          : 'border-brand-dark/15 hover:border-brand-orange hover:bg-brand-peach/5'
        }`}
      >
        <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" onChange={e => handleFile(e.target.files[0])} />
        {stage === 'idle' && (
          <>
            <div className="w-14 h-14 bg-brand-peach/20 text-brand-orange rounded-2xl flex items-center justify-center mb-4">
              <UploadCloud size={28} />
            </div>
            <p className="font-semibold text-brand-dark text-sm">Drop your resume here or <span className="text-brand-orange underline">browse</span></p>
            <p className="text-xs text-brand-dark/40 mt-1">PDF or DOCX · max 2 MB</p>
          </>
        )}
        {stage === 'uploading' && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="text-brand-orange animate-spin" size={32} />
            <p className="text-sm font-semibold text-brand-dark">Uploading…</p>
          </div>
        )}
        {stage === 'processing' && (
          <div className="flex flex-col items-center gap-3">
            <BrainCircuit className="text-brand-lilac animate-pulse" size={32} />
            <p className="text-sm font-semibold text-brand-dark">Parsing your resume with AI…</p>
            <p className="text-xs text-brand-dark/40">{filename}</p>
          </div>
        )}
        {stage === 'done' && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="text-[#00B67A]" size={32} />
            <p className="text-sm font-semibold text-brand-dark">Resume parsed successfully!</p>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}

/** Generation progress modal (inner overlay) */
function GenerationProgress({ onDone }) {
  const [currentStage, setCurrentStage] = useState(0);
  const [completedStages, setCompletedStages] = useState([]);
  const [progress, setProgress] = useState(0);
  const stageTimerRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    let idx = 0;
    const advance = () => {
      setCompletedStages(prev => [...prev, idx]);
      idx += 1;
      if (idx < GEN_STAGES.length) {
        setCurrentStage(idx);
        stageTimerRef.current = setTimeout(advance, GEN_STAGES[idx].duration);
      }
    };
    stageTimerRef.current = setTimeout(advance, GEN_STAGES[0].duration);
    return () => clearTimeout(stageTimerRef.current);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setProgress(Math.min((elapsed / TOTAL_GEN_DURATION) * 90, 90));
    }, 150);
    return () => clearInterval(id);
  }, []);

  const isComplete = idx => completedStages.includes(idx);
  const isActive   = idx => idx === currentStage && !completedStages.includes(idx);

  return (
    <div className="flex flex-col gap-6">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs font-medium text-brand-dark/40 mb-2">
          <span>Generating</span><span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-brand-offwhite rounded-full overflow-hidden border border-brand-dark/5">
          <motion.div
            className="h-full bg-gradient-to-r from-brand-orange via-brand-pink to-brand-lilac rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ ease: 'easeOut', duration: 0.4 }}
          />
        </div>
      </div>

      {/* Stages */}
      <div className="flex flex-col gap-2.5">
        {GEN_STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const complete = isComplete(idx);
          const active = isActive(idx);
          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-500 ${
                complete ? 'bg-brand-offwhite/60 border-brand-dark/5'
                : active ? 'bg-white border-brand-dark/10 shadow-md'
                : 'bg-transparent border-transparent opacity-35'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-500 ${
                complete ? 'bg-[#00B67A]/15 text-[#00B67A]'
                : active ? `${stage.activeBg} text-white shadow-sm`
                : `bg-brand-offwhite ${stage.color}`
              }`}>
                {complete ? <CheckCircle2 size={15} />
                : active ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}>
                    <Loader2 size={15} />
                  </motion.div>
                ) : <Icon size={15} />}
              </div>
              <span className={`text-sm font-semibold ${complete ? 'text-brand-dark/50' : active ? 'text-brand-dark' : 'text-brand-dark/35'}`}>
                {stage.label}
              </span>
              {active && !complete && (
                <motion.div
                  animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="ml-auto w-2 h-2 rounded-full bg-brand-orange"
                />
              )}
              {complete && <CheckCircle2 size={14} className="ml-auto text-[#00B67A]" />}
            </motion.div>
          );
        })}
      </div>

      <p className="text-center text-xs text-brand-dark/30 font-medium">
        This typically takes 45–90 seconds. Please don't close this window.
      </p>
    </div>
  );
}

// ── Main Modal ───────────────────────────────────────────────────────────────
const STEPS = ['Resume', 'Job Description', 'Preferences'];

const CoverLetterGeneratorModal = ({ onClose, onGenerated, existingResumes = [] }) => {
  // Step tracking: 0=Resume, 1=JD, 2=Preferences, 3=Generating
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  // Step 0 — Resume selection
  const [resumeMode, setResumeMode] = useState(null); // 'existing' | 'upload'
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [uploadedResumeJson, setUploadedResumeJson] = useState(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState(null);

  // Step 1 — JD
  const [jdText, setJdText] = useState('');

  // Step 2 — Preferences
  const [docName, setDocName]           = useState('');
  const [tone, setTone]                 = useState('professional');
  const [length, setLength]             = useState('medium');
  const [focus, setFocus]               = useState('experience');
  const [expLevel, setExpLevel]         = useState('mid');
  const [companyName, setCompanyName]   = useState('');
  const [hiringManager, setHiringManager] = useState('');

  // Step 3 — Generating
  const [generating, setGenerating]     = useState(false);
  const [genError, setGenError]         = useState('');

  const canProceedStep0 = resumeMode === 'existing' ? !!selectedResumeId
    : resumeMode === 'upload' ? !!uploadedResumeJson
    : false;
  const canProceedStep1 = jdText.trim().length >= 50;
  const canProceedStep2 = docName.trim().length >= 2;

  const handleGenerate = async () => {
    setStep(3);
    setGenerating(true);
    setGenError('');

    const payload = {
      document_name:    docName.trim(),
      job_description:  jdText.trim(),
      preferences: {
        tone:             tone.toLowerCase(),
        length:           length,
        experience_level: expLevel.toLowerCase(),
        focus:            focus.toLowerCase(),
        company_name:     companyName.trim(),
        hiring_manager:   hiringManager.trim(),
      },
    };

    if (resumeMode === 'existing') {
      payload.source_resume_id = selectedResumeId;
    } else {
      payload.resume_json    = uploadedResumeJson;
      payload.resume_file_url = uploadedFileUrl;
    }

    try {
      const result = await generateCoverLetter(payload);
      setGenerating(false);
      onGenerated(result);
    } catch (e) {
      const detail = e.response?.data?.detail || 'Generation failed. Please try again.';
      setGenError(detail);
      setGenerating(false);
    }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };
  const panelVariants = {
    hidden: { scale: 0.93, opacity: 0, y: 20 },
    visible: { scale: 1, opacity: 1, y: 0, transition: { type: 'spring', bounce: 0.22, duration: 0.5 } },
    exit: { scale: 0.93, opacity: 0, y: 20 },
  };

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 32 : -32, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -32 : 32, opacity: 0 }),
  };
  const [direction, setDirection] = useState(1);

  const goNext = () => { setDirection(1); setStep(s => s + 1); setError(''); };
  const goPrev = () => { setDirection(-1); setStep(s => s - 1); setError(''); };

  return (
    <AnimatePresence>
      <motion.div
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        className="fixed inset-0 z-[120] bg-brand-dark/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={e => { if (e.target === e.currentTarget && !generating) onClose(); }}
      >
        <motion.div
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl border border-brand-dark/10 overflow-hidden"
        >
          {/* Top accent bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-brand-orange via-brand-pink to-brand-lilac" />

          <div className="p-7">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={16} className="text-brand-orange" />
                  <span className="text-xs font-bold uppercase tracking-widest text-brand-orange">AI Cover Letter</span>
                </div>
                <h2 className="text-xl font-bold text-brand-dark tracking-tight">
                  {step === 3 ? 'Generating Your Letter…' : STEPS[step] || 'Generating'}
                </h2>
              </div>
              {!generating && (
                <button onClick={onClose} className="p-2 text-brand-dark/40 hover:text-brand-dark hover:bg-brand-offwhite rounded-xl transition-colors">
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Step dots (hidden during generation) */}
            {step < 3 && <div className="mb-6"><StepDots total={STEPS.length} current={step} /></div>}

            {/* Step content */}
            <AnimatePresence mode="wait" custom={direction}>
              {step === 0 && (
                <motion.div key="step0" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22 }}
                  className="flex flex-col gap-5">
                  <p className="text-sm text-brand-dark/60 font-medium">How would you like to provide your resume?</p>
                  {/* Mode selector */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { mode: 'existing', icon: FileText, label: 'Select Existing', sub: 'Choose from your saved resumes' },
                      { mode: 'upload',   icon: UploadCloud, label: 'Upload New', sub: "PDF or DOCX — we'll parse it" },
                    ].map(({ mode, icon: Icon, label, sub }) => (
                      <button key={mode} onClick={() => setResumeMode(mode)}
                        className={`flex flex-col items-center text-center gap-2 p-5 rounded-2xl border-2 transition-all duration-200 ${
                          resumeMode === mode ? 'border-brand-orange bg-brand-peach/10' : 'border-brand-dark/10 hover:border-brand-orange/40'
                        }`}>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${resumeMode === mode ? 'bg-brand-orange text-white' : 'bg-brand-offwhite text-brand-dark/50'}`}>
                          <Icon size={22} />
                        </div>
                        <span className="font-bold text-sm text-brand-dark">{label}</span>
                        <span className="text-xs text-brand-dark/40">{sub}</span>
                      </button>
                    ))}
                  </div>

                  {/* Existing resume list */}
                  <AnimatePresence>
                    {resumeMode === 'existing' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                        {existingResumes.length === 0 ? (
                          <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                            <AlertCircle size={16} className="text-amber-500 shrink-0" />
                            <p className="text-xs text-amber-700 font-medium">No saved resumes found. Upload a new one instead.</p>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 max-h-44 overflow-y-auto pr-1">
                            {existingResumes.map(r => (
                              <button key={r.id} onClick={() => setSelectedResumeId(r.id)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                                  selectedResumeId === r.id ? 'border-brand-orange bg-brand-peach/10' : 'border-brand-dark/10 hover:border-brand-orange/40'
                                }`}>
                                <FileText size={16} className={selectedResumeId === r.id ? 'text-brand-orange' : 'text-brand-dark/40'} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-brand-dark truncate">{r.document_name}</p>
                                  <p className="text-xs text-brand-dark/40">{new Date(r.created_at).toLocaleDateString()}</p>
                                </div>
                                {selectedResumeId === r.id && <CheckCircle2 size={16} className="text-brand-orange shrink-0" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Upload zone */}
                  <AnimatePresence>
                    {resumeMode === 'upload' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                        <UploadZone
                          uploading={uploading}
                          setUploading={setUploading}
                          onParsed={({ resumeJson, fileUrl }) => {
                            setUploadedResumeJson(resumeJson);
                            setUploadedFileUrl(fileUrl);
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div key="step1" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22 }}
                  className="flex flex-col gap-4">
                  <p className="text-sm text-brand-dark/60 font-medium">Paste the job description below.</p>
                  <textarea
                    value={jdText}
                    onChange={e => setJdText(e.target.value)}
                    placeholder="Paste the full job description here (role, requirements, responsibilities)…"
                    rows={9}
                    className="w-full rounded-xl border border-brand-dark/15 bg-brand-offwhite/60 px-4 py-3 text-sm text-brand-dark placeholder:text-brand-dark/30 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange resize-none font-mono leading-relaxed"
                  />
                  <p className={`text-xs font-medium ${jdText.trim().length < 50 ? 'text-red-400' : 'text-[#00B67A]'}`}>
                    {jdText.trim().length < 50 ? `${50 - jdText.trim().length} more characters needed` : '✓ Good length'}
                  </p>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22 }}
                  className="flex flex-col gap-5">
                  {/* Document name */}
                  <div>
                    <label className="text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5 block">Letter Name *</label>
                    <input
                      value={docName}
                      onChange={e => setDocName(e.target.value)}
                      placeholder="e.g. Software Engineer @ Google"
                      className="w-full rounded-xl border border-brand-dark/15 bg-brand-offwhite/60 px-4 py-2.5 text-sm text-brand-dark placeholder:text-brand-dark/30 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5 block">Company Name</label>
                      <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Inc."
                        className="w-full rounded-xl border border-brand-dark/15 bg-brand-offwhite/60 px-4 py-2.5 text-sm text-brand-dark placeholder:text-brand-dark/30 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-1.5 block">Hiring Manager</label>
                      <input value={hiringManager} onChange={e => setHiringManager(e.target.value)} placeholder="Jane Smith (optional)"
                        className="w-full rounded-xl border border-brand-dark/15 bg-brand-offwhite/60 px-4 py-2.5 text-sm text-brand-dark placeholder:text-brand-dark/30 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange" />
                    </div>
                  </div>

                  {/* Tone */}
                  <div>
                    <label className="text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-2 block">Tone</label>
                    <div className="flex flex-wrap gap-2">
                      {TONE_OPTIONS.map(t => (
                        <button key={t} onClick={() => setTone(t.toLowerCase())}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${tone === t.toLowerCase() ? 'bg-brand-orange text-white border-brand-orange' : 'bg-white border-brand-dark/15 text-brand-dark/60 hover:border-brand-orange/50'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Length + Experience Level */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-2 block">Length</label>
                      <div className="flex flex-col gap-1.5">
                        {LENGTH_OPTIONS.map(l => (
                          <button key={l.key} onClick={() => setLength(l.key)}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${length === l.key ? 'bg-brand-orange/10 border-brand-orange text-brand-orange' : 'bg-white border-brand-dark/10 text-brand-dark/60 hover:border-brand-orange/40'}`}>
                            <span>{l.label}</span><span className="opacity-60">{l.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-2 block">Experience Level</label>
                      <div className="flex flex-col gap-1.5">
                        {EXP_LEVEL_OPTIONS.map(e => (
                          <button key={e} onClick={() => setExpLevel(e.toLowerCase())}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left ${expLevel === e.toLowerCase() ? 'bg-brand-orange/10 border-brand-orange text-brand-orange' : 'bg-white border-brand-dark/10 text-brand-dark/60 hover:border-brand-orange/40'}`}>
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Focus */}
                  <div>
                    <label className="text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-2 block">Focus</label>
                    <div className="flex flex-wrap gap-2">
                      {FOCUS_OPTIONS.map(f => (
                        <button key={f} onClick={() => setFocus(f.toLowerCase())}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${focus === f.toLowerCase() ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white border-brand-dark/15 text-brand-dark/60 hover:border-brand-dark/40'}`}>
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" variants={slideVariants} custom={1} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22 }}>
                  {genError ? (
                    <div className="flex flex-col items-center gap-4 py-6">
                      <AlertCircle size={40} className="text-red-500" />
                      <p className="text-sm font-semibold text-red-600 text-center">{genError}</p>
                      <button onClick={() => { setStep(2); setGenError(''); }}
                        className="px-5 py-2.5 bg-brand-dark text-white rounded-xl text-sm font-bold hover:-translate-y-0.5 transition-transform">
                        Go Back
                      </button>
                    </div>
                  ) : (
                    <GenerationProgress onDone={() => {}} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer navigation */}
            {step < 3 && (
              <div className="flex items-center justify-between mt-7">
                <button
                  onClick={goPrev}
                  disabled={step === 0}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-brand-dark/60 hover:text-brand-dark hover:bg-brand-offwhite disabled:opacity-0 transition-all"
                >
                  <ChevronLeft size={16} /> Back
                </button>

                {step < 2 ? (
                  <button
                    onClick={goNext}
                    disabled={step === 0 ? !canProceedStep0 : !canProceedStep1}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-orange text-white rounded-xl text-sm font-bold shadow-md hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all"
                  >
                    Continue <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={handleGenerate}
                    disabled={!canProceedStep2}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-orange to-brand-pink text-white rounded-xl text-sm font-bold shadow-md hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all"
                  >
                    <Sparkles size={15} /> Generate Letter
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CoverLetterGeneratorModal;
