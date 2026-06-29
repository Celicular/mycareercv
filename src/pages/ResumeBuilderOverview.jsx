import React, { useEffect } from 'react';
import Navbar from '../components/homepage/Navbar';
import Footer from '../components/homepage/Footer';
import BuilderHero from '../components/resumebuilder/BuilderHero';
import InteractiveUpload from '../components/resumebuilder/InteractiveUpload';
import FeatureShowcase from '../components/resumebuilder/FeatureShowcase';
import ExperienceTabs from '../components/resumebuilder/ExperienceTabs';

const ResumeBuilderOverview = () => {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-brand-offwhite font-body selection:bg-brand-orange selection:text-white">
      <Navbar />
      <main>
        <BuilderHero />
        <InteractiveUpload />
        <FeatureShowcase />
        <ExperienceTabs />
      </main>
      <Footer />
    </div>
  );
};

export default ResumeBuilderOverview;
