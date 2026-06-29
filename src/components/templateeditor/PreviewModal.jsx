import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PreviewModal({ images, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : prev));
      if (e.key === 'ArrowLeft') setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images.length, onClose]);

  const handleNext = (e) => {
    e.stopPropagation();
    if (currentIndex < images.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-md items-center justify-center">
      
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/50 to-transparent">
        <div className="text-white/70 text-sm font-bold tracking-widest uppercase">
          {images.length > 1 ? `Page ${currentIndex + 1} of ${images.length}` : 'Preview'}
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="relative w-full flex-1 flex items-center justify-center p-8 overflow-hidden" onClick={onClose}>
        
        {/* Navigation - Left */}
        {images.length > 1 && (
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="absolute left-8 z-20 p-4 rounded-full bg-white/10 text-white backdrop-blur-md border border-white/20 hover:bg-white/20 disabled:opacity-0 transition-all"
          >
            <ChevronLeft size={32} />
          </button>
        )}

        {/* Image Container */}
        <div className="relative max-h-full max-w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <AnimatePresence mode="wait">
            <motion.img
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              src={images[currentIndex]}
              alt={`Page ${currentIndex + 1}`}
              className="max-h-[85vh] max-w-full object-contain shadow-2xl rounded-sm"
            />
          </AnimatePresence>
        </div>

        {/* Navigation - Right */}
        {images.length > 1 && (
          <button
            onClick={handleNext}
            disabled={currentIndex === images.length - 1}
            className="absolute right-8 z-20 p-4 rounded-full bg-white/10 text-white backdrop-blur-md border border-white/20 hover:bg-white/20 disabled:opacity-0 transition-all"
          >
            <ChevronRight size={32} />
          </button>
        )}

      </div>
    </div>
  );
}
