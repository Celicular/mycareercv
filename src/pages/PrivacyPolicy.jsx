import React from 'react';
import { motion } from 'framer-motion';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-brand-offwhite text-brand-dark pt-32 pb-20">
      <div className="container mx-auto px-6 max-w-4xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-brand-dark/5"
        >
          <h1 className="text-4xl font-heading font-bold mb-8">Privacy Policy</h1>
          <div className="prose prose-brand max-w-none text-brand-dark/80">
            <p className="mb-6">Last updated: {new Date().toLocaleDateString()}</p>
            
            <h2 className="text-2xl font-bold text-brand-dark mt-8 mb-4">1. Information We Collect</h2>
            <p className="mb-4">We collect information you provide directly to us, such as when you create or modify your account, use our resume building tools, contact customer support, or otherwise communicate with us. This information may include your name, email address, phone number, work history, and any other information you choose to provide on your resume.</p>
            
            <h2 className="text-2xl font-bold text-brand-dark mt-8 mb-4">2. How We Use Your Information</h2>
            <p className="mb-4">We use the information we collect to provide, maintain, and improve our services. Specifically, we use it to generate resumes, score them against ATS systems, process transactions, and send you related information, including confirmations and receipts.</p>
            
            <h2 className="text-2xl font-bold text-brand-dark mt-8 mb-4">3. Security</h2>
            <p className="mb-4">We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.</p>
            
            <h2 className="text-2xl font-bold text-brand-dark mt-8 mb-4">4. Contact Us</h2>
            <p className="mb-4">If you have any questions about this Privacy Policy, please contact us via our Contact page.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
