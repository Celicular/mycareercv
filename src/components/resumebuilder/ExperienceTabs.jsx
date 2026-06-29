import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Zap, Compass, Check } from 'lucide-react';

const tabData = [
  {
    id: 'senior',
    title: 'Senior & Executive',
    icon: Briefcase,
    heading: 'Senior & Executive',
    description: "AI ensures you fit your work history on a single page. MyCareerCV's Bullet Point Generator and AI Writer reword your experience section to show impact and fit on one page. Cut the fluff and highlight what you bring to the table.",
    points: [
      "Reword and shorten work experience bullet points from your current resume.",
      "Get an AI review for each experience entry, trained on our recruitment experience.",
      "Generate or rewrite your resume summary based on the job you're applying for.",
      "Optimize your one-page resume layout for clarity and impact."
    ],
    imageGradient: "from-brand-orange to-brand-pink"
  },
  {
    id: 'entry',
    title: 'Entry- & Mid-Level',
    icon: Zap,
    heading: 'Entry- & Mid-Level',
    description: "Stand out even if you don't have decades of experience. Our AI helps you translate your education, internships, and soft skills into a compelling narrative that recruiters love.",
    points: [
      "Highlight academic achievements and relevant coursework.",
      "Translate non-industry experience into transferable skills.",
      "Get suggestions for impactful action verbs tailored for junior roles.",
      "Automatically format to hide employment gaps or lack of experience."
    ],
    imageGradient: "from-brand-pink to-brand-lilac"
  },
  {
    id: 'career',
    title: 'Career Changers',
    icon: Compass,
    heading: 'Career Changers',
    description: "Pivoting to a new industry is tough. MyCareerCV's AI extracts your most relevant transferable skills and helps you rewrite your summary to explain your career transition perfectly.",
    points: [
      "Identify and highlight transferable skills from past roles.",
      "Generate a targeted summary explaining your pivot clearly.",
      "Match your existing experience with the new industry's keywords.",
      "Reorder sections to prioritize relevant projects or certifications."
    ],
    imageGradient: "from-brand-lilac to-brand-orange"
  }
];

const ExperienceTabs = () => {
  const [activeTab, setActiveTab] = useState(tabData[0].id);

  const activeContent = tabData.find(t => t.id === activeTab);

  return (
    <section className="py-24 px-6 bg-brand-offwhite">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl tracking-tight text-brand-dark">
            Make a great resume, regardless of experience
          </h2>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {tabData.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-6 py-3 rounded-full font-medium text-sm transition-colors duration-300 ${isActive ? 'text-white' : 'text-brand-dark/60 hover:text-brand-dark hover:bg-brand-dark/5'}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 bg-brand-dark rounded-full z-0"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon size={16} className={isActive ? "text-brand-orange" : ""} />
                  {tab.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-sm border border-brand-dark/5 overflow-hidden min-h-[400px] flex items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="grid md:grid-cols-2 gap-12 items-center w-full"
            >
              <div>
                <h3 className="text-3xl font-semibold mb-6">{activeContent.heading}</h3>
                <p className="text-brand-dark/70 text-lg leading-relaxed mb-8">
                  {activeContent.description}
                </p>
                <div className="space-y-4">
                  {activeContent.points.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="mt-1 bg-brand-offwhite p-1 rounded-full text-brand-orange shrink-0">
                        <Check size={14} strokeWidth={3} />
                      </div>
                      <p className="text-brand-dark/80 font-medium leading-relaxed">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Decorative Visual for the Tab */}
              <div className="relative h-full min-h-[300px] w-full rounded-2xl overflow-hidden flex items-center justify-center bg-brand-offwhite/50 border border-brand-dark/5">
                <div className={`absolute inset-0 bg-gradient-to-br ${activeContent.imageGradient} opacity-10`} />
                <div className="relative z-10 w-48 h-64 bg-white rounded-lg shadow-2xl border border-brand-dark/5 p-4 flex flex-col gap-2 transform rotate-3">
                  <div className="w-1/3 h-4 bg-brand-dark/10 rounded-full mb-4" />
                  <div className="w-full h-2 bg-brand-dark/5 rounded-full" />
                  <div className="w-5/6 h-2 bg-brand-dark/5 rounded-full" />
                  <div className="w-full h-2 bg-brand-dark/5 rounded-full" />
                  <div className="mt-4 w-1/2 h-3 bg-brand-orange/20 rounded-full" />
                  <div className="w-full h-2 bg-brand-dark/5 rounded-full mt-2" />
                  <div className="w-4/5 h-2 bg-brand-dark/5 rounded-full" />
                  
                  {/* Floating Elements */}
                  <motion.div 
                    animate={{ y: [0, -10, 0] }} 
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -right-6 top-1/4 bg-white p-2 rounded-xl shadow-lg border border-brand-dark/5"
                  >
                    <div className="w-8 h-8 rounded-full bg-brand-lilac/20 flex items-center justify-center">
                      <Zap size={16} className="text-brand-lilac" />
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default ExperienceTabs;
