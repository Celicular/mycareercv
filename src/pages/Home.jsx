import React from 'react';
import Navbar from '../components/homepage/Navbar';
import HeroSection from '../components/homepage/HeroSection';
import MarqueeSection from '../components/homepage/MarqueeSection';
import TemplateShowcase from '../components/homepage/TemplateShowcase';
import AiFeatureSection from '../components/homepage/AiFeatureSection';
import TrustBar from '../components/homepage/TrustBar';
import FeaturesSection from '../components/homepage/FeaturesSection';
import HowItWorksSection from '../components/homepage/HowItWorksSection';
import TestimonialsSection from '../components/homepage/TestimonialsSection';
import FaqSection from '../components/homepage/FaqSection';
import CtaBlocks from '../components/homepage/CtaBlocks';
import Footer from '../components/homepage/Footer';

const Home = () => {
  return (
    <div className="min-h-screen bg-brand-offwhite font-body selection:bg-brand-orange selection:text-white">
      <Navbar />
      <main>
        <HeroSection />
        <MarqueeSection />
        <TemplateShowcase />
        <AiFeatureSection />
        <TrustBar />
        <FeaturesSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <FaqSection />
        <CtaBlocks />
      </main>
      <Footer />
    </div>
  );
};

export default Home;
