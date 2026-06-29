import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings as SettingsIcon, User, Mail, Lock, CheckCircle2,
  AlertCircle, Loader2, Save, CreditCard, Download, Crown, Clock, Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/dashboard/Sidebar';
import { updateProfile, deleteAccount } from '../api/userApi';

const Settings = () => {
  const { user, isLoading, login, openAuthModal } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    confirmPassword: '',
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (formData.password && formData.password !== formData.confirmPassword) {
      setErrorMsg("Passwords don't match.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
      };
      if (formData.password) {
        payload.password = formData.password;
      }

      const updatedUser = await updateProfile(payload);
      // Update the user context implicitly by re-fetching via cookie
      login();

      setSuccessMsg('Profile updated successfully!');
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' })); // clear passwords
    } catch (e) {
      setErrorMsg(e.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you absolutely sure you want to delete your account? This action cannot be undone and all your resumes and templates will be permanently lost.")) {
      return;
    }
    setDeleting(true);
    try {
      await deleteAccount();
      navigate('/');
      window.location.reload(); // Force full reload to clear context
    } catch (e) {
      setErrorMsg(e.response?.data?.detail || 'Failed to delete account.');
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-brand-offwhite items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={36} className="text-brand-orange animate-spin" />
          <p className="text-brand-dark font-medium">Loading Settings...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-brand-offwhite overflow-hidden font-body selection:bg-brand-orange selection:text-white">
      <Sidebar />

      <main className="flex-1 overflow-y-auto mt-16 md:mt-0 p-6 md:p-10">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <header className="mb-10 flex items-start justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-brand-dark mb-2 tracking-tight flex items-center gap-3">
                <SettingsIcon className="text-brand-orange" size={32} />
                Settings
              </h1>
              <p className="text-brand-dark/60 font-medium">
                Manage your account and profile preferences.
              </p>
            </div>
          </header>

          {/* Subscription Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-brand-dark/5 p-8 shadow-sm mb-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-brand-orange/10 flex items-center justify-center">
                <CreditCard className="text-brand-orange" size={20} />
              </div>
              <h2 className="text-xl font-bold text-brand-dark">Subscription & Billing</h2>
            </div>

            {user?.subscription_status === 'active' ? (
              <div className="bg-brand-offwhite rounded-2xl p-6 border border-brand-dark/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Crown className="text-[#00B67A]" size={20} />
                    <span className="font-bold text-brand-dark">Premium Plan Active</span>
                  </div>
                  <span className="text-sm font-semibold bg-[#00B67A]/10 text-[#00B67A] px-3 py-1 rounded-full">Active</span>
                </div>
                <p className="text-sm text-brand-dark/60 mb-6">You have full access to unlimited resume generations, ATS scoring, and all premium templates.</p>
                
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-brand-dark/10 hover:bg-brand-offwhite rounded-xl text-sm font-bold text-brand-dark transition-colors">
                  <Download size={16} />
                  Download Latest Receipt
                </button>
              </div>
            ) : (
              <div className="bg-brand-offwhite rounded-2xl p-6 border border-brand-dark/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="text-brand-orange" size={20} />
                    <span className="font-bold text-brand-dark">Free Trial</span>
                  </div>
                  <span className="text-sm font-semibold bg-brand-orange/10 text-brand-orange px-3 py-1 rounded-full">Trial</span>
                </div>
                <p className="text-sm text-brand-dark/60 mb-4">
                  Your free trial expires on: 
                  <span className="font-bold text-brand-dark ml-1">
                    {user?.trial_end_date ? new Date(user.trial_end_date).toLocaleDateString() : 'N/A'}
                  </span>
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <button 
                    onClick={() => openAuthModal('payment')}
                    className="flex-1 py-3 bg-brand-orange hover:bg-[#E65C00] text-white rounded-xl text-sm font-bold shadow-md transition-colors text-center"
                  >
                    Upgrade to Premium
                  </button>
                </div>
              </div>
            )}
          </motion.div>

          {/* Settings Form */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl border border-brand-dark/5 p-8 shadow-sm"
          >
            <h2 className="text-xl font-bold text-brand-dark mb-6">Profile Information</h2>

            <AnimatePresence>
              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 flex items-center gap-3 p-4 bg-[#00B67A]/10 border border-[#00B67A]/20 rounded-xl"
                >
                  <CheckCircle2 className="text-[#00B67A] shrink-0" size={20} />
                  <p className="text-sm font-semibold text-[#00B67A]">{successMsg}</p>
                </motion.div>
              )}
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl"
                >
                  <AlertCircle className="text-red-500 shrink-0" size={20} />
                  <p className="text-sm font-semibold text-red-600">{errorMsg}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Name */}
              <div>
                <label className="text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <User size={14} /> Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-brand-dark/15 bg-brand-offwhite/50 px-4 py-3 text-sm text-brand-dark placeholder:text-brand-dark/30 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange transition-all"
                  placeholder="Your Name"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Mail size={14} /> Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-brand-dark/15 bg-brand-offwhite/50 px-4 py-3 text-sm text-brand-dark placeholder:text-brand-dark/30 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange transition-all"
                  placeholder="you@example.com"
                />
              </div>

              <div className="border-t border-brand-dark/5 my-2"></div>

              <h3 className="text-sm font-bold text-brand-dark mb-1">Change Password</h3>
              <p className="text-xs text-brand-dark/50 mb-4 font-medium">Leave blank if you don't want to change your password.</p>

              {/* Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Lock size={14} /> New Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-brand-dark/15 bg-brand-offwhite/50 px-4 py-3 text-sm text-brand-dark placeholder:text-brand-dark/30 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange transition-all"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-brand-dark/60 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Lock size={14} /> Confirm Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-brand-dark/15 bg-brand-offwhite/50 px-4 py-3 text-sm text-brand-dark placeholder:text-brand-dark/30 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-brand-dark text-white rounded-xl text-sm font-bold shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>

          {/* Danger Zone */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 bg-red-50 rounded-3xl border border-red-200 p-8 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="text-red-500" size={24} />
              <h2 className="text-xl font-bold text-red-600">Danger Zone</h2>
            </div>
            <p className="text-sm font-medium text-red-700/80 mb-6">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {deleting ? (
                <><Loader2 size={16} className="animate-spin" /> Deleting...</>
              ) : (
                'Delete My Account'
              )}
            </button>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
