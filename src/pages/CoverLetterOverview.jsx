import React, { useEffect } from 'react';
import Navbar from '../components/homepage/Navbar';
import Footer from '../components/homepage/Footer';
import CoverLetterHero from '../components/coverletter/CoverLetterHero';
import CoverLetterFeatures from '../components/coverletter/CoverLetterFeatures';

const CoverLetterOverview = () => {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-brand-offwhite font-body selection:bg-brand-orange selection:text-white">
      <Navbar />
      <main>
        <CoverLetterHero />
        <CoverLetterFeatures />
        
        {/* Simple CTA Section */}
        <section className="py-24 bg-brand-dark text-center px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-brand-orange/20 to-brand-lilac/20 opacity-30" />
          <div className="max-w-3xl mx-auto relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Ready to stand out?</h2>
            <p className="text-lg text-white/70 mb-10">
              Join thousands of job seekers who use our AI to generate professional, tailored cover letters in seconds.
            </p>
            {/* The CTA buttons are already handled in the hero, this is just another entry point */}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default CoverLetterOverview;
