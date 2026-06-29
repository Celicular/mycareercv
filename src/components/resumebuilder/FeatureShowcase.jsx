import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, FileText, Upload, Sparkles, BrainCircuit, Target, ListChecks } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const featuresData = [
  {
    id: "tailor",
    title: "One-Click AI Resume Tailoring",
    subtitle: "Customize your resume for any role in seconds",
    description: "MyCareerCV's AI job-tailoring tool scans the job description and updates your resume to match what recruiters are looking for. Create multiple tailored resumes, adjust your title, add a missing summary or skills section, and insert relevant keywords and action verbs into your bullet points. You can even generate a custom cover letter.",
    icon: Sparkles,
    color: "text-brand-orange",
    bgColor: "bg-brand-peach/20",
    points: [
      { title: "Fast Job Match", desc: "Job-match your resume in less than 30 seconds, with a clear to-do list of what you need to fix." },
      { title: "Keyword Matching", desc: "Keyword-match vital sections, ensuring your Summary, Experience, and Skills sections are on point." },
      { title: "Unlimited Downloads", desc: "Download unlimited tailored resumes, and apply to as many positions as you need to." },
      { title: "Auto Formatting", desc: "Automatically adjust your resume format for different roles, whether technical, creative, or managerial." }
    ],
    mockType: "jobAdWithUpload",
    mockPlaceholder: "Paste the job requirements here to auto-tailor your resume...",
    mockButton: "Upload Resume to Start"
  },
  {
    id: "summary",
    title: "Resume Summary Generator",
    subtitle: "Create a job-specific resume summary",
    description: "You can create a tailored resume summary using our AI Assistant. All it needs to know is your job title or the job description you're applying for. You'll receive a summary statement, written in a way that appeals to recruiters and showcases your top skills needed for the job.",
    icon: BrainCircuit,
    color: "text-brand-lilac",
    bgColor: "bg-brand-lilac/20",
    points: [
      { title: "Personalized by AI", desc: "Get AI to personalize your resume summary to every job you apply for." },
      { title: "Smart Content", desc: "AI handles the wording and content based on other resume sections and the job ad." },
      { title: "Improve Existing", desc: "Improve your existing resume summary instead of generating one from scratch." },
      { title: "Proven Formulas", desc: "Follow proven summary formulas used in top resume examples." }
    ],
    mockType: "jobAdWithUpload",
    mockPlaceholder: "Paste the job requirements here so we can tailor the summary...",
    mockButton: "Upload Resume to Start"
  },
  {
    id: "bullets",
    title: "Resume Bullet Point Generator",
    subtitle: "Rewrite any experience bullet instantly",
    description: "The in-line AI Assistant can rewrite experience bullets for clarity, review them from a recruiter's perspective, or provide suggestions inspiring you to make your experience bullets more impactful. Go beyond with an open-form prompt field allowing you to explain exactly what you need.",
    icon: ListChecks,
    color: "text-brand-pink",
    bgColor: "bg-brand-pink/20",
    points: [
      { title: "AI Generation", desc: "Generate bullet points with AI from the rest of your resume or create editable templates." },
      { title: "Refine Bullets", desc: "Refine existing bullets by fixing any typos and adding clear, measurable results." },
      { title: "Smart Suggestions", desc: "Receive improvement suggestions on bullets that don't bring value to your resume." },
      { title: "Recruiter Approved", desc: "Use recruiter-approved action verbs and achievement structures." }
    ],
    mockType: "uploadOnly",
    mockPlaceholder: "Upload resume to enhance bullets",
    mockButton: "Upload Resume to Start"
  },
  {
    id: "strengths",
    title: "Strengths and achievements highlight",
    subtitle: "Put your best accomplishments front and center",
    description: "MyCareerCV's AI Resume Builder helps you showcase your strengths and achievements based on your job title and experience. If you already have this section, the AI can make it more impactful and results-oriented. It can add clear, quantifiable metrics that align with what the company's looking for.",
    icon: Target,
    color: "text-[#00B67A]",
    bgColor: "bg-[#00B67A]/10",
    points: [
      { title: "Highlight Requirements", desc: "Ensure your resume content highlights the most important job requirements." },
      { title: "AI Recommendations", desc: "Get AI recommendations for a strength-specific resume section, based on the rest of your resume." },
      { title: "Custom Adjustments", desc: "Add your custom requests, and our AI will help you adjust your strength and achievements accordingly." },
      { title: "Measurable Results", desc: "Make your achievements more measurable and results-driven." }
    ],
    mockType: "jobAdOnly",
    mockPlaceholder: "Paste the job ad here. We'll tell you exactly what skills and experience to highlight...",
    mockButton: "Paste Job Ad to Start"
  },
  {
    id: "skills",
    title: "Resume Skills Generator",
    subtitle: "Generate skills from a job posting",
    description: "The AI Resume Writer will extract the right skills from the job description and add them to your resume, helping you get a higher ATS score. You can also generate the most appropriate skills based on your job title.",
    icon: FileText,
    color: "text-brand-orange",
    bgColor: "bg-brand-peach/20",
    points: [
      { title: "AI Skill Extraction", desc: "Get AI to analyze the job description and extract the skills you need in a separate section." },
      { title: "Hard Skills Focus", desc: "Put only the hard skills that matter for the job." },
      { title: "Soft Skills Integration", desc: "Get real examples of soft skills woven into your resume sections." },
      { title: "ATS Score Boost", desc: "Improve your ATS keyword score automatically." }
    ],
    mockType: "jobAdOnly",
    mockPlaceholder: "Paste the job posting here. We'll extract the must-have skills...",
    mockButton: "Paste Job Ad to Start"
  }
];

