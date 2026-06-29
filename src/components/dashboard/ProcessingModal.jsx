import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ScanSearch, BrainCircuit, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
import axiosClient from '../../api/axiosClient';

// Pipeline stages — mirrors the backend pipeline exactly
const STAGES = [
  {
    id: 'upload',
    label: 'Uploading Resume',
    sublabel: 'Securing your file on our servers',
    icon: FileText,
    color: 'text-brand-orange',
    bg: 'bg-brand-peach/20',
    activeBg: 'bg-brand-orange',
    duration: 0,        // completes instantly (upload just happened)
  },
  {
    id: 'rasterize',
    label: 'Rasterizing Pages',
    sublabel: 'Converting PDF pages to images',
    icon: ScanSearch,
    color: 'text-brand-lilac',
    bg: 'bg-brand-lilac/20',
    activeBg: 'bg-brand-lilac',
    duration: 4000,
  },
  {
    id: 'extract',
    label: 'Extracting Text',
    sublabel: 'Nemotron-Parse reading your resume',
    icon: ScanSearch,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    activeBg: 'bg-blue-500',
    duration: 18000,
  },
  {
    id: 'structure',
    label: 'AI Structuring',
    sublabel: 'Llama 3.1 building your data profile',
    icon: BrainCircuit,
    color: 'text-brand-pink',
    bg: 'bg-brand-pink/20',
    activeBg: 'bg-brand-pink',
    duration: 14000,
  },
  {
    id: 'validate',
    label: 'Validating & Saving',
    sublabel: 'Finalising your resume profile',
    icon: ShieldCheck,
    color: 'text-[#00B67A]',
    bg: 'bg-[#00B67A]/10',
    activeBg: 'bg-[#00B67A]',
    duration: 2000,
  },
];

const POLL_INTERVAL_MS = 2500;

