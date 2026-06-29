import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Star, Sparkles, FileText, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const CoverLetterHero = () => {
  const { user, openAuthModal } = useAuth();
  const navigate = useNavigate();

  const handleCtaClick = () => {
    if (user) {
      navigate('/dashboard/cover-letters');
    } else {
      openAuthModal('register');
    }
  };

  return (
    <section className="relative bg-[#0F0F11] text-white pt-32 pb-20 px-6 overflow-hidden min-h-[85vh] flex items-center">
      {/* Background Gradient Pattern */}
      <div 
        className="absolute inset-0 z-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 70% 30%, rgba(255, 90, 54, 0.15) 0%, transparent 40%),
                            radial-gradient(circle at 30% 70%, rgba(167, 139, 250, 0.15) 0%, transparent 40%)`
        }}
      />
      
      <div className="max-w-7xl mx-auto relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Content */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col max-w-xl"
          >
            <div className="flex items-center gap-2 text-brand-orange font-medium tracking-wide text-sm mb-6 uppercase">
              <span className="w-6 h-px bg-brand-orange"></span>
              AI Cover Letter Generator
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl mb-6 leading-[1.1] tracking-tight font-bold">
              Write the perfect cover letter in <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-orange to-brand-pink">seconds, not hours</span>
            </h1>
            
            <ul className="space-y-4 mb-10">
              <motion.li 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex items-start gap-3"
              >
                <CheckCircle2 className="text-[#00B67A] shrink-0 mt-1" size={20} />
                <p className="text-white/80 text-lg leading-relaxed">
                  Upload your resume, paste the job description, and our AI instantly drafts a hyper-tailored cover letter perfectly matched to the role.
                </p>
              </motion.li>
              
              <motion.li 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex items-start gap-3"
              >
                <CheckCircle2 className="text-[#00B67A] shrink-0 mt-1" size={20} />
                <p className="text-white/80 text-lg leading-relaxed">
                  Avoid generic, robotic AI text. Our 6-step pipeline analyzes, matches, and writes with human-like flow and tone controls.
                </p>
              </motion.li>
            </ul>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <motion.button 
                onClick={handleCtaClick}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-brand-dark px-8 py-4 rounded-full text-lg font-bold flex items-center gap-2 shadow-[0_8px_20px_rgba(255,255,255,0.15)] relative group overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Sparkles size={20} className="text-brand-orange" />
                  Generate Cover Letter Free
                </span>
                <div className="absolute inset-0 bg-brand-offwhite translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              </motion.button>
              
              <div className="text-white/50 font-handwriting text-xl transform -rotate-2 mt-2 sm:mt-0">
                100% Free AI Credits
              </div>
            </div>
            
            {/* Reviews */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-12 flex items-center gap-3"
            >
              <div className="flex -space-x-3">
                {[
                  "https://i.pravatar.cc/100?img=1",
                  "https://i.pravatar.cc/100?img=2",
                  "https://i.pravatar.cc/100?img=3",
                  "https://i.pravatar.cc/100?img=4"
                ].map((src, i) => (
                  <img key={i} src={src} alt="User" className="w-10 h-10 rounded-full border-2 border-[#0F0F11]" />
                ))}
              </div>
              <div className="ml-2">
                <div className="flex gap-1 mb-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} size={14} className="fill-brand-orange text-brand-orange" />
                  ))}
                </div>
                <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">Trusted by 10,000+ job seekers</span>
              </div>
            </motion.div>
          </motion.div>
          
          {/* Right Interface Mockup */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="relative lg:ml-auto w-full max-w-xl"
          >
            {/* Glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-orange/30 to-brand-pink/30 blur-3xl -z-10 rounded-[3rem] opacity-60" />
            
            {/* Mockup Container */}
            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-white/20">
              {/* Mockup Header */}
              <div className="bg-brand-offwhite px-4 py-3 border-b border-brand-dark/10 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="mx-auto bg-white px-4 py-1 rounded-full text-xs font-mono text-brand-dark/40 flex items-center gap-2 shadow-sm border border-brand-dark/5">
                  <FileText size={12} /> mycareercv.com/cover-letter
                </div>
              </div>
              
              {/* Mockup Body */}
              <div className="p-8 font-body">
                <div className="w-16 h-16 bg-brand-orange/10 rounded-2xl flex items-center justify-center mb-6 text-brand-orange">
                  <Zap size={28} />
                </div>
                <div className="h-4 bg-brand-dark/10 rounded-full w-3/4 mb-4"></div>
                <div className="h-4 bg-brand-dark/10 rounded-full w-full mb-4"></div>
                <div className="h-4 bg-brand-dark/10 rounded-full w-5/6 mb-8"></div>
                
                <div className="bg-brand-offwhite p-5 rounded-2xl border border-brand-dark/5 relative">
                  <div className="absolute -top-3 -right-3 bg-[#00B67A] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                    <CheckCircle2 size={12} /> 98% Match
                  </div>
                  <div className="h-3 bg-brand-dark/20 rounded-full w-1/4 mb-4"></div>
                  <div className="h-3 bg-brand-dark/10 rounded-full w-full mb-3"></div>
                  <div className="h-3 bg-brand-dark/10 rounded-full w-full mb-3"></div>
                  <div className="h-3 bg-brand-dark/10 rounded-full w-4/5 mb-3"></div>
                  <div className="h-3 bg-brand-dark/10 rounded-full w-1/3"></div>
                </div>
              </div>
            </div>
            
            {/* Floating badges */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute -right-6 top-1/4 bg-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-brand-dark/5"
            >
              <div className="w-8 h-8 rounded-full bg-brand-pink/20 text-brand-pink flex items-center justify-center">
                <Sparkles size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-brand-dark">Tone: Enthusiastic</p>
                <p className="text-[10px] text-brand-dark/50">AI Optimized</p>
              </div>
            </motion.div>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
};

export default CoverLetterHero;
