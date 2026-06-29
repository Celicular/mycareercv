import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import ProcessingModal from '../components/dashboard/ProcessingModal';
import ResumeBuilderForm from '../components/dashboard/ResumeBuilderForm';
import { useAuth } from '../context/AuthContext';
import { UploadCloud, PenLine, Loader2, FileText, Plus, ChevronRight, Lock, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axiosClient from '../api/axiosClient';
import axios from 'axios';
import { loadParsedResume, listResumes } from '../api/resumeApi';

const Dashboard = () => {
  const { user, isLoading, openAuthModal } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  const [isLocked, setIsLocked] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(null);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      const trialEnd = new Date(user.trial_end_date);
      const now = new Date();
      if (user.trial_end_date && trialEnd < now && user.subscription_status !== 'active') {
        setIsLocked(true);
      } else if (user.trial_end_date && user.subscription_status !== 'active') {
        const diffTime = Math.abs(trialEnd - now);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDaysRemaining(diffDays);
      }
    }
  }, [user]);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [processingData, setProcessingData] = useState(null); // triggers processing modal
  const [builderData, setBuilderData] = useState(null);       // triggers resume builder form
  const [loadingResume, setLoadingResume] = useState(false);  // spinner between modal & form
  const [loadError, setLoadError] = useState('');             // surfaced fetch error

  const [resumes, setResumes] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const fetchResumes = async () => {
    try {
      const data = await listResumes();
      setResumes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const handleFileSelect = async (file) => {
    if (!file) return;

    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!validTypes.includes(file.type)) {
      setUploadError('Only PDF or DOCX files are supported.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('File must be under 2MB.');
      return;
    }

    setUploadError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axiosClient.post('/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Open the processing modal — it will handle polling itself
      setProcessingData(res.data);
    } catch (err) {
      setUploadError(err.response?.data?.detail || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleProcessingComplete = async ({ filename, user_id }) => {
    setProcessingData(null);
    setLoadError('');
    setLoadingResume(true);
    // Strip extension — backend expects stem like "upload-20260623145906-d7cffeb8"
    const stem = filename.replace(/\.[^.]+$/, '');
    try {
      const parsed = await loadParsedResume(user_id, stem);
      setBuilderData({ initialData: parsed, mode: 'upload', originalUploadFilename: filename });
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || 'Unknown error';
      console.error('Failed to load parsed resume:', detail);
      setLoadError(`Could not load parsed resume data: ${detail}. Opening form in manual mode.`);
      // Still open the form — user can fill manually
      setTimeout(() => {
        setLoadError('');
        setBuilderData({ initialData: null, mode: 'upload', originalUploadFilename: filename });
      }, 3000);
    } finally {
      setLoadingResume(false);
    }
  };

  const handleEditResume = async (resume) => {
    // If the resume has a template or canvas saved, go straight to the editor
    if (resume.template_id || resume.canvas_json_url) {
      const targetTemplateId = resume.template_id || 1; // Fallback to 1 if missing but has canvas
      navigate(`/template-editor/${targetTemplateId}?resume_id=${resume.id}`);
      return;
    }

    // Fallback: If it's an older resume without a template_id, open the form to let them pick one
    try {
      setLoadingResume(true);
      const baseUrl = axiosClient.defaults.baseURL.replace(/\/api$/, '');
      const res = await axios.get(baseUrl + resume.json_url);
      setBuilderData({ initialData: res.data, mode: 'edit', originalUploadFilename: resume.original_upload_filename });
    } catch (err) {
      console.error(err);
      setLoadError('Failed to load resume data.');
      setTimeout(() => setLoadError(''), 3000);
    } finally {
      setLoadingResume(false);
    }
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="flex h-screen bg-brand-offwhite items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={36} className="text-brand-orange animate-spin" />
          <p className="text-brand-dark font-medium">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="flex h-screen bg-brand-offwhite">
        <Sidebar currentPath="/dashboard" />
        <main className="flex-1 overflow-y-auto p-12 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-3xl p-10 text-center shadow-xl border border-brand-dark/10">
            <div className="w-20 h-20 bg-brand-dark/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="text-brand-dark opacity-50" size={32} />
            </div>
            <h2 className="text-3xl font-heading font-bold text-brand-dark mb-4">Trial Expired</h2>
            <p className="text-brand-dark/70 mb-8">
              Your 3-day free trial has come to an end. Upgrade to a premium plan to unlock all features, unlimited resume generations, and our powerful ATS checker.
            </p>
            <button 
              onClick={() => openAuthModal('payment')}
              className="w-full py-4 bg-brand-orange hover:bg-[#E65C00] text-white rounded-xl font-bold transition-colors"
            >
              View Pricing Plans
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-brand-offwhite overflow-hidden font-body selection:bg-brand-orange selection:text-white">
      <Sidebar />

      {/* Processing Modal */}
      {processingData && (
        <ProcessingModal
          uploadData={processingData}
          onComplete={handleProcessingComplete}
          onClose={() => setProcessingData(null)}
        />
      )}

      {/* Loading overlay — while fetching parsed JSON between modal and form */}
      <AnimatePresence>
        {loadingResume && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[105] bg-brand-dark/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4"
          >
            <Loader2 size={36} className="text-brand-orange animate-spin" />
            <p className="text-white font-semibold text-base">Loading your resume data…</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Load-error toast */}
      <AnimatePresence>
        {loadError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[106] bg-red-600 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl max-w-sm text-center"
          >
            {loadError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resume Builder Form */}
      {builderData && (
        <ResumeBuilderForm
          initialData={builderData.initialData}
          mode={builderData.mode}
          originalUploadFilename={builderData.originalUploadFilename || 'nan'}
          onClose={() => {
            setBuilderData(null);
            fetchResumes(); // refresh list after saving
          }}
        />
      )}

      <main className="flex-1 overflow-y-auto mt-16 md:mt-0 p-6 md:p-10">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <header className="mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-brand-dark mb-2 tracking-tight">
              My Resumes
            </h1>
            <p className="text-brand-dark/60 font-medium">
              Upload an existing resume or create a new one from scratch.
            </p>
          </header>

          {/* Trial Warning Banner */}
          <AnimatePresence>
            {daysRemaining !== null && daysRemaining <= 2 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-8 p-4 bg-brand-orange/10 border border-brand-orange/20 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-brand-orange shrink-0" size={24} />
                  <div>
                    <h3 className="font-bold text-brand-dark text-sm md:text-base">Your Free Trial ends soon!</h3>
                    <p className="text-brand-dark/70 text-xs md:text-sm">You have {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining before your dashboard is locked.</p>
                  </div>
                </div>
                <button 
                  onClick={() => openAuthModal('payment')}
                  className="px-6 py-2 bg-brand-orange hover:bg-[#E65C00] text-white rounded-xl text-sm font-bold shadow-md transition-colors shrink-0 whitespace-nowrap"
                >
                  Upgrade Now
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Message */}
          <AnimatePresence>
            {uploadError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium flex items-center justify-between"
              >
                {uploadError}
                <button
                  onClick={() => setUploadError('')}
                  className="ml-4 text-red-300 hover:text-red-500 text-xl leading-none font-bold"
                >
                  ×
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {loadingList ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-orange" size={40} /></div>
          ) : resumes.length > 0 ? (
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={() => setBuilderData({ initialData: null, mode: 'scratch', originalUploadFilename: 'nan' })}
                  className="flex items-center gap-2 px-5 py-2.5 bg-brand-dark text-white rounded-xl text-sm font-bold shadow-md hover:-translate-y-0.5 transition-transform"
                >
                  <Plus size={16} /> New Resume
                </button>
                <button
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-brand-dark/10 text-brand-dark rounded-xl text-sm font-bold shadow-sm hover:border-brand-orange transition-colors"
                >
                  <UploadCloud size={16} /> {uploading ? 'Uploading...' : 'Upload Existing'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {resumes.map(r => (
                  <div key={r.id} onClick={() => handleEditResume(r)} className="bg-white rounded-2xl p-5 border border-brand-dark/5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col cursor-pointer">
                    <div className="w-12 h-12 bg-brand-orange/10 text-brand-orange rounded-xl flex items-center justify-center mb-4">
                      <FileText size={24} />
                    </div>
                    <h3 className="font-bold text-brand-dark text-lg truncate mb-1">{r.document_name}</h3>
                    <p className="text-xs text-brand-dark/50 mb-4">{new Date(r.created_at).toLocaleDateString()}</p>
                    <div className="mt-auto pt-4 border-t border-brand-dark/5 flex items-center justify-between text-xs font-semibold text-brand-orange">
                      <span>Edit Resume</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {/* ── Upload Resume Card ───────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={`relative bg-white rounded-3xl border-2 border-dashed p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[320px] group
                  ${isDragging
                    ? 'border-brand-orange bg-brand-peach/10 scale-[1.02]'
                    : 'border-brand-dark/15 hover:border-brand-orange hover:shadow-xl hover:-translate-y-1'
                  }
                  ${uploading ? 'opacity-60 cursor-wait' : ''}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                />

                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 transition-all duration-300
                  ${isDragging
                    ? 'bg-brand-orange text-white scale-110'
                    : 'bg-brand-peach/20 text-brand-orange group-hover:scale-110 group-hover:bg-brand-orange group-hover:text-white'
                  }
                `}>
                  <UploadCloud size={36} />
                </div>

                <h3 className="text-2xl font-bold text-brand-dark mb-3">
                  {uploading ? 'Uploading…' : 'Upload Your Resume'}
                </h3>
                <p className="text-brand-dark/60 text-sm leading-relaxed max-w-xs">
                  {isDragging
                    ? 'Drop your file here!'
                    : 'Drag & drop or click to upload. PDF or DOCX, up to 2 MB.'}
                </p>

                <div className="mt-6 px-5 py-2.5 rounded-full border border-brand-dark/15 text-sm font-medium text-brand-dark/70 group-hover:border-brand-orange group-hover:text-brand-orange transition-colors">
                  {uploading ? 'Uploading…' : 'Choose File'}
                </div>
              </motion.div>

              {/* ── Start From Scratch Card ──────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                onClick={() => setBuilderData({ initialData: null, mode: 'scratch', originalUploadFilename: 'nan' })}
                className="relative bg-brand-dark rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[320px] group hover:shadow-2xl hover:-translate-y-1 overflow-hidden"
              >
                {/* Ambient glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-orange/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-lilac/10 rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl pointer-events-none" />

                <div className="relative z-10 w-20 h-20 bg-brand-orange/20 rounded-3xl flex items-center justify-center mb-6 text-brand-orange group-hover:scale-110 group-hover:bg-brand-orange group-hover:text-white transition-all duration-300">
                  <PenLine size={36} />
                </div>
                <h3 className="relative z-10 text-2xl font-bold text-white mb-3">
                  Start From Scratch
                </h3>
                <p className="relative z-10 text-white/60 text-sm leading-relaxed max-w-xs">
                  Build a professional, ATS-optimized resume using our AI-powered builder. No templates needed.
                </p>
                <div className="relative z-10 mt-6 px-5 py-2.5 rounded-full border border-white/20 text-sm font-medium text-white/70 group-hover:border-brand-orange group-hover:text-brand-orange transition-colors">
                  Start Building
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
