import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';

const AuthModal = () => {
  const { isAuthModalOpen, closeAuthModal, authModalMode, setAuthModalMode, login } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      closeAuthModal();
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (authModalMode === 'register') {
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          setIsLoading(false);
          return;
        }
        // Transition to mock payment step instead of registering immediately
        setAuthModalMode('payment');
        setIsLoading(false);
        return;
        
      } else if (authModalMode === 'login') {
        const res = await axiosClient.post('/auth/login', {
          email: formData.email,
          password: formData.password
        });
        await login();
        navigate('/dashboard');
        
      } else if (authModalMode === 'forgot') {
        const res = await axiosClient.post('/auth/forgot-password', {
          email: formData.email
        });
        setOtpSent(true);
        // Requirement: Show OTP in alert for now
        alert(`OTP Received: ${res.data.otp}`);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalRegister = async (withPayment) => {
    setError('');
    setIsLoading(true);
    try {
      // Pass withPayment flag if needed in future (mock razorpay logic)
      await axiosClient.post('/auth/register', {
        email: formData.email,
        name: formData.name,
        password: formData.password
      });
      // The backend now issues an HttpOnly cookie and auto-logs in.
      // Simply trigger frontend login refresh
      await login();
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed.');
      setAuthModalMode('register'); // Go back if failed
    } finally {
      setIsLoading(false);
    }
  };

  const inputVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (custom) => ({
      opacity: 1,
      y: 0,
      transition: { delay: custom * 0.1, duration: 0.3 }
    }),
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleOverlayClick}
        className="fixed inset-0 z-[100] bg-brand-dark/40 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          layoutId="authModal"
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', bounce: 0.3, duration: 0.6 }}
          className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden relative border border-brand-dark/10"
        >
          {/* Close Button */}
          <button 
            onClick={closeAuthModal}
            className="absolute top-4 right-4 p-2 text-brand-dark/50 hover:text-brand-dark hover:bg-brand-offwhite rounded-full transition-colors z-10"
          >
            <X size={20} />
          </button>

          <div className="p-8">
            <motion.div layout className="mb-8 text-center">
              <h2 className="text-3xl font-heading uppercase tracking-widest text-brand-dark mb-2">
                {authModalMode === 'login' && 'Welcome Back'}
                {authModalMode === 'register' && 'Create Account'}
                {authModalMode === 'forgot' && 'Reset Password'}
              </h2>
              <p className="text-brand-dark/60 text-sm">
                {authModalMode === 'login' && 'Enter your details to access your resumes.'}
                {authModalMode === 'register' && 'Join MyCareerCV to land your dream job.'}
                {authModalMode === 'forgot' && 'Enter your email to receive a reset code.'}
                {authModalMode === 'payment' && 'Unlock all premium features for 3 days.'}
              </p>
            </motion.div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm text-center font-medium"
              >
                {error}
              </motion.div>
            )}

            {authModalMode === 'forgot' && otpSent ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-6 text-center"
              >
                <div className="w-16 h-16 bg-[#00B67A]/10 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="text-[#00B67A]" size={32} />
                </div>
                <h3 className="text-xl font-bold mb-2">OTP Sent Successfully</h3>
                <p className="text-brand-dark/60 text-sm mb-6">
                  We've sent a 6-digit code to {formData.email}. Please check your inbox.
                </p>
                <button 
                  onClick={() => setAuthModalMode('login')}
                  className="text-brand-orange font-semibold hover:underline"
                >
                  Back to Login
                </button>
              </motion.div>
            ) : authModalMode === 'payment' ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col gap-4"
              >
                <div className="bg-brand-dark/5 p-4 rounded-xl border border-brand-dark/10 mb-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-brand-dark">Premium Trial</span>
                    <span className="text-brand-orange font-bold">3 Days Free</span>
                  </div>
                  <p className="text-sm text-brand-dark/60">Cancel anytime. $9.99/mo after trial.</p>
                </div>
                
                <div className="space-y-3">
                  <div className="relative">
                    <input type="text" placeholder="Card Number (Mock)" className="w-full bg-brand-offwhite border border-brand-dark/5 rounded-xl py-3 pl-4 pr-4 focus:outline-none focus:border-brand-orange" />
                  </div>
                  <div className="flex gap-3">
                    <input type="text" placeholder="MM/YY" className="w-1/2 bg-brand-offwhite border border-brand-dark/5 rounded-xl py-3 pl-4 pr-4 focus:outline-none focus:border-brand-orange" />
                    <input type="text" placeholder="CVC" className="w-1/2 bg-brand-offwhite border border-brand-dark/5 rounded-xl py-3 pl-4 pr-4 focus:outline-none focus:border-brand-orange" />
                  </div>
                </div>

                <button 
                  onClick={() => handleFinalRegister(true)}
                  disabled={isLoading}
                  className="w-full py-4 mt-2 bg-brand-orange hover:bg-[#E65C00] text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? 'Processing...' : 'Start Free Trial'}
                </button>
                <button 
                  onClick={() => handleFinalRegister(false)}
                  disabled={isLoading}
                  className="w-full py-3 bg-transparent text-brand-dark/50 hover:text-brand-dark font-medium transition-colors"
                >
                  Skip for now, go Free
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <AnimatePresence mode="wait">
                  {authModalMode === 'register' && (
                    <motion.div
                      key="name"
                      custom={1}
                      variants={inputVariants}
                      initial="hidden" animate="visible" exit="exit"
                      className="relative"
                    >
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-dark/40" size={18} />
                      <input 
                        type="text" 
                        name="name"
                        placeholder="Full Name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full bg-brand-offwhite border border-brand-dark/5 rounded-xl py-3.5 pl-11 pr-4 focus:outline-none focus:border-brand-orange focus:bg-white transition-all text-brand-dark"
                      />
                    </motion.div>
                  )}

                  <motion.div
                    key="email"
                    custom={2}
                    variants={inputVariants}
                    initial="hidden" animate="visible" exit="exit"
                    className="relative"
                  >
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-dark/40" size={18} />
                    <input 
                      type="email" 
                      name="email"
                      placeholder="Email Address"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full bg-brand-offwhite border border-brand-dark/5 rounded-xl py-3.5 pl-11 pr-4 focus:outline-none focus:border-brand-orange focus:bg-white transition-all text-brand-dark"
                    />
                  </motion.div>

                  {authModalMode !== 'forgot' && (
                    <motion.div
                      key="password"
                      custom={3}
                      variants={inputVariants}
                      initial="hidden" animate="visible" exit="exit"
                      className="relative"
                    >
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-dark/40" size={18} />
                      <input 
                        type="password" 
                        name="password"
                        placeholder="Password"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full bg-brand-offwhite border border-brand-dark/5 rounded-xl py-3.5 pl-11 pr-4 focus:outline-none focus:border-brand-orange focus:bg-white transition-all text-brand-dark"
                      />
                    </motion.div>
                  )}

                  {authModalMode === 'register' && (
                    <motion.div
                      key="confirmPassword"
                      custom={4}
                      variants={inputVariants}
                      initial="hidden" animate="visible" exit="exit"
                      className="relative"
                    >
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-dark/40" size={18} />
                      <input 
                        type="password" 
                        name="confirmPassword"
                        placeholder="Confirm Password"
                        required
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full bg-brand-offwhite border border-brand-dark/5 rounded-xl py-3.5 pl-11 pr-4 focus:outline-none focus:border-brand-orange focus:bg-white transition-all text-brand-dark"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {authModalMode === 'login' && (
                  <div className="flex justify-end">
                    <button 
                      type="button"
                      onClick={() => setAuthModalMode('forgot')}
                      className="text-xs text-brand-dark/60 hover:text-brand-orange transition-colors font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <motion.button
                  layout
                  disabled={isLoading}
                  type="submit"
                  className="w-full mt-2 bg-brand-dark text-white rounded-xl py-4 font-heading uppercase tracking-widest text-sm hover:bg-black transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {isLoading ? 'Processing...' : (
                      <>
                        {authModalMode === 'login' && 'Log In'}
                        {authModalMode === 'register' && 'Create Account'}
                        {authModalMode === 'forgot' && 'Send Reset Link'}
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                </motion.button>

                {authModalMode !== 'forgot' && (
                  <>
                    <div className="flex items-center gap-4 my-4">
                      <div className="h-px bg-brand-dark/10 flex-1" />
                      <span className="text-xs text-brand-dark/40 font-medium uppercase tracking-wider">Or</span>
                      <div className="h-px bg-brand-dark/10 flex-1" />
                    </div>

                    <button 
                      type="button"
                      className="w-full bg-white border border-brand-dark/15 text-brand-dark rounded-xl py-3.5 font-medium text-sm hover:bg-brand-offwhite transition-colors flex items-center justify-center gap-3 shadow-sm hover:shadow-md"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Continue with Google
                    </button>
                  </>
                )}

                <div className="mt-6 text-center text-sm text-brand-dark/60">
                  {authModalMode === 'login' ? (
                    <>
                      Don't have an account?{' '}
                      <button 
                        type="button"
                        onClick={() => setAuthModalMode('register')} 
                        className="text-brand-orange font-semibold hover:underline"
                      >
                        Sign up
                      </button>
                    </>
                  ) : authModalMode === 'register' ? (
                    <>
                      Already have an account?{' '}
                      <button 
                        type="button"
                        onClick={() => setAuthModalMode('login')} 
                        className="text-brand-orange font-semibold hover:underline"
                      >
                        Log in
                      </button>
                    </>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => setAuthModalMode('login')} 
                      className="text-brand-orange font-semibold hover:underline"
                    >
                      Back to Login
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AuthModal;
