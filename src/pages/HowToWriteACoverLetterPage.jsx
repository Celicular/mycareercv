import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/homepage/Navbar';
import Footer from '../components/homepage/Footer';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, Search, Target, PenLine } from 'lucide-react';

export default function HowToWriteACoverLetterPage() {
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();

  useEffect(() => {
    document.title = "How to Write a Cover Letter in 2026 | Step-by-Step Guide";
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = "Master the art of writing a cover letter. Learn how to write a compelling hook, showcase your value, and close with confidence to land more interviews.";
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

      <main className="flex-1 pt-32 pb-24 px-6 max-w-[1000px] mx-auto w-full">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-orange/10 border border-brand-orange/20 text-brand-orange text-xs font-bold tracking-widest uppercase mb-6">
            Complete Guide
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-6 leading-tight">
            How to Write a <br className="hidden md:block"/>
            <span className="text-brand-orange">Cover Letter</span>
          </h1>
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed mb-10">
            A step-by-step guide to writing a cover letter that hiring managers actually want to read. Stop staring at a blank page and start writing.
          </p>
        </div>

        {/* Steps Timeline */}
        <div className="space-y-12 mb-32 relative before:absolute before:inset-0 before:ml-6 md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-white/10">
          
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#1A1A20] border-2 border-brand-orange text-brand-orange shadow-[0_0_0_4px_#101014] z-10 shrink-0 md:mx-auto">
              <Search size={20} />
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-[#1A1A20] p-6 rounded-2xl border border-white/5 group-hover:border-brand-orange/30 transition-colors ml-4 md:ml-0">
              <span className="text-brand-orange font-bold text-sm mb-2 block">Step 1</span>
              <h3 className="text-xl font-bold text-white mb-3">Research the Company</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Before you write a single word, read the job description carefully. Identify their core pain points. A cover letter is not about why you want the job; it's about how you can solve their problems.
              </p>
            </div>
          </div>

          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#1A1A20] border-2 border-brand-orange text-brand-orange shadow-[0_0_0_4px_#101014] z-10 shrink-0 md:mx-auto">
              <Target size={20} />
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-[#1A1A20] p-6 rounded-2xl border border-white/5 group-hover:border-brand-orange/30 transition-colors ml-4 md:ml-0">
              <span className="text-brand-orange font-bold text-sm mb-2 block">Step 2</span>
              <h3 className="text-xl font-bold text-white mb-3">Write a Strong Hook</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Skip the boring "I am writing to apply for the position of..." Instead, start with a punchy achievement or a genuine connection to the company's mission. Grab their attention immediately.
              </p>
            </div>
          </div>

          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#1A1A20] border-2 border-brand-orange text-brand-orange shadow-[0_0_0_4px_#101014] z-10 shrink-0 md:mx-auto">
              <PenLine size={20} />
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-[#1A1A20] p-6 rounded-2xl border border-white/5 group-hover:border-brand-orange/30 transition-colors ml-4 md:ml-0">
              <span className="text-brand-orange font-bold text-sm mb-2 block">Step 3</span>
              <h3 className="text-xl font-bold text-white mb-3">Provide Proof (The Body)</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                In 1-2 paragraphs, elaborate on your resume. Pick two of your biggest achievements that directly relate to the job posting. Use numbers and metrics to prove your impact.
              </p>
            </div>
          </div>

          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#1A1A20] border-2 border-brand-orange text-brand-orange shadow-[0_0_0_4px_#101014] z-10 shrink-0 md:mx-auto">
              <CheckCircle2 size={20} />
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-[#1A1A20] p-6 rounded-2xl border border-white/5 group-hover:border-brand-orange/30 transition-colors ml-4 md:ml-0">
              <span className="text-brand-orange font-bold text-sm mb-2 block">Step 4</span>
              <h3 className="text-xl font-bold text-white mb-3">Call to Action</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                End confidently. Reiterate your enthusiasm and explicitly state that you look forward to discussing how you can contribute to their specific goals in an interview.
              </p>
            </div>
          </div>

        </div>

        {/* Heavy SEO Content Section */}
        <div className="prose prose-invert prose-orange max-w-none">
          <h2 className="text-3xl font-bold mb-8 text-center">Common Cover Letter Mistakes to Avoid</h2>
          
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-6">
              <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                <span className="text-lg">❌</span> Regurgitating your resume
              </h4>
              <p className="text-sm text-white/60 leading-relaxed m-0">Your cover letter shouldn't be a textual version of your resume. It should tell the story behind your biggest achievements.</p>
            </div>
            
            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-6">
              <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                <span className="text-lg">❌</span> Making it about you
              </h4>
              <p className="text-sm text-white/60 leading-relaxed m-0">Avoid starting every sentence with "I". The letter should focus on the employer's needs and how you can fulfill them.</p>
            </div>
            
            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-6">
              <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                <span className="text-lg">❌</span> Being too long
              </h4>
              <p className="text-sm text-white/60 leading-relaxed m-0">Hiring managers are busy. Keep your letter under 400 words. Half a page is the sweet spot.</p>
            </div>

            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-6">
              <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                <span className="text-lg">❌</span> Typos and grammar errors
              </h4>
              <p className="text-sm text-white/60 leading-relaxed m-0">A single spelling mistake can disqualify you. Always proofread or use an AI checker before sending.</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-brand-orange/20 to-[#101014] border border-brand-orange/30 rounded-3xl p-10 text-center shadow-2xl">
            <h3 className="text-3xl font-bold text-white mb-4">Skip the Writer's Block</h3>
            <p className="text-white/70 mb-8 max-w-xl mx-auto">
              Writing a cover letter from scratch is hard. Let our AI read your resume and the job description to generate a perfectly tailored, customized cover letter in 30 seconds.
            </p>
            <button 
              onClick={handleCtaClick}
              className="px-10 py-4 bg-brand-orange text-white font-bold rounded-xl hover:bg-[#E65100] transition-colors shadow-[0_0_20px_rgba(255,90,54,0.3)] text-lg"
            >
              Generate with AI
            </button>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
