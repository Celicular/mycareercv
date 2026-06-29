import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, ChevronDown, Sparkles, FileCheck, LayoutTemplate, LogOut, LayoutDashboard, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const dropdownItems = [
  {
    title: 'AI Resume Builder',
    description: 'Helps you to land interviews',
    icon: Sparkles,
    path: '/resume-builder-overview',
    bgColor: 'bg-brand-peach/20',
    iconColor: 'text-brand-orange',
  },
  {
    title: 'Resume Checker',
    description: 'Is your resume good enough?',
    icon: FileCheck,
    path: '/resume-checker',
    bgColor: 'bg-brand-lilac/20',
    iconColor: 'text-brand-lilac',
  },
  {
    title: 'Resume Templates',
    description: 'Free and premium templates',
    icon: LayoutTemplate,
    path: '/resume-templates',
    bgColor: 'bg-brand-pink/20',
    iconColor: 'text-brand-pink',
  }
];

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAvatarDropdownOpen, setIsAvatarDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { openAuthModal, user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className={`fixed left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-5xl transition-all duration-500 ease-out ${isScrolled ? 'top-4' : 'top-6'}`}>
      <nav className={`flex items-center justify-between text-brand-dark transition-all duration-500 ease-out rounded-full px-6 py-3 border ${isScrolled ? 'bg-white/70 backdrop-blur-md shadow-md border-brand-dark/10' : 'bg-white border-brand-dark/5 shadow-sm'}`}>
        <div className="flex items-center gap-2">
          <Briefcase className="text-brand-orange" size={24} />
          <Link to="/" className="text-xl font-heading tracking-widest uppercase">MyCareerCV</Link>
        </div>
        
        <div className="hidden md:flex items-center gap-8 font-medium text-sm uppercase tracking-wider">
          {/* Resume Dropdown Trigger Container */}
          <div 
            className="relative py-2"
            onMouseEnter={() => setIsDropdownOpen(true)}
            onMouseLeave={() => setIsDropdownOpen(false)}
          >
            <button className="flex items-center gap-1 hover:text-brand-orange transition-colors cursor-pointer focus:outline-none uppercase font-medium text-sm tracking-wider">
              <span>Resume</span>
              <ChevronDown className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} size={14} />
            </button>
            
            {/* Dropdown Menu */}
            <AnimatePresence>
              {isDropdownOpen && (
                <div className="absolute top-full left-0 pt-2 z-50">
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="w-80 bg-white border border-brand-dark/10 rounded-2xl shadow-xl p-3"
                  >
                    <div className="flex flex-col gap-1">
                      {dropdownItems.map((item, idx) => {
                        const IconComponent = item.icon;
                        return (
                          <Link
                            key={idx}
                            to={item.path}
                            className="flex items-start gap-4 p-3 rounded-xl hover:bg-brand-offwhite transition-all duration-200 group/item"
                          >
                            <div className={`p-2.5 rounded-lg ${item.bgColor} ${item.iconColor} transition-transform duration-300 group-hover/item:scale-110 shrink-0`}>
                              <IconComponent size={20} />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm text-brand-dark normal-case tracking-normal transition-colors duration-200 group-hover/item:text-brand-orange">
                                {item.title}
                              </span>
                              <span className="text-xs text-brand-dark/60 normal-case tracking-normal font-normal mt-0.5">
                                {item.description}
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>

          <Link to="/cover-letter-generator" className="hover:text-brand-orange transition-colors">Cover Letter</Link>
          <Link to="/pricing" className="hover:text-brand-orange transition-colors">Pricing</Link>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div 
              className="relative"
              onMouseEnter={() => setIsAvatarDropdownOpen(true)}
              onMouseLeave={() => setIsAvatarDropdownOpen(false)}
            >
              <button className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-orange text-white font-bold tracking-wider hover:ring-2 hover:ring-brand-orange hover:ring-offset-2 transition-all">
                {getInitials(user.name || user.email)}
              </button>
              <AnimatePresence>
                {isAvatarDropdownOpen && (
                  <div className="absolute top-full right-0 pt-2 z-50">
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 5, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="w-48 bg-white border border-brand-dark/10 rounded-2xl shadow-xl p-2 flex flex-col gap-1"
                    >
                      <Link to="/dashboard" className="px-4 py-2.5 text-sm font-medium text-brand-dark hover:bg-brand-offwhite rounded-xl transition-colors text-left flex items-center gap-2">
                        <LayoutDashboard size={16} className="text-brand-dark/50" />
                        Dashboard
                      </Link>
                      <div className="h-px bg-brand-dark/5 my-1" />
                      <button 
                        onClick={() => {
                          logout();
                          setIsAvatarDropdownOpen(false);
                        }}
                        className="px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left flex items-center gap-2 w-full"
                      >
                        <LogOut size={16} className="text-red-500/70" />
                        Log Out
                      </button>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button 
              onClick={() => openAuthModal('register')}
              className="hidden md:block bg-brand-dark text-white px-6 py-2.5 rounded-full text-sm font-heading uppercase tracking-widest hover:bg-black transition-colors"
            >
              Get Started
            </button>
          )}

          {/* Hamburger Menu Toggle (Mobile) */}
          <button 
            className="md:hidden p-2 text-brand-dark"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute top-full mt-2 left-0 right-0 bg-white rounded-2xl shadow-lg border border-brand-dark/10 overflow-hidden md:hidden flex flex-col p-4 gap-4 origin-top z-50"
          >
            <div className="flex flex-col gap-3 font-medium text-sm tracking-wider uppercase">
              <span className="text-brand-dark/50 text-xs px-2">Resume</span>
              <div className="flex flex-col gap-2 pl-2 border-l-2 border-brand-orange/20 ml-2">
                {dropdownItems.map((item, idx) => (
                  <Link
                    key={idx}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-brand-offwhite transition-colors"
                  >
                    <item.icon size={16} className={item.iconColor} />
                    <span className="normal-case">{item.title}</span>
                  </Link>
                ))}
              </div>
              <Link to="/cover-letter-generator" onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-brand-offwhite rounded-xl">Cover Letter</Link>
              <Link to="/pricing" onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-brand-offwhite rounded-xl">Pricing</Link>
            </div>
            
            {user ? (
              <div className="border-t border-brand-dark/10 pt-4 flex flex-col gap-2">
                <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 p-2 hover:bg-brand-offwhite rounded-xl font-medium">
                  <LayoutDashboard size={16} /> Dashboard
                </Link>
                <button 
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 p-2 hover:bg-red-50 text-red-600 rounded-xl font-medium text-left"
                >
                  <LogOut size={16} /> Log Out
                </button>
              </div>
            ) : (
              <div className="border-t border-brand-dark/10 pt-4 flex flex-col gap-2">
                <button 
                  onClick={() => {
                    openAuthModal('register');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-brand-dark text-white px-4 py-3 rounded-xl text-sm font-heading uppercase tracking-widest hover:bg-black transition-colors text-center"
                >
                  Get Started
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Navbar;
