import React from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, Target, ShieldCheck, Clock } from 'lucide-react';

const features = [
  {
    icon: Target,
    title: 'Hyper-Tailored Matching',
    description: 'Our AI analyzes the job description to highlight your most relevant skills and experiences perfectly.',
    color: 'text-brand-orange',
    bg: 'bg-brand-orange/10'
  },
  {
    icon: BrainCircuit,
    title: 'Human-like Tone',
    description: 'Advanced prompt chaining ensures the output reads like a confident professional, not a generic robot.',
    color: 'text-brand-pink',
    bg: 'bg-brand-pink/10'
  },
  {
    icon: ShieldCheck,
    title: 'Quality Assured',
    description: 'Every letter is scored by our AI quality checker for impact, clarity, and ATS readability before you see it.',
    color: 'text-[#00B67A]',
    bg: 'bg-[#00B67A]/10'
  },
  {
    icon: Clock,
    title: 'Done in Seconds',
    description: 'Stop staring at a blank page. Go from job description to a polished, ready-to-send cover letter instantly.',
    color: 'text-brand-lilac',
    bg: 'bg-brand-lilac/10'
  }
];

const CoverLetterFeatures = () => {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-brand-dark mb-6 tracking-tight">
            Stop writing cover letters from scratch
          </h2>
          <p className="text-lg text-brand-dark/60">
            Our AI takes the heavy lifting out of job applications, giving you a massive advantage in speed and quality.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="bg-brand-offwhite p-8 rounded-3xl border border-brand-dark/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-6`}>
                  <Icon size={28} className={feature.color} />
                </div>
                <h3 className="text-xl font-bold text-brand-dark mb-3">{feature.title}</h3>
                <p className="text-brand-dark/60 leading-relaxed text-sm">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CoverLetterFeatures;
