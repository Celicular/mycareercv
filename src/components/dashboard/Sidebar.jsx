import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Briefcase, 
  FileText, 
  Settings, 
  Menu, 
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  MailOpen,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
  const { logout, user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isAdmin = user?.role === 'admin';

  const navItems = isAdmin ? [
    { name: 'Templates', icon: FileText, path: '/dashboard/templates' },
    { name: 'Leads', icon: MessageSquare, path: '/dashboard/leads' },
    { name: 'Settings', icon: Settings, path: '/dashboard/settings' },
  ] : [
    { name: 'My Resumes', icon: FileText, path: '/dashboard' },
    { name: 'Cover Letters', icon: MailOpen, path: '/dashboard/cover-letters' },
    { name: 'Settings', icon: Settings, path: '/dashboard/settings' },
  ];

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-brand-dark/10 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <Briefcase className="text-brand-orange" size={24} />
          <span className="font-heading uppercase tracking-widest text-brand-dark">MyCareerCV</span>
        </div>
        <button onClick={() => setIsMobileOpen(true)} className="p-2 text-brand-dark hover:bg-brand-offwhite rounded-lg">
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-brand-dark/40 backdrop-blur-sm z-50"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ===== DESKTOP SIDEBAR ===== */}
      {/* Outer wrapper: overflow-visible so the toggle button is NOT clipped */}
      <motion.div
        initial={false}
        animate={{ width: isCollapsed ? 80 : 260 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative hidden md:block shrink-0 z-40 h-screen"
      >
        {/* Inner panel: overflow-hidden to clip text/nav content */}
        <div className="absolute inset-0 bg-white border-r border-brand-dark/10 flex flex-col overflow-hidden">
          {/* Logo */}
          <div className="h-20 flex items-center px-5 border-b border-brand-dark/5 shrink-0">
            <Briefcase className="text-brand-orange shrink-0" size={28} />
            <motion.span
              initial={false}
              animate={{ opacity: isCollapsed ? 0 : 1, width: isCollapsed ? 0 : 'auto', marginLeft: isCollapsed ? 0 : 12 }}
              transition={{ duration: 0.25 }}
              className="font-heading text-lg uppercase tracking-widest text-brand-dark whitespace-nowrap overflow-hidden"
            >
              MyCareerCV
            </motion.span>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  end={item.path === '/dashboard'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3.5 rounded-xl transition-all duration-200 overflow-hidden ${
                      isActive
                        ? 'bg-brand-orange text-white shadow-md'
                        : 'text-brand-dark/60 hover:bg-brand-offwhite hover:text-brand-dark'
                    }`
                  }
                >
                  <Icon size={20} className="shrink-0" />
                  <motion.span
                    initial={false}
                    animate={{ opacity: isCollapsed ? 0 : 1, width: isCollapsed ? 0 : 'auto' }}
                    transition={{ duration: 0.2 }}
                    className="font-medium text-sm whitespace-nowrap"
                  >
                    {item.name}
                  </motion.span>
                </NavLink>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-3 border-t border-brand-dark/5">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors overflow-hidden"
            >
              <LogOut size={20} className="shrink-0" />
              <motion.span
                initial={false}
                animate={{ opacity: isCollapsed ? 0 : 1, width: isCollapsed ? 0 : 'auto' }}
                transition={{ duration: 0.2 }}
                className="font-medium text-sm whitespace-nowrap"
              >
                Log Out
              </motion.span>
            </button>
          </div>
        </div>

        {/* Collapse Toggle — lives OUTSIDE inner div so it is not clipped */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3.5 top-24 w-7 h-7 bg-white border border-brand-dark/15 rounded-full flex items-center justify-center text-brand-dark/50 hover:text-brand-orange hover:border-brand-orange shadow-md transition-all z-50"
        >
          {isCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </motion.div>

      {/* ===== MOBILE SIDEBAR DRAWER ===== */}
      <motion.aside
        initial={false}
        animate={{ x: isMobileOpen ? 0 : -280 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="md:hidden fixed top-0 left-0 h-screen w-[260px] bg-white border-r border-brand-dark/10 z-[60] flex flex-col overflow-hidden"
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-brand-dark/5 shrink-0">
          <div className="flex items-center gap-2">
            <Briefcase className="text-brand-orange" size={22} />
            <span className="font-heading uppercase tracking-widest text-brand-dark text-base">MyCareerCV</span>
          </div>
          <button onClick={() => setIsMobileOpen(false)} className="p-2 text-brand-dark hover:bg-brand-offwhite rounded-lg">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.path === '/dashboard'}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-brand-orange text-white shadow-md'
                      : 'text-brand-dark/60 hover:bg-brand-offwhite hover:text-brand-dark'
                  }`
                }
              >
                <Icon size={20} className="shrink-0" />
                <span className="font-medium text-sm">{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-brand-dark/5">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} className="shrink-0" />
            <span className="font-medium text-sm">Log Out</span>
          </button>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
