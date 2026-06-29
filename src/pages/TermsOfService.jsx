import React from 'react';
import { motion } from 'framer-motion';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-brand-offwhite text-brand-dark pt-32 pb-20">
      <div className="container mx-auto px-6 max-w-4xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-brand-dark/5"
        >
          <h1 className="text-4xl font-heading font-bold mb-8">Terms of Service</h1>
          <div className="prose prose-brand max-w-none text-brand-dark/80">
            <p className="mb-6">Last updated: {new Date().toLocaleDateString()}</p>
            
            <h2 className="text-2xl font-bold text-brand-dark mt-8 mb-4">1. Acceptance of Terms</h2>
            <p className="mb-4">By accessing and using MyCareerCV, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.</p>
            
            <h2 className="text-2xl font-bold text-brand-dark mt-8 mb-4">2. Provision of Services</h2>
            <p className="mb-4">You agree and acknowledge that MyCareerCV is entitled to modify, improve or discontinue any of its services at its sole discretion and without notice to you even if it may result in you being prevented from accessing any information contained in it.</p>
            
            <h2 className="text-2xl font-bold text-brand-dark mt-8 mb-4">3. Subscription and Billing</h2>
            <p className="mb-4">After the initial 3-day free trial period, access to premium features requires a paid subscription. You agree to provide current, complete, and accurate purchase and account information for all purchases made via the site.</p>
            
            <h2 className="text-2xl font-bold text-brand-dark mt-8 mb-4">4. Limitation of Liability</h2>
            <p className="mb-4">You understand and agree that MyCareerCV and any of its subsidiaries or affiliates shall in no event be liable for any direct, indirect, incidental, consequential, or exemplary damages.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TermsOfService;
