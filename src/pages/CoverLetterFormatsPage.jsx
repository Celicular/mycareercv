import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/homepage/Navbar';
import Footer from '../components/homepage/Footer';
import { useAuth } from '../context/AuthContext';
import { AlignLeft, Type, Maximize, FileText } from 'lucide-react';

export default function CoverLetterFormatsPage() {
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();

  useEffect(() => {
    document.title = "Standard Cover Letter Formats & Guidelines | MyCareerCV";
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = "Learn the standard business cover letter formatting rules, including margins, fonts, and spacing. Use our templates to guarantee proper formatting every time.";
  }, []);

  const handleCtaClick = () => {
    if (user) {
      navigate('/dashboard/cover-letters');
    } else {
      openAuthModal();
    }
  };

  return (
    <div className="min-h-screen bg-[#101014] text-white flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pt-32 pb-24 px-6 max-w-[1200px] mx-auto w-full">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-orange/10 border border-brand-orange/20 text-brand-orange text-xs font-bold tracking-widest uppercase mb-6">
            Formatting Guide
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-6 leading-tight">
            Cover Letter <span className="text-brand-orange">Formats</span>
          </h1>
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed mb-10">
            A poorly formatted cover letter signals a lack of attention to detail. Follow these standard business formatting rules to ensure your application looks professional before they even read a word.
          </p>
          <button 
            onClick={handleCtaClick}
            className="px-8 py-4 bg-brand-orange text-white font-bold rounded-xl hover:bg-[#E65100] transition-colors shadow-lg shadow-brand-orange/20 text-lg"
          >
            Use an Auto-Formatted Template
          </button>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-32">
          <div className="bg-[#1A1A20] rounded-2xl p-8 border border-white/5">
            <div className="w-12 h-12 rounded-xl bg-white/5 text-brand-orange flex items-center justify-center mb-6">
              <Maximize size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Margins</h3>
            <p className="text-white/60 text-sm leading-relaxed">
              Keep margins between 1" and 1.5". Anything smaller looks cluttered; anything larger makes the page look empty.
            </p>
          </div>
          
          <div className="bg-[#1A1A20] rounded-2xl p-8 border border-white/5">
            <div className="w-12 h-12 rounded-xl bg-white/5 text-brand-orange flex items-center justify-center mb-6">
              <Type size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Fonts</h3>
            <p className="text-white/60 text-sm leading-relaxed">
              Use standard, ATS-friendly fonts like Inter, Roboto, Arial, or Times New Roman. Keep font size between 10pt and 12pt.
            </p>
          </div>

          <div className="bg-[#1A1A20] rounded-2xl p-8 border border-white/5">
            <div className="w-12 h-12 rounded-xl bg-white/5 text-brand-orange flex items-center justify-center mb-6">
              <AlignLeft size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Alignment</h3>
            <p className="text-white/60 text-sm leading-relaxed">
              Standard business letters should be left-aligned (not justified). This ensures readability on all devices.
            </p>
          </div>

          <div className="bg-[#1A1A20] rounded-2xl p-8 border border-white/5">
            <div className="w-12 h-12 rounded-xl bg-white/5 text-brand-orange flex items-center justify-center mb-6">
              <FileText size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Length</h3>
            <p className="text-white/60 text-sm leading-relaxed">
              Never exceed one page. Aim for 3-4 paragraphs, totaling around 250 to 400 words maximum.
            </p>
          </div>
        </div>

        {/* Heavy SEO Content Section */}
        <div className="max-w-3xl mx-auto prose prose-invert prose-orange">
          <h2 className="text-3xl font-bold mb-8">Standard Block Format vs. Modern Format</h2>
          <p className="text-white/70 leading-relaxed mb-6">
            The traditional <strong>Block Format</strong> requires all text to be aligned to the left margin. You include your contact info, the date, and the employer's contact info at the very top. It is rigid, formal, and expected in corporate environments.
          </p>
          <p className="text-white/70 leading-relaxed mb-12">
            The <strong>Modern Format</strong> (often used in creative or tech roles) uses a stylized header that perfectly matches your resume's header. It omits the employer's physical address (since you're emailing it) and focuses strictly on the content. Our builder supports both.
          </p>
          
          <h3 className="text-2xl font-bold mb-4">Emailing Your Cover Letter</h3>
          <p className="text-white/70 leading-relaxed mb-12">
            If you are pasting your cover letter directly into an email body, drop the formal addresses. Make your subject line clear (e.g., "Application for Software Engineer - Jane Doe"). If you are attaching it, ALWAYS send it as a PDF so your carefully crafted margins and fonts don't shift when opened on a different computer.
          </p>

          <div className="bg-brand-orange/10 border border-brand-orange/20 rounded-2xl p-8 text-center mt-16 flex flex-col items-center">
            <h3 className="text-2xl font-bold text-white mb-4">Don't want to format it yourself?</h3>
            <p className="text-white/70 mb-8 max-w-lg">Our Cover Letter Builder automatically handles margins, fonts, and spacing. Just type your content (or let our AI write it for you) and download a perfect PDF.</p>
            <button 
              onClick={handleCtaClick}
              className="px-8 py-3 bg-brand-orange text-white font-bold rounded-xl hover:bg-[#E65100] transition-colors shadow-lg"
            >
              Generate a Formatted Letter
            </button>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
