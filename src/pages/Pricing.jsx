import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/homepage/Navbar';
import Footer from '../components/homepage/Footer';
import { Check, Star, Shield, CreditCard, LayoutTemplate, Sparkles, Target } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Pricing() {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-brand-offwhite font-body selection:bg-brand-orange selection:text-white">
      <Navbar />

      <main className="pt-32 pb-20">
        {/* Header Section */}
        <section className="max-w-4xl mx-auto px-6 text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-brand-dark tracking-tight leading-tight mb-6"
          >
            Build a strikingly powerful resume <span className="text-brand-orange relative whitespace-nowrap">approved by recruiters<svg className="absolute -bottom-2 left-0 w-full h-3 text-brand-orange/20" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 5 Q 50 10 100 5" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg></span>
          </motion.h1>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Link to="/resume-builder-overview" className="inline-block px-8 py-4 bg-brand-dark text-white rounded-xl font-bold tracking-wider uppercase hover:bg-brand-orange hover:-translate-y-1 transition-all shadow-lg shadow-brand-dark/20">
              Build My Resume Now
            </Link>
          </motion.div>
        </section>

        {/* Pricing Cards */}
        <section className="max-w-5xl mx-auto px-6 mb-24">
          <div className="grid md:grid-cols-2 gap-8 items-start">
            
            {/* Free Plan */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl p-8 border border-brand-dark/10 shadow-xl shadow-brand-dark/5"
            >
              <h3 className="text-2xl font-bold text-brand-dark mb-2">Free Plan</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-extrabold">₹0</span>
              </div>
              <p className="text-brand-dark/60 font-medium mb-8">Valid for 7 days</p>

              <ul className="space-y-4 mb-8">
                {[
                  'All resume templates',
                  'Basic resume sections',
                  'MyCareerCV branding',
                  'Maximum 12 section items',
                  'Access to all design tools'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-brand-dark/80 font-medium">
                    <Check size={20} className="text-brand-orange shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/resume-builder-overview" className="block w-full py-4 text-center rounded-xl bg-brand-offwhite text-brand-dark font-bold hover:bg-brand-dark hover:text-white transition-all border border-brand-dark/10">
                Build My Resume
              </Link>
            </motion.div>

            {/* Pro Plan */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-brand-dark text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-orange/20 rounded-full blur-3xl -mr-10 -mt-10" />
              
              <div className="flex justify-between items-start mb-6 relative">
                <h3 className="text-2xl font-bold">Pro Quarterly Plan</h3>
                <span className="bg-brand-orange text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">SAVE 25%</span>
              </div>
              
              <div className="mb-2 relative">
                <span className="text-lg text-white/50 line-through mr-2">₹2667</span>
                <span className="text-4xl font-extrabold text-brand-orange">₹663</span>
                <span className="text-white/60 ml-1">/mo</span>
              </div>
              <p className="text-white/60 font-medium mb-8 relative">₹1990 billed every 3 months</p>

              <ul className="space-y-4 mb-8 relative">
                {[
                  '300 resumes and cover letters',
                  'All resume templates',
                  'Real-time content suggestions',
                  'ATS check (Applicant Tracking System)',
                  'Pro resume sections',
                  'No branding',
                  'Unlimited section items',
                  'Thousands of design options'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-white/90 font-medium">
                    <Check size={20} className="text-brand-orange shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/resume-builder-overview" className="block w-full py-4 text-center rounded-xl bg-brand-orange text-white font-bold hover:bg-brand-orange/90 transition-all shadow-lg shadow-brand-orange/30 relative">
                Build My Resume
              </Link>
            </motion.div>
          </div>
          
          <div className="mt-8 flex flex-col md:flex-row items-center justify-center gap-4 text-brand-dark/40 font-medium text-sm">
            <span className="flex items-center gap-2"><Shield size={16} /> Secure Payment</span>
            <div className="flex gap-3">
              <span>MasterCard</span> • <span>Visa</span> • <span>Amex</span> • <span>PayPal</span>
            </div>
          </div>
        </section>

        {/* Feature Highlights */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-brand-dark mb-4">A feature-packed resume builder that makes creation a breeze</h2>
            <p className="text-lg text-brand-dark/60 leading-relaxed">Create a visually stunning resume with ease. Our builder will guide you through the process. We help with content suggestions and choosing the right design, while you focus on presenting yourself.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-brand-dark/5 shadow-lg shadow-brand-dark/5 text-center">
              <div className="w-16 h-16 mx-auto bg-brand-peach/20 text-brand-orange rounded-2xl flex items-center justify-center mb-6">
                <LayoutTemplate size={32} />
              </div>
              <h3 className="text-xl font-bold text-brand-dark mb-3">One builder, hundreds of templates</h3>
              <p className="text-brand-dark/60 leading-relaxed mb-6">Choose from hundreds of professionally designed and ATS-friendly resume templates, tens of sections, and thousands of combinations.</p>
              <Link to="#" className="text-brand-orange font-bold hover:underline">View All Templates →</Link>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-brand-dark/5 shadow-lg shadow-brand-dark/5 text-center">
              <div className="w-16 h-16 mx-auto bg-brand-lilac/20 text-brand-lilac rounded-2xl flex items-center justify-center mb-6">
                <Sparkles size={32} />
              </div>
              <h3 className="text-xl font-bold text-brand-dark mb-3">AI-powered mistake checking</h3>
              <p className="text-brand-dark/60 leading-relaxed mb-6">Get a powerful content analyzing tool. Don’t let typos cost a potential job. Cut out clichés, repetition, and vague wording instantly.</p>
              <Link to="/resume-builder-overview" className="text-brand-orange font-bold hover:underline">Build Mistake-free →</Link>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-brand-dark/5 shadow-lg shadow-brand-dark/5 text-center">
              <div className="w-16 h-16 mx-auto bg-brand-pink/20 text-brand-pink rounded-2xl flex items-center justify-center mb-6">
                <Target size={32} />
              </div>
              <h3 className="text-xl font-bold text-brand-dark mb-3">Tailor with a single click</h3>
              <p className="text-brand-dark/60 leading-relaxed mb-6">Ensure your resume is relevant to the job. We’ll show you what you need to include in order to pass the ATS screening.</p>
              <Link to="/resume-builder-overview" className="text-brand-orange font-bold hover:underline">Build Tailored Resume →</Link>
            </div>
          </div>
        </section>

        {/* Testimonial */}
        <section className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-brand-dark/40 uppercase tracking-widest mb-8">What people say about us</h2>
          <div className="bg-white p-10 rounded-3xl border border-brand-dark/10 shadow-2xl relative">
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-brand-orange text-white px-4 py-1 rounded-full flex gap-1">
              {[1,2,3,4,5].map(i => <Star key={i} size={14} fill="currentColor" />)}
            </div>
            <p className="text-xl md:text-2xl text-brand-dark font-medium italic leading-relaxed mb-8">
              "It’s the only tool online that gives a millennial-worthy resume without the cheap, non-applicable templates. The balance between style, content, and function is just stunning. I’ve been on many hiring committees and a MyCareerCV resume will always catch my eye. It’s clean and minimal."
            </p>
            <div>
              <p className="font-bold text-brand-dark text-lg">Account Manager</p>
              <p className="text-brand-dark/50">OpenNest</p>
            </div>
            <div className="mt-6 pt-6 border-t border-brand-dark/10 flex justify-center items-center gap-2 text-sm font-medium">
              <span className="text-brand-dark">Excellent</span>
              <span className="w-1.5 h-1.5 rounded-full bg-brand-dark/20" />
              <span className="text-brand-dark/50">5,286 Reviews</span>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="text-center py-16">
          <Link to="/resume-builder-overview" className="inline-block px-10 py-5 bg-brand-orange text-white rounded-2xl font-bold text-lg tracking-wider uppercase hover:bg-brand-orange/90 hover:-translate-y-1 transition-all shadow-xl shadow-brand-orange/30">
            Build My Resume Now
          </Link>
        </section>

      </main>
      
      <Footer />
    </div>
  );
}
