import React from 'react';
import { MousePointerClick, FileEdit, Rocket } from 'lucide-react';

const HowItWorksSection = () => {
  return (
    <section className="py-32 px-6 bg-brand-offwhite">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-24 relative">
          <h2 className="text-5xl md:text-7xl font-heading uppercase tracking-tighter text-brand-dark">
            CREATE YOUR RESUME IN 3 STEPS
          </h2>
          <p className="text-xl text-brand-dark/50 mt-6 font-medium">It has never been easier to land your dream job.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-12 md:gap-16 relative">
          {/* Elegant connecting line for desktop */}
          <div className="hidden md:block absolute top-16 left-[16.66%] right-[16.66%] h-[2px] bg-gradient-to-r from-transparent via-brand-dark/10 to-transparent z-0"></div>

          {/* Step 1 */}
          <div className="relative z-10 flex flex-col items-center text-center group">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-10 shadow-[0_20px_50px_rgba(0,0,0,0.06)] group-hover:shadow-[0_30px_60px_rgba(0,0,0,0.1)] group-hover:-translate-y-4 transition-all duration-500 relative">
              <div className="absolute inset-0 rounded-full border border-brand-dark/5 scale-110"></div>
              <MousePointerClick size={40} className="text-brand-orange" />
              <div className="absolute -top-2 -right-2 w-10 h-10 bg-brand-dark text-white rounded-full flex items-center justify-center font-heading text-lg shadow-lg">1</div>
            </div>
            <h3 className="text-2xl font-heading uppercase mb-4 text-brand-dark">Choose a Template</h3>
            <p className="text-brand-dark/60 font-medium leading-relaxed max-w-xs text-lg">Select a professional, ATS-optimized design that perfectly fits your industry.</p>
          </div>

          {/* Step 2 */}
          <div className="relative z-10 flex flex-col items-center text-center group">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-10 shadow-[0_20px_50px_rgba(0,0,0,0.06)] group-hover:shadow-[0_30px_60px_rgba(0,0,0,0.1)] group-hover:-translate-y-4 transition-all duration-500 relative">
              <div className="absolute inset-0 rounded-full border border-brand-dark/5 scale-110"></div>
              <FileEdit size={40} className="text-brand-lilac" />
              <div className="absolute -top-2 -right-2 w-10 h-10 bg-brand-dark text-white rounded-full flex items-center justify-center font-heading text-lg shadow-lg">2</div>
            </div>
            <h3 className="text-2xl font-heading uppercase mb-4 text-brand-dark">Add Your Info</h3>
            <p className="text-brand-dark/60 font-medium leading-relaxed max-w-xs text-lg">Import your existing resume or let our AI help you create one from scratch effortlessly.</p>
          </div>

          {/* Step 3 */}
          <div className="relative z-10 flex flex-col items-center text-center group">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-10 shadow-[0_20px_50px_rgba(0,0,0,0.06)] group-hover:shadow-[0_30px_60px_rgba(0,0,0,0.1)] group-hover:-translate-y-4 transition-all duration-500 relative">
              <div className="absolute inset-0 rounded-full border border-brand-dark/5 scale-110"></div>
              <Rocket size={40} className="text-brand-pink" />
              <div className="absolute -top-2 -right-2 w-10 h-10 bg-brand-dark text-white rounded-full flex items-center justify-center font-heading text-lg shadow-lg">3</div>
            </div>
            <h3 className="text-2xl font-heading uppercase mb-4 text-brand-dark">Optimize & Apply</h3>
            <p className="text-brand-dark/60 font-medium leading-relaxed max-w-xs text-lg">Use AI suggestions to perfect your content, download as PDF, and start applying today.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
