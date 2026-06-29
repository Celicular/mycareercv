import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, FileImage, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { ingestTemplate, getIngestionStatus, getIngestionResult } from '../../api/templateApi';
import { useEditor } from '../../context/EditorContext';

// ── Stage animation config ──────────────────────────────────────────────────
const STAGE_ICONS = {
  normalising: '🖼️',
  detecting:   '🔍',
  extracting:  '📝',
  inferring:   '🧠',
  mapping:     '📐',
  assembling:  '🧩',
  complete:    '✅',
};

const ACCEPTED_TYPES = '.jpg,.jpeg,.png,.webp,.pdf';
const ACCEPTED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export default function IngestionModal({ onClose }) {
  const { loadAllPages, setTemplateMeta, setIsDirty, pushHistory, setIngestionReview } = useEditor();

  // Modal states: 'upload' | 'processing' | 'error' | 'complete'
  const [phase, setPhase] = useState('upload');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  // Processing state
  const [progress, setProgress] = useState(0);
  const [stageLabel, setStageLabel] = useState('');
  const [stageId, setStageId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const pollingRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── File selection ─────────────────────────────────────────────────────
  const handleFile = useCallback((f) => {
    if (!f) return;

    // Validate type
    if (!ACCEPTED_MIMES.includes(f.type)) {
      setErrorMsg(`Unsupported file type: ${f.type}. Use JPG, PNG, WEBP, or PDF.`);
      setPhase('error');
      return;
    }

    // Validate size
    if (f.size > MAX_FILE_SIZE) {
      setErrorMsg('File too large. Maximum size is 20 MB.');
      setPhase('error');
      return;
    }

    setFile(f);

    // Generate preview thumbnail
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(f);
    } else {
      setPreview(null); // No preview for PDFs
    }
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => setDragOver(false), []);

  // ── Start ingestion ───────────────────────────────────────────────────
  const startIngestion = async () => {
    if (!file) return;

    setPhase('processing');
    setProgress(0);
    setStageLabel('Starting pipeline…');
    setStageId('queued');

    try {
      const { job_id } = await ingestTemplate(file);

      // Start polling
      pollingRef.current = setInterval(async () => {
        try {
          const status = await getIngestionStatus(job_id);

          setProgress(status.progress || 0);
          setStageLabel(status.stage_label || '');
          setStageId(status.current_stage || '');

          if (status.status === 'complete') {
            clearInterval(pollingRef.current);
            pollingRef.current = null;

            // Fetch result
            const result = await getIngestionResult(job_id);

            // Load into canvas
            const parsed = JSON.parse(result.fabric_json);
            if (parsed.version === 1 && Array.isArray(parsed.pages)) {
              loadAllPages(parsed.pages);
            } else {
              loadAllPages([result.fabric_json]);
            }

            // Set template metadata
            setTemplateMeta({
              id: null,
              name: 'Imported Template',
              description: 'Template created from image ingestion',
            });

            // Set ingestion review data if there are flagged elements
            if (result.flagged_elements?.length > 0) {
              setIngestionReview({
                confidences: result.template_metadata?.ingestionConfidences || {},
                flaggedIds: result.flagged_elements,
              });
            }

            setIsDirty(true);
            pushHistory();
            setPhase('complete');

            // Auto-close after a brief success animation
            setTimeout(() => onClose(), 1500);

          } else if (status.status === 'failed') {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            setErrorMsg(status.error || 'Pipeline failed unexpectedly.');
            setPhase('error');
          }
        } catch (pollErr) {
          // Polling error — keep trying unless it's a 404
          if (pollErr?.response?.status === 404) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            setErrorMsg('Ingestion job not found.');
            setPhase('error');
          }
        }
      }, 1500); // Poll every 1.5s

    } catch (err) {
      const detail = err?.response?.data?.detail || err.message || 'Upload failed.';
      setErrorMsg(detail);
      setPhase('error');
    }
  };

  // ── Retry ─────────────────────────────────────────────────────────────
  const retry = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setPhase('upload');
    setFile(null);
    setPreview(null);
    setErrorMsg('');
    setProgress(0);
  };

  // ── Cleanup on unmount ────────────────────────────────────────────────
  React.useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="bg-[#16161a] w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#1c1c21]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-orange/10 rounded-lg text-brand-orange">
              <Upload size={18} />
            </div>
            <div>
              <h2 className="text-white font-semibold leading-none mb-1 tracking-wider">Import Template</h2>
              <p className="text-[11px] text-white/40 font-medium">
                {phase === 'upload' && 'Upload a resume image or PDF'}
                {phase === 'processing' && 'AI is analyzing your template…'}
                {phase === 'error' && 'Something went wrong'}
                {phase === 'complete' && 'Template imported successfully!'}
              </p>
            </div>
          </div>
          {phase !== 'processing' && (
            <button
              onClick={onClose}
              className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div className="p-6">

          {/* ═══ UPLOAD PHASE ═══ */}
          {phase === 'upload' && (
            <div className="flex flex-col gap-4">
              {/* Drop zone */}
              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative flex flex-col items-center justify-center gap-3 py-10 px-6
                  rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200
                  ${dragOver
                    ? 'border-brand-orange bg-brand-orange/10 scale-[1.02]'
                    : file
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-white/15 bg-[#1e1e22] hover:border-white/30 hover:bg-[#222228]'
                  }
                `}
              >
                {file ? (
                  <>
                    {preview ? (
                      <img
                        src={preview}
                        alt="Preview"
                        className="max-h-32 rounded-lg shadow-lg border border-white/10"
                      />
                    ) : (
                      <div className="w-20 h-28 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                        <FileImage size={28} className="text-white/30" />
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-xs font-semibold text-white/80">{file.name}</p>
                      <p className="text-[10px] text-white/40 mt-0.5">
                        {(file.size / 1024).toFixed(0)} KB • Click to change
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-brand-orange/10 rounded-xl">
                      <Upload size={24} className="text-brand-orange" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-white/80">
                        Drop your resume template here
                      </p>
                      <p className="text-[10px] text-white/40 mt-1">
                        or click to browse • JPG, PNG, WEBP, PDF • Max 20 MB
                      </p>
                    </div>
                  </>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>

              {/* Start button */}
              <button
                onClick={startIngestion}
                disabled={!file}
                className={`
                  w-full py-3 rounded-xl text-sm font-bold transition-all duration-200
                  ${file
                    ? 'bg-brand-orange hover:bg-brand-orange/90 text-white shadow-lg shadow-brand-orange/20 hover:shadow-brand-orange/30'
                    : 'bg-[#2A2A30] text-white/30 cursor-not-allowed'
                  }
                `}
              >
                {file ? '🚀 Start Import' : 'Select a file to continue'}
              </button>
            </div>
          )}

          {/* ═══ PROCESSING PHASE ═══ */}
          {phase === 'processing' && (
            <div className="flex flex-col items-center gap-5 py-4">
              {/* Animated stage icon */}
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-brand-orange/10 flex items-center justify-center text-2xl animate-pulse">
                  {STAGE_ICONS[stageId] || '⏳'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-brand-orange rounded-full flex items-center justify-center">
                  <Loader2 size={12} className="text-white animate-spin" />
                </div>
              </div>

              {/* Stage label */}
              <div className="text-center">
                <p className="text-sm font-semibold text-white/90">{stageLabel}</p>
                <p className="text-[10px] text-white/40 mt-1">
                  This usually takes 15–25 seconds
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full">
                <div className="w-full h-2 bg-[#2A2A30] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-orange to-amber-400 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-white/40 text-right mt-1.5 tabular-nums">
                  {Math.round(progress * 100)}%
                </p>
              </div>

              {/* Stage dots */}
              <div className="flex items-center gap-2">
                {Object.keys(STAGE_ICONS).filter(k => k !== 'complete').map((key) => (
                  <div
                    key={key}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      key === stageId
                        ? 'bg-brand-orange scale-125'
                        : Object.keys(STAGE_ICONS).indexOf(key) < Object.keys(STAGE_ICONS).indexOf(stageId)
                          ? 'bg-brand-orange/50'
                          : 'bg-white/15'
                    }`}
                    title={key}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ═══ ERROR PHASE ═══ */}
          {phase === 'error' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle size={28} className="text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-red-300">Import Failed</p>
                <p className="text-[11px] text-white/50 mt-2 leading-relaxed max-w-xs">
                  {errorMsg}
                </p>
              </div>
              <button
                onClick={retry}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2A2A30] hover:bg-[#34343A] text-white/80 hover:text-white text-xs font-semibold transition-all border border-white/5"
              >
                <RefreshCw size={13} /> Try Again
              </button>
            </div>
          )}

          {/* ═══ COMPLETE PHASE ═══ */}
          {phase === 'complete' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center"
                   style={{ animation: 'scaleIn 0.3s ease-out' }}>
                <CheckCircle2 size={28} className="text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-emerald-300">Template Imported!</p>
                <p className="text-[11px] text-white/50 mt-1">
                  Loading into the editor…
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inline keyframe animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes scaleIn {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
