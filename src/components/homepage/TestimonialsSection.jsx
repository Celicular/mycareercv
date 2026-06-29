import React from 'react';
import { motion } from 'framer-motion';

const ReviewCard = ({ name, time, quote, rating = 5 }) => (
  <div className="bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300">
    <div className="flex gap-1 mb-2 text-[#4ECDC4]">
      {[...Array(rating)].map((_, i) => (
        <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
      ))}
    </div>
    <div className="text-xs text-brand-dark/40 font-bold mb-4 uppercase">{time}</div>
    <p className="text-sm font-medium text-brand-dark/70 mb-6 leading-relaxed">"{quote}"</p>
    <div className="flex items-center gap-2">
      <div className="w-5 h-[1px] bg-brand-dark/20"></div>
      <span className="font-heading text-brand-dark uppercase tracking-wide text-xs">{name}</span>
    </div>
  </div>
);

const TestimonialsSection = () => {
  return (
    <section className="py-32 px-6 bg-white rounded-[3rem] shadow-[0_10px_40px_rgb(0,0,0,0.03)] relative z-10 overflow-hidden">
      {/* Soft Blob Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-to-tr from-[#FFB4D1]/40 via-[#FF5A36]/20 to-[#B68BFF]/30 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

      <div className="max-w-6xl mx-auto">
        <motion.div 
          className="mb-16 max-w-lg"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h2 className="text-4xl md:text-5xl font-heading uppercase tracking-tighter text-brand-dark leading-[1.1]">
            Trusted by executives & senior professionals
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1 */}
          <motion.div 
            className="flex flex-col gap-6 md:pt-20"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            <ReviewCard 
              name="Khushboo Srivastav" 
              time="22 hours ago" 
              quote="Its the best CV building tool, it gives tailored CV for every job description without a worry, stored all JD along with what CV used for, look and feel of the CV is truly dynamic and professional." 
            />
            <ReviewCard 
              name="Virgil" 
              time="1 day ago" 
              quote="Very easy to draft a CV with lots of templates to choose from." 
            />
          </motion.div>

          {/* Column 2 */}
          <motion.div 
            className="flex flex-col gap-6"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          >
            {/* Summary Card */}
            <div className="bg-[#D1C7B3]/20 backdrop-blur-md p-8 rounded-2xl shadow-sm border border-brand-dark/5">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex text-[#4ECDC4]">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  ))}
                </div>
                <span className="text-xs font-bold text-brand-dark/70">4.5 Rating</span>
              </div>
              <p className="text-xl font-medium text-brand-dark leading-snug">5,270 happy customers shared their experience.</p>
            </div>

            <ReviewCard 
              name="Collins" 
              time="2 days ago" 
              quote="It's aid in generating good outstanding comprehensive resume." 
            />

            {/* Read Reviews Link */}
            <div className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-brand-dark/5 text-center flex flex-col items-center justify-center min-h-[120px]">
              <span className="text-sm font-medium text-brand-dark/60 mb-2">Read reviews or leave yours at:</span>
              <a href="#" className="text-sm font-bold text-brand-lilac hover:underline uppercase tracking-wide">Reviews.io ↗</a>
            </div>
          </motion.div>

          {/* Column 3 */}
          <motion.div 
            className="flex flex-col gap-6 md:pt-10"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          >
            <ReviewCard 
              name="John D." 
              time="3 days ago" 
              quote="Great website for cv building. Additional fonts could be useful but the existing ones are already good." 
            />
            <ReviewCard 
              name="Roseline" 
              time="4 days ago" 
              quote="Nicely surprised from the professional level." 
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
