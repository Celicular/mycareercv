import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { SpellCheck, MousePointerClick, LayoutTemplate, ShieldCheck, CheckCircle2 } from 'lucide-react';

const ladderItems = [
  { 
    icon: SpellCheck, 
    title: "Leave proofreading to AI tech", 
    description: "A built-in checker keeps grammar, clichés, and readability under control.",
    bullets: ["Wording and readability analysis", "Error and typo elimination", "Smart suggestions tailored to your job"]
  },
  { 
    icon: MousePointerClick, 
    title: "Tailor your resume in one click", 
    description: "Paste the job description—our assistant does the rest. In seconds, it updates your resume to match the role you're targeting.",
    bullets: ["Section creation and updates", "Job-relevant skills and action verb suggestions", "Title and bullet point alignment", "Cover letter generation"]
  },
  { 
    icon: LayoutTemplate, 
    title: "Choose from 20+ professional sections", 
    description: "Present your story in clean, eye-catching formats built for recruiters.",
    bullets: ["Professional sections: Experience, Skills, Summary, Education", "Personal sections: Strengths, Quotes, Books, Interests, My Time", "Additional sections: Certifications, Awards, Achievements, Languages, Projects"]
  },
  { 
    icon: ShieldCheck, 
    title: "Make sure your resume beats the ATS", 
    description: "Our ATS check ensures your resume reaches recruiters exactly as you designed it.",
    bullets: ["Detect keyword and content gaps", "Get actionable suggestions to pass AI scans and recruiter bots"]
  }
];

const TrustBar = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"]
  });

  return (
    <section ref={containerRef} className="py-40 px-6 bg-brand-offwhite relative z-10 overflow-hidden">
      <div className="max-w-4xl mx-auto text-center mb-32">
        <span className="bg-white text-brand-dark px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider mb-6 inline-block">The Advantage</span>
        <h2 className="text-5xl md:text-7xl font-heading uppercase tracking-tighter text-brand-dark mb-6 leading-none">
          TRUSTED BY THOUSANDS <br className="hidden md:block" /> OF JOB SEEKERS
        </h2>
        <p className="text-xl text-brand-dark/50 font-medium max-w-2xl mx-auto">Built from the ground up to get you hired faster.</p>
      </div>

      <div className="relative max-w-3xl mx-auto pb-20">
        {/* Background matte inactive line */}
        <div className="absolute left-[24px] md:left-1/2 top-0 bottom-0 w-1 bg-brand-dark/5 transform md:-translate-x-1/2 rounded-full"></div>
        
        {/* Animated active colored line */}
        <motion.div 
          className="absolute left-[24px] md:left-1/2 top-0 bottom-0 w-1 bg-brand-orange transform md:-translate-x-1/2 origin-top rounded-full"
          style={{ scaleY: scrollYProgress }}
        ></motion.div>

        <div className="space-y-32">
          {ladderItems.map((item, index) => {
            const Icon = item.icon;
            const isLeft = index % 2 === 0;

            // Calculate activation points for each rung of the ladder
            const startProgress = index * (1 / (ladderItems.length - 1)) - 0.15;
            const endProgress = startProgress + 0.15;

            // Matte colors and smooth transformations
            const opacity = useTransform(scrollYProgress, [startProgress, endProgress], [0.3, 1]);
            const yOffset = useTransform(scrollYProgress, [startProgress, endProgress], [20, 0]);
            const borderColor = useTransform(scrollYProgress, [startProgress, endProgress], ["rgba(35, 35, 37, 0.05)", "#FF5A36"]);
            const iconColor = useTransform(scrollYProgress, [startProgress, endProgress], ["rgba(35, 35, 37, 0.3)", "#FF5A36"]);
            const dotScale = useTransform(scrollYProgress, [startProgress, endProgress], [0, 1]);

            return (
              <div key={index} className={`relative flex items-center ${isLeft ? 'md:flex-row-reverse' : 'md:flex-row'} md:justify-between`}>
                
                {/* Desktop Spacer */}
                <div className="hidden md:block w-1/2"></div>
                
                {/* Node on the line */}
                <motion.div 
                  className="absolute left-[24px] md:left-1/2 w-8 h-8 rounded-full bg-brand-offwhite border-4 z-10 transform -translate-x-1/2 flex items-center justify-center transition-colors duration-300"
                  style={{ borderColor }}
                >
                  <motion.div 
                    className="w-2.5 h-2.5 rounded-full bg-brand-orange" 
                    style={{ scale: dotScale }} 
                  />
                </motion.div>

                {/* Content Container */}
                <motion.div 
                  className={`w-full md:w-1/2 pl-16 md:pl-0 ${isLeft ? 'md:pr-20' : 'md:pl-20'}`}
                  style={{ opacity, y: yOffset }}
                >
                  <div className="flex flex-col items-start group text-left">
                    <motion.div 
                      className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 border border-brand-dark/5 shadow-sm"
                      style={{ color: iconColor }}
                    >
                      <Icon size={32} />
                    </motion.div>
                    <h3 className="text-3xl font-heading uppercase text-brand-dark tracking-tight mb-3">{item.title}</h3>
                    <p className="text-lg text-brand-dark/60 font-medium leading-relaxed max-w-md mb-6">{item.description}</p>
                    
                    {item.bullets && (
                      <ul className="space-y-3 w-full max-w-md text-left">
                        {item.bullets.map((bullet, i) => (
                          <li key={i} className="flex items-start gap-3 flex-row">
                            <CheckCircle2 className="text-brand-orange shrink-0 mt-1" size={18} />
                            <span className="text-brand-dark/80 font-medium">{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </motion.div>
                
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TrustBar;
