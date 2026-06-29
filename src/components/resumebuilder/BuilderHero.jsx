import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Star } from 'lucide-react';

const BuilderHero = () => {
  return (
    <section className="relative bg-[#1A1A1C] text-white pt-32 pb-20 px-6 overflow-hidden min-h-[85vh] flex items-center">
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
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
            <div className="flex items-center gap-2 text-brand-lilac font-medium tracking-wide text-sm mb-6 uppercase">
              <span className="w-6 h-px bg-brand-lilac"></span>
              AI Resume Builder
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl mb-6 leading-[1.1] tracking-tight">
              The AI resume builder that helps you <span className="text-brand-orange">land more job interviews</span>
            </h1>
            
            <ul className="space-y-4 mb-10">
              <motion.li 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex items-start gap-3"
              >
                <CheckCircle2 className="text-brand-orange shrink-0 mt-1" size={20} />
                <p className="text-white/80 text-lg leading-relaxed">
                  MyCareerCV helps you create a professional resume with real AI feedback, not a generic AI-generated one.
                </p>
              </motion.li>
              
              <motion.li 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex items-start gap-3"
              >
                <CheckCircle2 className="text-brand-orange shrink-0 mt-1" size={20} />
                <p className="text-white/80 text-lg leading-relaxed">
                  AI rewrites your bullets, scores your match against the job description, and exports to an ATS-tested PDF that parsers can read.
                </p>
              </motion.li>
            </ul>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-brand-orange text-white px-8 py-4 rounded-full text-lg font-heading uppercase tracking-wider hover:bg-orange-600 transition-colors shadow-[0_8px_20px_rgba(255,90,54,0.3)] relative group overflow-hidden"
              >
                <span className="relative z-10">Build Your Resume With AI</span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              </motion.button>
              
              <div className="text-white/50 font-handwriting text-xl transform -rotate-3">
                Made for the 2026 job market
              </div>
            </div>
            
            {/* Reviews */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-12 flex items-center gap-3"
            >
              <span className="font-semibold text-lg">Excellent</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <div key={star} className="bg-[#00B67A] p-1.5 rounded-sm">
                    <Star size={14} className="fill-white text-white" />
                  </div>
                ))}
              </div>
              <span className="text-white/70 font-medium ml-2">5,282 Reviews</span>
            </motion.div>
          </motion.div>
          
          {/* Right Image */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="relative lg:ml-auto w-full max-w-2xl"
          >
            <div className="absolute -inset-4 bg-gradient-to-tr from-brand-lilac/20 to-brand-orange/20 blur-3xl -z-10 rounded-full opacity-50" />
            <img 
              src="https://cdn.enhancv.com/images/750/i/L19uZXh0L3N0YXRpYy9pbWFnZXMvZm9sZC1hN2FhNzIzNjdlYTc5NTk0MWM2NTgwYWI0ZDA1Y2FlYy53ZWJw.webp" 
              alt="AI Resume Builder Interface" 
              className="w-full h-auto object-contain drop-shadow-2xl hover:scale-[1.02] transition-transform duration-500 ease-out"
            />
          </motion.div>
          
        </div>
      </div>
    </section>
  );
};

export default BuilderHero;
