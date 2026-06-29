import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, Mail, MessageSquare, CheckCircle } from 'lucide-react';
import axiosClient from '../api/axiosClient';

const ContactUs = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      await axiosClient.post('/contact', formData);
      setStatus('success');
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      setStatus('error');
      setErrorMsg(error.response?.data?.detail || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-brand-offwhite text-brand-dark pt-32 pb-20">
      <div className="container mx-auto px-6 max-w-2xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-brand-dark/5"
        >
          <div className="text-center mb-10">
            <h1 className="text-4xl font-heading font-bold mb-4">Get in Touch</h1>
            <p className="text-brand-dark/60">Have a question or feedback? We'd love to hear from you.</p>
          </div>

          <AnimatePresence mode="wait">
            {status === 'success' ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center justify-center py-10 text-center"
              >
                <div className="w-20 h-20 bg-[#00B67A]/10 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle className="text-[#00B67A]" size={40} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Message Sent!</h2>
                <p className="text-brand-dark/60 mb-8">Thank you for reaching out. We will get back to you shortly.</p>
                <button 
                  onClick={() => setStatus('idle')}
                  className="px-8 py-3 bg-brand-orange hover:bg-[#E65C00] text-white rounded-xl font-bold transition-colors"
                >
                  Send Another Message
                </button>
              </motion.div>
            ) : (
              <motion.form 
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit} 
                className="space-y-6"
              >
                {status === 'error' && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                    {errorMsg}
                  </div>
                )}
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-dark/40" size={18} />
                  <input 
                    type="text" 
                    name="name"
                    placeholder="Your Name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full bg-brand-offwhite border border-brand-dark/5 rounded-xl py-3.5 pl-11 pr-4 focus:outline-none focus:border-brand-orange focus:bg-white transition-all"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-dark/40" size={18} />
                  <input 
                    type="email" 
                    name="email"
                    placeholder="Email Address"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full bg-brand-offwhite border border-brand-dark/5 rounded-xl py-3.5 pl-11 pr-4 focus:outline-none focus:border-brand-orange focus:bg-white transition-all"
                  />
                </div>
                <div className="relative">
                  <MessageSquare className="absolute left-4 top-6 -translate-y-1/2 text-brand-dark/40" size={18} />
                  <textarea 
                    name="message"
                    placeholder="Your Message"
                    required
                    rows="5"
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full bg-brand-offwhite border border-brand-dark/5 rounded-xl py-4 pl-11 pr-4 focus:outline-none focus:border-brand-orange focus:bg-white transition-all resize-none"
                  ></textarea>
                </div>
                <button 
                  type="submit" 
                  disabled={status === 'loading'}
                  className="w-full py-4 bg-brand-orange hover:bg-[#E65C00] text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {status === 'loading' ? 'Sending...' : (
                    <>
                      Send Message
                      <Send size={18} />
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default ContactUs;
