import React from 'react';
import { motion } from 'framer-motion';
import { Bot, CheckCircle, Crosshair, FileSignature, LayoutDashboard, LayoutTemplate, Contact, Briefcase, FileBadge } from 'lucide-react';

const FeatureCard = ({ title, description, icon: Icon, colorClass }) => (
  <div className={`p-10 rounded-[2rem] hover:-translate-y-2 transition-all flex flex-col items-start ${colorClass}`}>
    <div className="bg-white/70 p-5 rounded-2xl mb-8">
      <Icon size={32} className="text-brand-dark" />
    </div>
    <h3 className="text-2xl font-heading uppercase mb-4 text-brand-dark">{title}</h3>
    <p className="text-brand-dark/70 font-medium leading-relaxed">{description}</p>
  </div>
);

const FeaturesSection = () => {
  return (
    <section className="bg-white py-32 px-6 rounded-[3rem] -mt-10 relative z-10">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <span className="bg-brand-offwhite text-brand-dark px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider mb-6 inline-block shadow-sm">Features</span>
          <h2 className="text-5xl md:text-7xl font-heading uppercase tracking-tighter text-brand-dark max-w-4xl mx-auto leading-none">
            EVERYTHING YOU NEED TO LAND YOUR NEXT JOB
          </h2>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        >
          <FeatureCard 
            title="AI Resume Builder" 
            description="Generate professional resume content in seconds using advanced AI technology tailored to your industry."
            icon={Bot}
            colorClass="bg-[#f0f9ff]" // very soft blue
          />
          <FeatureCard 
            title="ATS Checker" 
            description="Analyze your resume and identify issues that could prevent it from reaching human recruiters."
            icon={CheckCircle}
            colorClass="bg-[#fdf4ff]" // soft fuchsia
          />
          <FeatureCard 
            title="1-Click Tailoring" 
            description="Match your resume to any specific job description with a single click to maximize relevance."
            icon={Crosshair}
            colorClass="bg-[#f0fdf4]" // soft green
          />
          <FeatureCard 
            title="Cover Letters" 
            description="Create highly personalized cover letters designed specifically for each role you apply for."
            icon={FileSignature}
            colorClass="bg-[#fffbeb]" // soft amber
          />
          <FeatureCard 
            title="App Tracker" 
            description="Track applications, interviews, job offers, and necessary follow-ups all in one central dashboard."
            icon={LayoutDashboard}
            colorClass="bg-[#faf5ff]" // soft purple
          />
          <FeatureCard 
            title="Pro Templates" 
            description="Choose from professionally designed, recruiter-approved templates suitable for every career stage."
            icon={LayoutTemplate}
            colorClass="bg-[#fff1f2]" // soft rose
          />
        </motion.div>
        
        {/* ATS Section specific block */}
        <motion.div 
          className="mt-32 bg-brand-dark text-white rounded-[3rem] p-12 md:p-24 relative overflow-hidden"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Subtle curved background lines */}
          <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 pointer-events-none">
            <svg width="100%" height="100%" viewBox="0 0 500 500" preserveAspectRatio="none">
              <path d="M0,500 C150,400 300,100 500,0" stroke="white" strokeWidth="1" fill="none" />
              <path d="M100,500 C250,300 400,150 500,50" stroke="white" strokeWidth="1" fill="none" />
              <path d="M200,500 C350,200 450,250 500,150" stroke="white" strokeWidth="1" fill="none" />
            </svg>
          </div>
          
          <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
            <div className="max-w-lg">
              <h2 className="text-4xl md:text-5xl font-heading uppercase mb-8 leading-tight">
                Resumes optimized for Applicant Tracking Systems (ATS)
              </h2>
              <p className="text-base mb-10 opacity-70 font-medium leading-relaxed">
                All our resume templates are tested with top Applicant Tracking Systems (ATS) to guarantee full compatibility. With clean layouts, readable fonts, and standard section titles, nothing gets lost by the software. Every template has been expertly reviewed to ensure it's not only ATS-proof but recruiter-friendly, too.
              </p>
              <button className="bg-[#4ECDC4] text-brand-dark px-8 py-4 rounded-md font-bold text-sm hover:bg-[#3db8b0] transition-colors shadow-sm">
                Build an ATS-Friendly Resume
              </button>
            </div>
            
            <div className="relative h-[400px] flex flex-col justify-center gap-8 pl-0 lg:pl-10">
              <motion.div 
                className="bg-white/10 backdrop-blur-md p-4 pr-8 rounded-xl flex items-center gap-4 shadow-xl border border-white/5 w-max"
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-brand-lilac"><Contact size={20} /></div>
                <span className="font-bold text-sm tracking-wide">Readable contact information</span>
              </motion.div>

              <motion.div 
                className="bg-white/10 backdrop-blur-md p-4 pr-8 rounded-xl flex items-center gap-4 shadow-xl border border-white/5 self-end lg:self-start lg:translate-x-20 w-max"
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-brand-lilac"><Briefcase size={20} /></div>
                <span className="font-bold text-sm tracking-wide">Full experience section parsing</span>
              </motion.div>

              <motion.div 
                className="bg-white/10 backdrop-blur-md p-4 pr-8 rounded-xl flex items-center gap-4 shadow-xl border border-white/5 self-center lg:self-start lg:translate-x-10 w-max"
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-brand-lilac"><FileBadge size={20} /></div>
                <span className="font-bold text-sm tracking-wide">Optimized skills section</span>
              </motion.div>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
};

export default FeaturesSection;
