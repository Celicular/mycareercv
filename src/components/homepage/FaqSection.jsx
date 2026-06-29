import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: "Is the resume builder free?",
    answer: "You can start building your resume for free. Premium plans unlock advanced features."
  },
  {
    question: "Are the templates ATS-friendly?",
    answer: "Yes. Every template is optimized for modern Applicant Tracking Systems."
  },
  {
    question: "Can I tailor resumes for different jobs?",
    answer: "Yes. Our AI can customize your resume based on a job description."
  },
  {
    question: "Can I export as PDF?",
    answer: "Yes. Download your resume as PDF instantly."
  },
  {
    question: "Do I need design experience?",
    answer: "Not at all. The builder handles formatting automatically."
  }
];

const FaqItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-brand-dark/10 last:border-0">
      <button 
        className="w-full py-8 flex justify-between items-center text-left focus:outline-none group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-xl md:text-2xl font-semibold text-brand-dark pr-8 group-hover:text-brand-orange transition-colors">{question}</span>
        <div className={`transform transition-transform duration-300 bg-brand-offwhite p-3 rounded-full ${isOpen ? 'rotate-180 bg-brand-orange text-white' : ''}`}>
          <ChevronDown size={24} className={isOpen ? 'text-white' : 'text-brand-dark'} />
        </div>
      </button>
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-40 opacity-100 mb-8' : 'max-h-0 opacity-0'}`}
      >
        <p className="text-lg text-brand-dark/60 font-medium leading-relaxed">{answer}</p>
      </div>
    </div>
  );
};

const FaqSection = () => {
  return (
    <section className="py-32 px-6 bg-white rounded-[3rem] shadow-[0_10px_40px_rgb(0,0,0,0.03)] -mt-10 relative z-0">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
           <span className="bg-brand-offwhite text-brand-dark px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider mb-6 inline-block shadow-sm">FAQ</span>
          <h2 className="text-5xl md:text-6xl font-heading uppercase tracking-tighter text-brand-dark">
            FREQUENTLY ASKED QUESTIONS
          </h2>
        </div>
        <div>
          {faqs.map((faq, index) => (
            <FaqItem key={index} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
