import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, ChevronRight, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const InteractiveUpload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const { openAuthModal } = useAuth();

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setUploadedFile(e.dataTransfer.files[0].name);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFile(e.target.files[0].name);
    }
  };

  return (
    <section className="py-24 px-6 bg-brand-offwhite relative overflow-hidden">
      <div className="max-w-4xl mx-auto text-center relative z-10">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h2 className="text-4xl md:text-5xl mb-4 tracking-tight text-brand-dark">
            Use MyCareerCV's free AI resume tools!
          </h2>
          <p className="text-xl text-brand-dark/70 font-medium max-w-2xl mx-auto">
            Try MyCareerCV free for 7 days before upgrading to a paid plan. Our online resume maker helps you optimize your application from a basic Word doc to a beautiful PDF that impresses recruiters.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          
          {/* Create From Scratch Card */}
          <motion.div 
            onClick={() => openAuthModal('register')}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-white rounded-3xl p-8 border border-brand-dark/5 shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col items-center justify-center text-center cursor-pointer min-h-[280px]"
          >
            <div className="w-20 h-20 rounded-full bg-brand-peach/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <FileText className="text-brand-orange" size={32} />
            </div>
            <h3 className="text-2xl font-semibold mb-2">Create from scratch</h3>
            <p className="text-brand-dark/60 mb-6">Start with a blank canvas and our easy-to-use builder.</p>
            
            <button className="flex items-center gap-2 text-brand-orange font-semibold tracking-wide uppercase text-sm group-hover:translate-x-2 transition-transform">
              Start building <ChevronRight size={16} />
            </button>
          </motion.div>

          {/* Upload Resume Card */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`rounded-3xl p-8 border-2 border-dashed transition-all duration-300 relative flex flex-col items-center justify-center text-center min-h-[280px]
              ${isDragging ? 'border-brand-orange bg-brand-orange/5' : 'border-brand-dark/20 bg-white hover:border-brand-orange/50 hover:shadow-xl'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <AnimatePresence mode="wait">
              {!uploadedFile ? (
                <motion.div 
                  key="upload"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center pointer-events-none"
                >
                  <div className="w-20 h-20 rounded-full bg-brand-lilac/10 flex items-center justify-center mb-6">
                    <UploadCloud className="text-brand-lilac" size={32} />
                  </div>
                  <h3 className="text-2xl font-semibold mb-2">Upload your resume</h3>
                  <p className="text-brand-dark/60 text-sm mb-1">Drop your resume here or choose a file.</p>
                  <p className="text-brand-dark/40 text-xs mb-6">PDF & DOCX only. Max 2MB file size.</p>
                  
                  <div className="text-brand-dark font-medium text-sm tracking-wide uppercase pointer-events-auto">
                    Click to upload
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-20 h-20 rounded-full bg-[#00B67A]/10 flex items-center justify-center mb-6">
                    <Check className="text-[#00B67A]" size={36} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-[#00B67A]">Upload Successful!</h3>
                  <p className="text-brand-dark/70 font-medium break-all px-4">{uploadedFile}</p>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }}
                    className="mt-6 text-sm text-brand-dark/50 hover:text-brand-orange transition-colors underline"
                  >
                    Remove and try another
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Hidden Input */}
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              title="Upload your resume"
            />
            
            <div className="absolute top-4 right-4 bg-[#00B67A]/10 text-[#00B67A] text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
              <Check size={12} /> Privacy guaranteed
            </div>
          </motion.div>

        </div>
        
        <motion.p 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 text-brand-dark/50 text-sm font-medium uppercase tracking-widest"
        >
          Start for free, no sign-up required
        </motion.p>
      </div>
    </section>
  );
};

export default InteractiveUpload;
