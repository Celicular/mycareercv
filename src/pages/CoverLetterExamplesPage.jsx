import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/homepage/Navbar';
import Footer from '../components/homepage/Footer';
import { useAuth } from '../context/AuthContext';
import { Briefcase, Code, PenTool, TrendingUp, Stethoscope, BookOpen } from 'lucide-react';

const examples = [
  { role: 'Software Engineer', industry: 'Technology', icon: Code, desc: 'Highlighting technical projects and scalable architecture experience.' },
  { role: 'Marketing Manager', industry: 'Marketing', icon: TrendingUp, desc: 'Focusing on campaign ROI, team leadership, and brand growth.' },
  { role: 'Graphic Designer', industry: 'Design', icon: PenTool, desc: 'Showcasing a creative portfolio and agency client success.' },
  { role: 'Registered Nurse', industry: 'Healthcare', icon: Stethoscope, desc: 'Emphasizing patient care, clinical rotations, and certifications.' },
  { role: 'Teacher', industry: 'Education', icon: BookOpen, desc: 'Highlighting curriculum development and student engagement.' },
  { role: 'Project Manager', industry: 'Business', icon: Briefcase, desc: 'Focusing on Agile methodologies and cross-functional team delivery.' }
];

export default function CoverLetterExamplesPage() {
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();

  useEffect(() => {
    document.title = "Professional Cover Letter Examples for 2026 | MyCareerCV";
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = "Explore our library of professional cover letter examples for every industry. Learn how to write a cover letter that gets you hired with our free samples and tips.";
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
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-orange opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-orange"></span>
            </span>
            Industry-Tested Examples
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-6 leading-tight">
            Professional Cover Letter <br className="hidden md:block"/>
            <span className="text-brand-orange">Examples & Samples</span>
          </h1>
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed mb-10">
            A great resume gets you past the ATS, but a great cover letter gets you the interview. Browse our collection of tailored cover letter examples proven to land jobs in 2026.
          </p>
          <button 
            onClick={handleCtaClick}
            className="px-8 py-4 bg-brand-orange text-white font-bold rounded-xl hover:bg-[#E65100] transition-colors shadow-lg shadow-brand-orange/20 text-lg"
          >
            Create Your Cover Letter
          </button>
        </div>

        {/* Examples Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-32">
          {examples.map((ex, idx) => {
            const Icon = ex.icon;
            return (
              <div 
                key={idx} 
                onClick={handleCtaClick}
                className="group relative bg-[#1A1A20] rounded-2xl p-8 border border-white/5 hover:border-brand-orange/50 transition-all duration-300 shadow-2xl hover:shadow-brand-orange/20 cursor-pointer flex flex-col items-start"
              >
                <div className="w-12 h-12 rounded-xl bg-white/5 text-brand-orange flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-brand-orange/10 transition-all">
                  <Icon size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{ex.role}</h3>
                <span className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4">{ex.industry}</span>
                <p className="text-white/60 text-sm leading-relaxed mb-6 flex-1">
                  {ex.desc}
                </p>
                <span className="text-brand-orange text-sm font-bold flex items-center gap-2 group-hover:translate-x-2 transition-transform">
                  View Example &rarr;
                </span>
              </div>
            );
          })}
        </div>

        {/* Heavy SEO Content Section */}
        <div className="max-w-3xl mx-auto prose prose-invert prose-orange">
          <h2 className="text-3xl font-bold mb-8">Why You Need a Specialized Cover Letter</h2>
          <p className="text-white/70 leading-relaxed mb-8">
            In today's highly competitive job market, sending a generic "To Whom It May Concern" cover letter is a surefire way to have your application ignored. Our cover letter examples demonstrate the crucial differences in tone, structure, and content required for different industries.
          </p>
          
          <h3 className="text-2xl font-bold mb-4 mt-12">Anatomy of a Winning Cover Letter Example</h3>
          <ul className="space-y-4 text-white/70 mb-12">
            <li><strong className="text-white">The Hook:</strong> Every great cover letter sample starts with a compelling opening statement that goes beyond "I am writing to apply for..."</li>
            <li><strong className="text-white">The Value Proposition:</strong> Notice how our examples immediately pivot from what the candidate wants, to what the candidate can do for the employer.</li>
            <li><strong className="text-white">The Proof:</strong> Data-driven bullet points that back up claims with actual metrics (e.g., "Increased sales by 35%").</li>
            <li><strong className="text-white">The Call to Action:</strong> A confident closing that requests an interview without sounding desperate.</li>
          </ul>

          <h3 className="text-2xl font-bold mb-4">Should Your Cover Letter Match Your Resume?</h3>
          <p className="text-white/70 leading-relaxed mb-12">
            Visually? Absolutely. Using our AI Cover Letter Builder guarantees that your cover letter uses the exact same header, font, and color scheme as your MyCareerCV resume. Content-wise? Never copy-paste. Your cover letter should tell the story behind the bullet points on your resume.
          </p>

          <div className="bg-brand-orange/10 border border-brand-orange/20 rounded-2xl p-8 text-center mt-16">
            <h3 className="text-2xl font-bold text-white mb-4">Ready to stop struggling with a blank page?</h3>
            <p className="text-white/70 mb-8">Let our AI generate a perfectly tailored cover letter based on your resume and the job description in less than 30 seconds.</p>
            <button 
              onClick={handleCtaClick}
              className="px-8 py-3 bg-brand-orange text-white font-bold rounded-xl hover:bg-[#E65100] transition-colors shadow-lg"
            >
              Start Building Now
            </button>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
