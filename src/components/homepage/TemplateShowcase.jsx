import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight } from 'lucide-react';

const initialTemplates = [
  { id: 1, name: 'Classic', category: 'Professional', image: '/templates/Classic.png', borderColor: 'border-[#4ECDC4]' },
  { id: 2, name: 'Modern', category: 'Creative', image: '/templates/Modern.png', borderColor: 'border-[#FF5A36]' },
  { id: 3, name: 'Ivy League', category: 'Academic', image: '/templates/Ivy League.png', borderColor: 'border-[#556270]' },
  { id: 4, name: 'Elegant', category: 'Minimalist', image: '/templates/Elegant.png', borderColor: 'border-[#B68BFF]' },
  { id: 5, name: 'Double Column', category: 'Modern', image: '/templates/Double Column.png', borderColor: 'border-[#FFB4D1]' },
  { id: 6, name: 'Creative', category: 'Creative', image: '/templates/Creative.png', borderColor: 'border-[#C7F464]' },
  { id: 7, name: 'Minimal', category: 'Minimalist', image: '/templates/Minimal.png', borderColor: 'border-[#D1C7B3]' },
  { id: 8, name: 'Stylish', category: 'Modern', image: '/templates/Stylish.png', borderColor: 'border-[#FF6B6B]' },
];

const TemplateCard = ({ template }) => (
  <div className={`group flex flex-col bg-white overflow-hidden cursor-pointer transition-all duration-300 border-[3px] ${template.borderColor} rounded-xl h-full`}>
    <div className="w-full aspect-[210/297] bg-brand-offwhite overflow-hidden relative">
      <img 
        src={template.image} 
        alt={`${template.name} Resume Template`} 
        className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-700 ease-in-out"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-brand-dark/0 group-hover:bg-brand-dark/20 transition-colors duration-300 flex items-center justify-center">
        <button className="bg-brand-dark text-white px-6 py-3 rounded-full font-heading uppercase tracking-widest text-sm transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          Use Template
        </button>
      </div>
    </div>
    
    <div className="p-5 bg-white border-t border-brand-dark/5 flex-grow flex flex-col justify-center">
      <div className="text-xs font-bold uppercase tracking-widest text-brand-dark/50 mb-1">{template.category}</div>
      <h3 className="text-lg font-heading text-brand-dark uppercase tracking-wide">{template.name}</h3>
    </div>
  </div>
);

const TemplateShowcase = () => {
  const [templates] = useState(initialTemplates);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(4);

  // Responsive items count
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) setVisibleCount(1);
      else if (window.innerWidth < 1024) setVisibleCount(2);
      else setVisibleCount(4);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxIndex = Math.max(0, templates.length - visibleCount);

  // Auto-play carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 3000);
    return () => clearInterval(timer);
  }, [maxIndex]);

  const itemWidth = 100 / visibleCount;

  return (
    <section className="py-32 px-6 bg-white relative z-10">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <div className="max-w-2xl">
            <span className="bg-brand-offwhite text-brand-dark px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider mb-6 inline-block">Templates</span>
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-heading uppercase tracking-tighter text-brand-dark leading-none">
              CHOOSE YOUR <br className="hidden md:block"/> PERFECT DESIGN
            </h2>
          </div>
          <button className="flex items-center gap-2 text-brand-dark font-heading uppercase tracking-widest text-lg hover:text-brand-orange transition-colors group">
            View All Templates 
            <div className="bg-brand-offwhite p-3 rounded-full group-hover:bg-brand-orange group-hover:text-white transition-colors">
              <ArrowRight size={20} />
            </div>
          </button>
        </div>

        <div className="overflow-hidden relative pb-12">
          <div 
            className="flex transition-transform duration-700 ease-in-out -mx-3"
            style={{ transform: `translateX(-${currentIndex * itemWidth}%)` }}
          >
            {templates.map((template) => (
              <div 
                key={template.id} 
                className="flex-none px-3"
                style={{ width: `${itemWidth}%` }}
              >
                <TemplateCard template={template} />
              </div>
            ))}
          </div>

          {/* Carousel Position Markers (Dots) */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-3">
            {Array.from({ length: maxIndex + 1 }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all duration-500 ${
                  currentIndex === index ? 'w-10 bg-brand-dark' : 'w-2 bg-brand-dark/20 hover:bg-brand-dark/40'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

export default TemplateShowcase;
