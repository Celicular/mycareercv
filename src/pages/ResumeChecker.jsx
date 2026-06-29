import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, Loader2, CheckCircle, AlertCircle, Info, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import Navbar from '../components/homepage/Navbar';
import Footer from '../components/homepage/Footer';

const ResumeChecker = () => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleFileSelect = async (selectedFile) => {
    if (!selectedFile) return;
    
    if (selectedFile.type !== 'application/pdf') {
      setError('Only PDF files are supported for the ATS Checker.');
      return;
    }
    
    if (selectedFile.size > 2 * 1024 * 1024) {
      setError('File must be under 2MB.');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setIsProcessing(true);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const res = await axiosClient.post('/resume/check-ats', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setResults(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to analyze resume. Please try again later.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files[0]);
  };

  return (
    <div className="min-h-screen bg-brand-offwhite font-body selection:bg-brand-orange selection:text-white">
      <Navbar />
      
      <main className="pt-28 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-brand-dark mb-4 tracking-tight">
              Free AI Resume Checker
            </h1>
            <p className="text-brand-dark/60 text-lg md:text-xl max-w-2xl mx-auto font-medium">
              Upload your resume and get instant feedback on ATS readability, content quality, and impact.
            </p>
          </div>

        {!results && !isProcessing && (
          <div className="max-w-2xl mx-auto">
            <div
              className={`relative border-2 border-dashed rounded-3xl p-12 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer ${
                isDragging 
                  ? 'border-brand-orange bg-brand-orange/5 scale-[1.02]' 
                  : 'border-brand-dark/20 bg-white hover:border-brand-orange/50 hover:shadow-xl'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
              />
              <div className="w-20 h-20 bg-brand-offwhite rounded-full flex items-center justify-center mb-6 shadow-inner">
                <UploadCloud className="text-brand-orange" size={36} />
              </div>
              <h3 className="text-2xl font-bold text-brand-dark mb-2">Upload your resume</h3>
              <p className="text-brand-dark/60 font-medium mb-6">
                Drag and drop your PDF file here, or click to browse
              </p>
              <div className="px-6 py-2.5 bg-brand-dark text-white rounded-full font-semibold text-sm hover:bg-brand-orange transition-colors">
                Select PDF File
              </div>
            </div>
            
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 border border-red-100"
              >
                <AlertCircle size={20} className="shrink-0" />
                <p className="font-medium text-sm">{error}</p>
              </motion.div>
            )}
          </div>
        )}

        {isProcessing && (
          <div className="max-w-2xl mx-auto py-20 text-center flex flex-col items-center">
            <Loader2 className="text-brand-orange animate-spin mb-6" size={48} />
            <h3 className="text-2xl font-bold text-brand-dark mb-2">Analyzing your resume...</h3>
            <p className="text-brand-dark/60 font-medium max-w-sm">
              Our AI is checking your resume for ATS readability, keywords, and formatting structure.
            </p>
          </div>
        )}

        {results && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Score Header */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-brand-dark/5 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
              <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                  <motion.circle 
                    cx="50" cy="50" r="45" fill="none" 
                    stroke={results.score >= 80 ? '#10b981' : results.score >= 60 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="8"
                    strokeDasharray="283"
                    initial={{ strokeDashoffset: 283 }}
                    animate={{ strokeDashoffset: 283 - (283 * results.score) / 100 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-brand-dark">{results.score}</span>
                  <span className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest mt-1">/ 100</span>
                </div>
              </div>
              
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-bold text-brand-dark mb-3">
                  {results.score >= 80 ? 'Great job!' : results.score >= 60 ? 'Needs some work.' : 'Major issues found.'}
                </h2>
                <p className="text-brand-dark/60 text-lg mb-6 leading-relaxed">
                  Your ATS score indicates how easily a computer can read and parse your resume. A score above 80 is considered excellent.
                </p>
                <button 
                  onClick={() => navigate('/resume-builder-overview')}
                  className="px-6 py-3 bg-brand-orange text-white rounded-xl font-bold hover:bg-[#e65a00] transition-colors flex items-center gap-2 mx-auto md:mx-0 shadow-lg shadow-brand-orange/25"
                >
                  <Sparkles size={18} />
                  Fix Issues with our AI Builder
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Issues */}
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-brand-dark/5">
                <h3 className="text-xl font-bold text-brand-dark mb-6 flex items-center gap-3">
                  <AlertCircle className="text-red-500" size={24} />
                  Found Issues
                </h3>
                {results.issues && results.issues.length > 0 ? (
                  <ul className="space-y-4">
                    {results.issues.map((issue, idx) => (
                      <li key={idx} className="flex gap-4 p-4 rounded-2xl bg-red-50/50 border border-red-100">
                        <div className={`mt-0.5 shrink-0 ${issue.severity === 'critical' ? 'text-red-500' : 'text-orange-400'}`}>
                          {issue.severity === 'critical' ? <AlertCircle size={18} /> : <Info size={18} />}
                        </div>
                        <div>
                          <span className={`text-xs font-bold uppercase tracking-wider mb-1 block ${issue.severity === 'critical' ? 'text-red-600' : 'text-orange-600'}`}>
                            {issue.severity}
                          </span>
                          <p className="text-brand-dark/80 text-sm font-medium leading-relaxed">
                            {issue.message}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <CheckCircle className="text-green-500 mb-4" size={48} />
                    <p className="text-brand-dark/60 font-medium">No major issues found! Your resume is looking clean.</p>
                  </div>
                )}
              </div>

              {/* Tips */}
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-brand-dark/5">
                <h3 className="text-xl font-bold text-brand-dark mb-6 flex items-center gap-3">
                  <Info className="text-brand-orange" size={24} />
                  Actionable Tips
                </h3>
                {results.tips && results.tips.length > 0 ? (
                  <ul className="space-y-4">
                    {results.tips.map((tip, idx) => (
                      <li key={idx} className="flex gap-3">
                        <ArrowRight className="text-brand-orange shrink-0 mt-0.5" size={18} />
                        <p className="text-brand-dark/80 text-sm font-medium leading-relaxed">
                          {tip}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-brand-dark/60 font-medium">No additional tips at this time.</p>
                )}
                
                <div className="mt-8 p-6 bg-brand-dark rounded-2xl text-white">
                  <h4 className="font-bold mb-2">Want a guaranteed 95+ score?</h4>
                  <p className="text-white/70 text-sm mb-4 leading-relaxed">
                    Resumes built with our AI Template Editor are mathematically optimized for ATS parsers.
                  </p>
                  <button 
                    onClick={() => navigate('/resume-builder-overview')}
                    className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-sm transition-colors"
                  >
                    Build your resume now
                  </button>
                </div>
              </div>
            </div>
            
            <div className="text-center pt-8">
              <button 
                onClick={() => { setResults(null); setFile(null); }}
                className="text-brand-dark/40 font-semibold hover:text-brand-dark transition-colors"
              >
                Check another resume
              </button>
            </div>
          </motion.div>
        )}
        </div>
      </main>

      {/* SEO Friendly Content Section */}
      <section className="bg-white py-24 border-t border-brand-dark/5">
        <div className="max-w-4xl mx-auto px-6">
          <div className="prose prose-lg text-brand-dark/80 max-w-none">
            <h2 className="text-3xl font-bold text-brand-dark mb-6">Why Use an ATS Resume Checker?</h2>
            <p className="mb-6">
              In today's competitive job market, over 75% of resumes are rejected before a human recruiter even sees them. 
              This is because companies rely on Applicant Tracking Systems (ATS) to automatically scan, parse, and score incoming resumes. 
              If your resume formatting is too complex, lacks the right keywords, or hides contact information in unreadable headers, 
              the ATS will drop your score, and your application might be automatically discarded.
            </p>
            
            <h3 className="text-2xl font-bold text-brand-dark mb-4 mt-10">How Our AI Resume Scanner Works</h3>
            <p className="mb-6">
              Our free ATS resume checker uses advanced AI (the same technology powering modern hiring platforms) to read your PDF exactly 
              how a corporate ATS would. We evaluate your resume across multiple critical vectors:
            </p>
            <ul className="list-disc pl-6 space-y-3 mb-8 font-medium">
              <li><strong>ATS Parsability:</strong> Checking for garbled text, complex columns, and unreadable graphics.</li>
              <li><strong>Contact Information:</strong> Ensuring recruiters can actually extract your phone number and email.</li>
              <li><strong>Action Verbs & Impact:</strong> Identifying weak phrasing and suggesting strong, metric-driven language.</li>
              <li><strong>Standard Formatting:</strong> Verifying that your experience and education sections follow industry-standard structures.</li>
            </ul>

            <h3 className="text-2xl font-bold text-brand-dark mb-4 mt-10">Get Past the Bots and Land the Interview</h3>
            <p className="mb-6">
              No resume is completely perfect, but our AI provides you with ruthless, honest feedback to get your score as close to 100 as possible. 
              If you find that your current layout is fundamentally unreadable by ATS software, we highly recommend using our mathematically 
              optimized <a href="/resume-builder-overview" className="text-brand-orange hover:underline font-bold">Resume Builder</a>. 
              Resumes generated through our platform are designed from the ground up to pass ATS parsers with flying colors, ensuring your 
              experience actually reaches the hiring manager's desk.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ResumeChecker;
