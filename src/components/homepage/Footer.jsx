import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="sticky top-0 bg-brand-dark text-white min-h-screen flex flex-col justify-between pt-32 pb-12 px-6 rounded-t-[3rem] z-50">
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-20">
          <div className="col-span-2 md:col-span-1">
             <div className="flex items-center gap-2 mb-8">
                <Briefcase className="text-brand-orange" size={36} />
                <span className="text-3xl font-heading tracking-widest uppercase">MyCareerCV</span>
              </div>
              <p className="text-white/50 mb-8 text-base leading-relaxed max-w-xs">Made with love by people who care. Build your resume perfectly and land your dream job faster.</p>
              <div className="inline-block bg-white/10 px-5 py-3 rounded-full text-sm text-white uppercase tracking-wider font-medium hover:bg-white/20 transition-colors cursor-pointer">
                 5,270 Reviews
              </div>
          </div>
          
          <div>
            <h4 className="font-heading uppercase tracking-wider text-base mb-8 text-white/40">Resume</h4>
            <ul className="space-y-5 text-white/80 font-medium text-base">
              <li><Link to="/resume-templates" className="hover:text-white transition-colors">Resume Templates</Link></li>
              <li><Link to="/resume-builder-overview" className="hover:text-white transition-colors">Resume Builder</Link></li>
              <li><Link to="/cover-letter-generator" className="hover:text-white transition-colors">Cover Letters</Link></li>
              <li><Link to="/resume-checker" className="hover:text-white transition-colors">Resume Checker</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-heading uppercase tracking-wider text-base mb-8 text-white/40">Cover Letter</h4>
            <ul className="space-y-5 text-white/80 font-medium text-base">
              <li><Link to="/cover-letter-generator" className="hover:text-white transition-colors">Cover Letter Builder</Link></li>
              <li><Link to="/cover-letter-examples" className="hover:text-white transition-colors">Cover Letter Examples</Link></li>
              <li><Link to="/cover-letter-formats" className="hover:text-white transition-colors">Cover Letter Formats</Link></li>
              <li><Link to="/how-to-write-a-cover-letter" className="hover:text-white transition-colors">How to Write a Cover Letter</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading uppercase tracking-wider text-base mb-8 text-white/40">About</h4>
            <ul className="space-y-5 text-white/80 font-medium text-base">
              <li><Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-white/10 pt-10 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-white/30 font-medium uppercase tracking-wider">
          <div>© 2026 MyCareerCV. All rights reserved.</div>
          <div>Protected by reCAPTCHA, Google Privacy Policy & Terms apply.</div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
