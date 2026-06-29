import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle2, Sparkles, FileText, Search, Languages } from 'lucide-react';

const tabs = [
  {
    id: 'generation',
    title: 'AI content generation',
    icon: Sparkles,
    bullets: [
      'Get suggestions based on your target job',
      'Match the tone and language recruiters expect',
      'Control your input—get focused, relevant output'
    ],
    color: 'bg-[#4ECDC4]'
  },
  {
    id: 'parsing',
    title: 'AI resume parsing',
    icon: FileText,
    bullets: [
      'Upload any existing resume or LinkedIn profile',
      'AI automatically extracts and categorizes your experience',
      'Zero manual data entry required'
    ],
    color: 'bg-[#B68BFF]'
  },
  {
    id: 'skills',
    title: 'AI skills finder',
    icon: Search,
    bullets: [
      'Scan job descriptions for missing keywords',
      'Discover latent skills from your experience bullet points',
      'Rank skills by relevance to the specific role'
    ],
    color: 'bg-[#FF5A36]'
  },
  {
    id: 'translation',
    title: 'Translate your resume with AI',
    icon: Languages,
    bullets: [
      'Translate your entire resume into 30+ languages instantly',
      'Maintains native, professional industry terminology',
      'Perfect formatting preserved across translations'
    ],
    color: 'bg-[#FFB4D1]'
  }
];

const AiFeatureSection = () => {
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  const activeTabData = tabs.find(t => t.id === activeTab);

  return (
    <section className="bg-brand-dark py-32 px-6 relative overflow-hidden z-10">
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#B68BFF]/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#4ECDC4]/5 rounded-full blur-[100px] pointer-events-none translate-y-1/3 -translate-x-1/3"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading uppercase text-white mb-4">
            Fully equipped for the age of AI
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto text-lg">
            The AI Resume Builder helps you create resumes faster and smarter. Start with a job title, description, or custom prompt—and get high-quality text tailored to the role.
          </p>
        </motion.div>

        <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-4 md:p-8 flex flex-col lg:flex-row gap-8 shadow-2xl">
          {/* Left Side: Tabs */}
          <div className="w-full lg:w-5/12 flex flex-col py-4 px-2 md:px-6">
            <div className="flex-grow space-y-2">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <div key={tab.id} className="border-b border-brand-dark/5 last:border-0">
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full text-left py-5 px-2 flex items-center justify-between transition-all duration-300 ${
                        isActive ? 'text-brand-dark' : 'text-brand-dark/50 hover:text-brand-dark/80'
                      }`}
                    >
                      <span className="font-heading uppercase tracking-wide text-lg md:text-xl">
                        {tab.title}
                      </span>
                    </button>
                    
                    {/* Tab Content (Animated) */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="pb-6 px-2 space-y-4">
                            {/* Animated Underline Indicator */}
                            <motion.div 
                              layoutId="activeTabIndicator"
                              className="h-[2px] w-full bg-gradient-to-r from-[#4ECDC4] to-[#B68BFF] mb-6 rounded-full"
                              transition={{ duration: 0.3 }}
                            />
                            
                            {tab.bullets.map((bullet, i) => (
                              <motion.div 
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="flex items-start gap-3"
                              >
                                <CheckCircle2 className="text-[#4ECDC4] shrink-0 mt-0.5" size={18} />
                                <span className="text-brand-dark/70 font-medium text-sm md:text-base leading-snug">{bullet}</span>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 pt-6 px-2">
              <a href="#" className="inline-flex items-center gap-2 text-brand-lilac font-bold hover:underline uppercase tracking-wider text-sm transition-all group">
                Explore MyCareerCV AI
                <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>

          {/* Right Side: Mockup Area */}
          <div className={`w-full lg:w-7/12 rounded-[1.5rem] md:rounded-[2.5rem] p-8 md:p-12 flex items-center justify-center transition-colors duration-700 relative overflow-hidden ${activeTabData.color}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.05, y: -20 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md relative z-10"
              >
                {/* Simulated App UI */}
                <div className="bg-white rounded-xl shadow-2xl border border-white/50 overflow-hidden flex flex-col h-[300px] relative">
                  {/* Header */}
                  <div className="h-10 border-b border-brand-dark/5 flex items-center px-4 gap-2 bg-brand-offwhite/50">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                  </div>
                  {/* Body */}
                  <div className="p-6 flex-grow relative overflow-hidden bg-[#fafafa]">
                    <div className="w-3/4 h-4 bg-brand-dark/5 rounded-full mb-4"></div>
                    <div className="w-full h-3 bg-brand-dark/5 rounded-full mb-3"></div>
                    <div className="w-full h-3 bg-brand-dark/5 rounded-full mb-3"></div>
                    <div className="w-5/6 h-3 bg-brand-dark/5 rounded-full mb-8"></div>

                    {/* AI Popup Representation */}
                    <div className="absolute bottom-4 right-4 bg-white p-4 rounded-xl shadow-xl border border-brand-dark/5 w-64 transform translate-y-2">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-[#FF5A36] animate-pulse"></div>
                        <span className="text-[10px] font-bold tracking-widest text-brand-dark/50 uppercase">AI Suggestions</span>
                      </div>
                      <p className="text-xs font-medium text-brand-dark/80 mb-4 leading-relaxed">
                        Replace: "Product-orientated Chief Technology Officer..." with a more impactful action statement.
                      </p>
                      <div className="flex justify-between items-center text-xs font-bold">
                        <button className="text-brand-dark/40 hover:text-brand-dark">Restore</button>
                        <button className="text-[#4ECDC4]">Approve</button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
            
            {/* Decorative background shapes for mockup area */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AiFeatureSection;