const ProcessingModal = ({ uploadData, onComplete, onClose }) => {
  const { filename, user_id } = uploadData;

  const [currentStage, setCurrentStage] = useState(0);
  const [completedStages, setCompletedStages] = useState([]);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);

  const pollerRef    = useRef(null);
  const stageTimerRef = useRef(null);
  const startTimeRef  = useRef(Date.now());

  // Estimate total duration for the progress bar
  const totalDuration = STAGES.reduce((s, st) => s + st.duration, 1000);

  // ── Animate through stages based on estimated timing ─────────────────────
  useEffect(() => {
    let stageIdx = 0;
    // Stage 0 is "upload done" — mark immediately
    setCompletedStages([0]);
    setCurrentStage(1);

    const advanceStage = () => {
      stageIdx += 1;
      if (stageIdx < STAGES.length) {
        setCurrentStage(stageIdx);
        const nextDuration = STAGES[stageIdx]?.duration ?? 3000;
        stageTimerRef.current = setTimeout(advanceStage, nextDuration);
      }
    };

    stageTimerRef.current = setTimeout(advanceStage, STAGES[1].duration);

    return () => clearTimeout(stageTimerRef.current);
  }, []);

  // ── Animate progress bar (time-based estimate) ───────────────────────────
  useEffect(() => {
    if (done) return;
    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / totalDuration) * 100, 95); // cap at 95 until polled done
      setProgress(pct);
    };

    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [totalDuration, done]);

  // ── Poll backend for real completion ─────────────────────────────────────
  useEffect(() => {
    pollerRef.current = setInterval(async () => {
      try {
        const res = await axiosClient.get(`/resume/status/${user_id}/${filename}`);
        if (res.data.status === 'complete') {
          clearInterval(pollerRef.current);
          clearTimeout(stageTimerRef.current);
          // Mark all stages complete
          setCompletedStages(STAGES.map((_, i) => i));
          setCurrentStage(STAGES.length);
          setProgress(100);
          setDone(true);
        }
      } catch {
        // Silently ignore — will retry on next interval
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(pollerRef.current);
  }, [filename, user_id]);

  // ── When done, wait briefly then notify parent ────────────────────────────
  useEffect(() => {
    if (done) {
      const id = setTimeout(() => onComplete?.({ filename, user_id }), 1200);
      return () => clearTimeout(id);
    }
  }, [done, onComplete, filename, user_id]);

  const isStageComplete = (idx) => completedStages.includes(idx) || done;
  const isStageActive   = (idx) => idx === currentStage && !done;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-brand-dark/50 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 24 }}
          transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
          className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-brand-dark/10"
        >
          {/* Top gradient bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-brand-orange via-brand-pink to-brand-lilac" />

          <div className="p-8">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-offwhite border border-brand-dark/10 text-xs font-semibold uppercase tracking-widest text-brand-dark/60 mb-4">
                <motion.div
                  animate={done ? {} : { rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                >
                  {done
                    ? <CheckCircle2 size={14} className="text-[#00B67A]" />
                    : <Loader2 size={14} className="text-brand-orange" />
                  }
                </motion.div>
                {done ? 'Processing Complete' : 'Processing Resume'}
              </div>
              <h2 className="text-2xl font-bold text-brand-dark tracking-tight">
                {done ? 'Your resume is ready!' : 'Analysing your resume…'}
              </h2>
              <p className="text-sm text-brand-dark/50 mt-1 font-mono truncate max-w-xs mx-auto">
                {filename}
              </p>
            </div>

            {/* Progress bar */}
            <div className="mb-8">
              <div className="flex justify-between text-xs font-medium text-brand-dark/40 mb-2">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-brand-offwhite rounded-full overflow-hidden border border-brand-dark/5">
                <motion.div
                  className="h-full bg-gradient-to-r from-brand-orange via-brand-pink to-brand-lilac rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: 'easeOut', duration: 0.4 }}
                />
              </div>
            </div>

            {/* Segmented stages */}
            <div className="flex flex-col gap-3">
              {STAGES.map((stage, idx) => {
                const Icon     = stage.icon;
                const complete = isStageComplete(idx);
                const active   = isStageActive(idx);

                return (
                  <motion.div
                    key={stage.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl border transition-all duration-500 ${
                      complete
                        ? 'bg-brand-offwhite/60 border-brand-dark/5'
                        : active
                        ? 'bg-white border-brand-dark/10 shadow-md'
                        : 'bg-transparent border-transparent opacity-40'
                    }`}
                  >
                    {/* Icon bubble */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 ${
                      complete
                        ? 'bg-[#00B67A]/15 text-[#00B67A]'
                        : active
                        ? `${stage.activeBg} text-white shadow-sm`
                        : `${stage.bg} ${stage.color}`
                    }`}>
                      {complete
                        ? <CheckCircle2 size={16} />
                        : active
                        ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                          >
                            <Loader2 size={16} />
                          </motion.div>
                        )
                        : <Icon size={16} />
                      }
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold leading-tight ${
                        complete ? 'text-brand-dark/60' : active ? 'text-brand-dark' : 'text-brand-dark/40'
                      }`}>
                        {stage.label}
                      </p>
                      {(active || complete) && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="text-xs text-brand-dark/40 mt-0.5 leading-tight"
                        >
                          {complete ? 'Done' : stage.sublabel}
                        </motion.p>
                      )}
                    </div>

                    {/* Stage done tick */}
                    {complete && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', bounce: 0.5 }}
                      >
                        <CheckCircle2 size={16} className="text-[#00B67A] shrink-0" />
                      </motion.div>
                    )}

                    {/* Active pulse dot */}
                    {active && !complete && (
                      <motion.div
                        animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                        className="w-2 h-2 rounded-full bg-brand-orange shrink-0"
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Footer note */}
            <p className="text-center text-xs text-brand-dark/30 mt-8 font-medium">
              {done
                ? 'Your resume has been successfully parsed and structured.'
                : 'This typically takes 30–60 seconds depending on resume length.'
              }
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProcessingModal;
