import React from 'react';
import { ArrowRight } from 'lucide-react';

const CtaBlocks = () => {
  return (
    <div className="flex flex-col w-full relative z-10">
      
      {/* Cover Letter Block - Sticky Stacking Effect */}
      <section className="sticky top-0 bg-brand-orange text-white min-h-[90vh] py-32 px-6 flex flex-col justify-center items-center text-center rounded-t-[3rem] transition-transform">
        <h2 className="text-5xl md:text-7xl lg:text-8xl font-heading uppercase tracking-tighter mb-8 max-w-5xl leading-none">
          CREATE MATCHING COVER LETTERS INSTANTLY
        </h2>
        <p className="text-xl font-medium mb-12 opacity-90 max-w-2xl leading-relaxed">
          Generate personalized, ATS-friendly cover letters tailored to each role with a professional tone.
        </p>
        <button className="bg-white text-brand-orange px-10 py-5 rounded-full text-xl font-heading uppercase tracking-widest hover:bg-white/90 transition-all flex items-center gap-3">
          Generate Cover Letter <ArrowRight size={24} />
        </button>
      </section>

      {/* Templates Block - Sticky Stacking Effect */}
      <section className="sticky top-0 bg-brand-lilac text-brand-dark min-h-[90vh] py-32 px-6 flex flex-col justify-center items-center text-center rounded-t-[3rem] transition-transform">
        <h2 className="text-5xl md:text-7xl lg:text-8xl font-heading uppercase tracking-tighter mb-8 max-w-5xl leading-none">
          PROFESSIONAL TEMPLATES FOR EVERY CAREER
        </h2>
        <p className="text-xl font-medium mb-12 opacity-80 max-w-2xl leading-relaxed">
          Whether you're a student, software engineer, or executive, find templates designed to showcase your strengths.
        </p>
        <button className="bg-brand-dark text-white px-10 py-5 rounded-full text-xl font-heading uppercase tracking-widest hover:bg-black transition-all flex items-center gap-3">
          Browse Templates <ArrowRight size={24} />
        </button>
      </section>

      {/* Stats Block - Sticky Stacking Effect */}
      <section className="sticky top-0 bg-brand-sand text-brand-dark min-h-[90vh] py-32 px-6 flex flex-col justify-center rounded-t-[3rem] transition-transform">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center divide-x divide-brand-dark/10">
            <div className="flex flex-col items-center">
              <div className="text-6xl md:text-8xl font-heading text-brand-dark mb-4 tracking-tighter">500K+</div>
              <div className="text-base md:text-lg font-bold uppercase tracking-widest opacity-60">Resumes Created</div>
            </div>
            <div className="flex flex-col items-center hidden md:flex">
              <div className="text-6xl md:text-8xl font-heading text-brand-dark mb-4 tracking-tighter">100K+</div>
              <div className="text-base md:text-lg font-bold uppercase tracking-widest opacity-60">Successful Apps</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-6xl md:text-8xl font-heading text-brand-dark mb-4 tracking-tighter">50+</div>
              <div className="text-base md:text-lg font-bold uppercase tracking-widest opacity-60">Pro Templates</div>
            </div>
            <div className="flex flex-col items-center border-l border-brand-dark/10 md:border-l-0">
              <div className="text-6xl md:text-8xl font-heading text-brand-dark mb-4 tracking-tighter">95%</div>
              <div className="text-base md:text-lg font-bold uppercase tracking-widest opacity-60">ATS Score</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Block - Sticky Stacking Effect */}
      <section className="sticky top-0 bg-brand-pink text-brand-dark min-h-[90vh] py-32 px-6 flex flex-col justify-center items-center text-center rounded-t-[3rem] transition-transform">
        <h2 className="text-6xl md:text-8xl lg:text-9xl font-heading uppercase tracking-tighter mb-10 max-w-5xl leading-none">
          READY TO LAND MORE INTERVIEWS?
        </h2>
        <p className="text-2xl font-medium mb-16 opacity-80 max-w-2xl leading-relaxed">
          Create a professional resume, optimize it for ATS systems, and apply with confidence today.
        </p>
        <button className="bg-brand-dark text-white px-12 py-6 rounded-full text-2xl font-heading uppercase tracking-widest hover:bg-black transition-all flex items-center gap-4">
          Create Resume Free <ArrowRight size={32} />
        </button>
      </section>
    </div>
  );
};

export default CtaBlocks;
