import React from 'react';
import { Star } from 'lucide-react';

const MarqueeSection = () => {
  const marqueeText = [
    "ATS OPTIMIZED FORMATS", "AI POWERED BUILDER", "RECRUITER APPROVED", 
    "INSTANT PDF EXPORT", "COVER LETTER GENERATOR", "1-CLICK TAILORING"
  ];

  return (
    <section className="bg-brand-dark text-white py-12 overflow-hidden relative z-20 border-t border-white/5 border-b border-brand-dark/10">
      <div className="flex w-[200%] animate-marquee whitespace-nowrap">
        {/* Double the array for seamless scrolling */}
        {[...marqueeText, ...marqueeText, ...marqueeText, ...marqueeText].map((text, index) => (
          <div key={index} className="flex items-center mx-8">
            <span className="text-2xl font-heading tracking-widest uppercase">{text}</span>
            <Star className="ml-8 text-white/50" fill="currentColor" size={16} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default MarqueeSection;
