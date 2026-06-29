import React from 'react';
import { FileText, Wand2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const HeroSection = () => {
  const { openAuthModal } = useAuth();

  return (
    <section className="bg-brand-dark text-white pt-40 pb-32 px-6 flex flex-col items-center text-center relative overflow-hidden">
      <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center">
        <h1 className="text-6xl md:text-8xl lg:text-9xl mb-6 leading-[0.95] tracking-tight">
          BUILD A RESUME <br className="hidden md:block" /> THAT GETS INTERVIEWS
        </h1>
        
        <p className="text-lg md:text-xl text-white/70 mb-10 max-w-2xl mx-auto font-medium leading-relaxed">
          Create ATS-friendly resumes, tailor them to every job, generate cover letters with AI, and track applications from one beautifully smooth dashboard.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={() => openAuthModal('register')}
            className="bg-brand-orange text-white px-8 py-4 rounded-full text-lg font-heading uppercase tracking-wider hover:bg-orange-600 transition-colors flex items-center gap-2 shadow-[0_8px_20px_rgba(255,90,54,0.3)]"
          >
            <Wand2 size={20} /> Create Resume Free
          </button>
          <button className="bg-white/5 border border-white/10 text-white px-8 py-4 rounded-full text-lg font-heading uppercase tracking-wider hover:bg-white/10 transition-colors flex items-center gap-2">
            <FileText size={20} /> See Templates
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