const MockInteractiveArea = ({ item, openAuthModal }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-brand-dark/5 relative overflow-hidden h-full flex flex-col justify-center min-h-[400px]">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-orange via-brand-pink to-brand-lilac" />
      
      {(item.mockType === 'jobAdWithUpload' || item.mockType === 'jobAdOnly') && (
        <div className="mb-6 flex-1 flex flex-col">
          <label className="text-sm font-semibold uppercase tracking-wider text-brand-dark/70 mb-2 block">
            Job Description
          </label>
          <div className={`flex-1 rounded-2xl border-2 transition-all duration-300 relative bg-brand-offwhite/50 ${isFocused ? 'border-brand-lilac shadow-[0_0_0_4px_rgba(182,139,255,0.1)]' : 'border-brand-dark/10 hover:border-brand-dark/20'}`}>
            <textarea 
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="w-full h-full p-4 bg-transparent outline-none resize-none placeholder:text-brand-dark/30 text-brand-dark"
              placeholder={item.mockPlaceholder}
            />
            <div className="absolute bottom-3 right-3 opacity-50">
              <Sparkles size={18} className={item.color} />
            </div>
          </div>
        </div>
      )}

      {(item.mockType === 'jobAdWithUpload' || item.mockType === 'uploadOnly') && (
        <div 
          onClick={() => openAuthModal('register')}
          className="mb-6"
        >
          <div className="border-2 border-dashed border-brand-dark/15 rounded-2xl p-6 text-center hover:border-brand-orange/50 transition-colors cursor-pointer bg-brand-offwhite/30 group">
            <Upload className="mx-auto mb-2 text-brand-dark/40 group-hover:text-brand-orange transition-colors" size={24} />
            <p className="text-sm font-medium text-brand-dark/80">Click to upload or drag & drop</p>
            <p className="text-xs text-brand-dark/40 mt-1">PDF or DOCX</p>
          </div>
        </div>
      )}

      <button 
        onClick={() => openAuthModal('register')}
        className="w-full bg-brand-dark text-white rounded-full py-4 font-heading uppercase tracking-widest text-sm hover:bg-black transition-all duration-300 hover:shadow-lg flex items-center justify-center gap-2 group"
      >
        <Sparkles size={16} className="group-hover:text-brand-orange transition-colors" />
        {item.mockButton}
      </button>
    </div>
  );
};

const FeatureShowcase = () => {
  const { openAuthModal } = useAuth();

  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto flex flex-col gap-32">
        {featuresData.map((feature, index) => {
          const IconComp = feature.icon;
          const isEven = index % 2 === 0;

          return (
            <div key={feature.id} className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 lg:gap-20 items-center`}>
              
              {/* Text Content */}
              <motion.div 
                initial={{ opacity: 0, x: isEven ? -40 : 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="flex-1"
              >
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${feature.bgColor} mb-6`}>
                  <IconComp className={feature.color} size={28} />
                </div>
                
                <h2 className="text-sm font-bold uppercase tracking-widest text-brand-dark/50 mb-3">{feature.title}</h2>
                <h3 className="text-4xl md:text-5xl mb-6 tracking-tight leading-tight">{feature.subtitle}</h3>
                
                <p className="text-lg text-brand-dark/70 leading-relaxed mb-10">
                  {feature.description}
                </p>
                
                <div className="grid sm:grid-cols-2 gap-6">
                  {feature.points.map((point, idx) => (
                    <div key={idx} className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={18} className={feature.color} />
                        <span className="font-semibold">{point.title}</span>
                      </div>
                      <p className="text-sm text-brand-dark/60 leading-relaxed pl-6">
                        {point.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Interactive Mock */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
                className="flex-1 w-full max-w-lg mx-auto"
              >
                <MockInteractiveArea item={feature} openAuthModal={openAuthModal} />
              </motion.div>

            </div>
          );
        })}
      </div>
    </section>
  );
};

export default FeatureShowcase;
