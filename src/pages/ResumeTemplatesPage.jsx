import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/homepage/Navbar';
import Footer from '../components/homepage/Footer';
import { useAuth } from '../context/AuthContext';

// Template Data
const templates = [
  { name: 'Double Column', type: 'Double Column', photo: false, columns: 2, image: 'https://cdn.enhancv.com/predefined-examples/VItFdJGOjUEgtPcW3NCqfRyftvar7Q8ykyQG8lrN/image.png' },
  { name: 'Ivy League', type: 'Ivy League', photo: false, columns: 1, image: 'https://cdn.enhancv.com/predefined-examples/ReBXSmrO1AVkWSEUpP6CshDM0Krt0YjIu9GIBjVH/image.png' },
  { name: 'Elegant', type: 'Elegant', photo: false, columns: 2, image: 'https://cdn.enhancv.com/predefined-examples/2PgeDKJ9wYaz5lZU5TQkeKkrwptUZyl37CoirzFI/image.png' },
  { name: 'Crest', type: 'Crest', photo: false, columns: 1, image: 'https://cdn.enhancv.com/predefined-examples/AUJTqeTEKysjKsSDKK7cFaAGvEwbQKqvZ987mV8S/image.png' },
  { name: 'Single Column', type: 'Single Column', photo: false, columns: 1, image: 'https://cdn.enhancv.com/predefined-examples/IZDIpIAP1XcENd0O4dHoWRwn9UgqkTJZIxLifyGr/image.png' },
  { name: 'Polished', type: 'Polished', photo: false, columns: 2, image: 'https://cdn.enhancv.com/predefined-examples/WF3cvUCRc2TFyximSV87zMDP9Hkx9c5qvKyrv5N6/image.png' },
  { name: 'Timeline', type: 'Timeline', photo: false, columns: 1, image: 'https://cdn.enhancv.com/predefined-examples/NxX8Bo4KAnhdWakuZDFVby3Sl6ehIGtGphnOpnt0/image.png' },
  { name: 'Creative', type: 'Creative', photo: true, columns: 2, image: 'https://cdn.enhancv.com/predefined-examples/ZFflqGtgnLAJEezegVPqtcIpnKU8jSPGivTZTv4G/image.png' },
  { name: 'Stylish', type: 'Stylish', photo: false, columns: 2, image: 'https://cdn.enhancv.com/predefined-examples/NswwKP8zJI2gCCGQyFvzd2Jw2ddiXLYjEArnjSjr/image.png' },
  { name: 'Modern', type: 'Modern', photo: false, columns: 2, image: 'https://cdn.enhancv.com/predefined-examples/AVeDMOCNmh6wGEbg9TGvJP9KqQlOi5bHgCl55nT4/image.png' },
  { name: 'Contemporary', type: 'Contemporary', photo: true, columns: 2, image: 'https://cdn.enhancv.com/predefined-examples/tI8CUznh9tKraRhyqPsx3xWXhrYZ20FYSIqz7a9k/image.png' },
  { name: 'Ivy League with Photo', type: 'Ivy League', photo: true, columns: 1, image: 'https://cdn.enhancv.com/predefined-examples/I3ENTgiXdMzgPq8UXQqYG1sm5ouSjuWktDxDIJ0H/image.png' },
  { name: 'Ivy League with Logos', type: 'Ivy League', photo: false, columns: 1, image: 'https://cdn.enhancv.com/predefined-examples/cxotH2tM2lN5EKUSZoY5BfYSxI9mXxLVuEAnOxrT/image.png' },
  { name: 'Single Column with Photo', type: 'Single Column', photo: true, columns: 1, image: 'https://cdn.enhancv.com/predefined-examples/OnhSWtMjE2Ffmlasn6oEP0EUwuukcoiSHLeFr99u/image.png' },
  { name: 'Elegant with Logos', type: 'Elegant', photo: false, columns: 2, image: 'https://cdn.enhancv.com/predefined-examples/OAzc0iErUrE15KIDDzBT6uKHhyFAfo4VqswiStz8/image.png' },
  { name: 'Double Column with Logos', type: 'Double Column', photo: false, columns: 2, image: 'https://cdn.enhancv.com/predefined-examples/CWi8PZrqInXDHb26Oo5woYkXnnE8j14hpNvgexXP/image.png' },
  { name: 'Compact', type: 'Compact', photo: false, columns: 1, image: 'https://cdn.enhancv.com/predefined-examples/mEU1WmZEr57eiim8T707QKKQkcOXg4rURyfODtdO/image.png' },
  { name: 'Timeline with Logos', type: 'Timeline', photo: false, columns: 1, image: 'https://cdn.enhancv.com/predefined-examples/mU4vge6XWKQZy34cAXf9bbWkKjnTrgdHQJ4hrs27/image.png' },
  { name: 'Classic', type: 'Classic', photo: false, columns: 1, image: 'https://cdn.enhancv.com/predefined-examples/JIbopkpJKmpa9N0k94MzFF0d96L0XmK4qedyYauU/image.png' },
  { name: 'High Performer', type: 'High Performer', photo: false, columns: 2, image: 'https://cdn.enhancv.com/predefined-examples/IPk4nUJMnlCZsHIXR7gFfkvWxHjGf82MIlza8VN5/image.png' },
  { name: 'Minimal', type: 'Minimal', photo: false, columns: 1, image: 'https://cdn.enhancv.com/predefined-examples/PWb6uJPH619lyPpoEV8XkV21I7btpgRq9Lj1WxGz/image.png' }
];

export default function ResumeTemplatesPage() {
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();

  useEffect(() => {
    document.title = "20+ Professional Resume Templates for 2026 | MyCareerCV";
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = "Choose from 21 professional, ATS-friendly resume templates. Whether you need a single column, double column, or photo template, MyCareerCV has the perfect design for your next job.";
  }, []);

  const handleTemplateClick = (template) => {
    if (user) {
      navigate('/dashboard');
    } else {
      openAuthModal();
    }
  };

  return (
    <div className="min-h-screen bg-[#101014] text-white flex flex-col font-sans">
      <Navbar />
      {/* Main Content Area */}
      <main className="flex-1 pt-32 pb-24 px-6 max-w-[1400px] mx-auto w-full">
        
        {/* SEO Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6">
            Professional Resume <span className="text-brand-orange">Templates</span>
          </h1>
          <p className="text-lg md:text-xl text-white/60 max-w-3xl mx-auto leading-relaxed">
            Stand out to recruiters and pass ATS software effortlessly. Choose from our collection of 21 stunning, professionally designed resume templates tailored for every career stage.
          </p>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 xl:gap-12">
          {templates.map((template, idx) => (
            <div 
              key={idx} 
              className="group relative bg-[#1A1A20] rounded-2xl overflow-hidden border border-white/5 hover:border-brand-orange/50 transition-all duration-300 shadow-2xl hover:shadow-brand-orange/20 flex flex-col cursor-pointer"
              onClick={() => handleTemplateClick(template)}
            >
              <div className="relative aspect-[1/1.4] w-full overflow-hidden bg-white/5">
                <img 
                  src={template.image} 
                  alt={`${template.name} Resume Template`}
                  className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
                  <span className="px-6 py-3 bg-brand-orange text-white font-bold rounded-full transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                    Use This Template
                  </span>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-brand-orange transition-colors">
                  {template.name}
                </h3>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold bg-white/10 text-white/70 rounded border border-white/5">
                    {template.type}
                  </span>
                  <span className="px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold bg-white/10 text-white/70 rounded border border-white/5">
                    {template.columns === 1 ? '1 Column' : '2 Columns'}
                  </span>
                  {template.photo && (
                    <span className="px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold bg-brand-orange/20 text-brand-orange rounded border border-brand-orange/20">
                      With Photo
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* SEO Content Section */}
        <div className="mt-32 max-w-4xl mx-auto prose prose-invert prose-orange">
          <h2 className="text-3xl font-bold text-center mb-8">How to Choose the Right Resume Template?</h2>
          
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-xl font-semibold mb-3">1-Column vs 2-Column Designs</h3>
              <p className="text-white/60 text-sm leading-relaxed mb-6">
                <strong>Single-column templates</strong> (like the Ivy League or Classic) are the most traditional and are incredibly ATS-friendly. They naturally flow from top to bottom, making them ideal for professionals with extensive experience.
                <br /><br />
                <strong>Two-column templates</strong> (like our Creative or Elegant templates) help save space and allow recruiters to scan your skills and summary quickly on the side while reading your experience in the main column.
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-3">ATS Compatibility is Key</h3>
              <p className="text-white/60 text-sm leading-relaxed mb-6">
                Applicant Tracking Systems (ATS) scan your resume before a human ever sees it. All MyCareerCV templates are engineered to be 100% ATS-friendly. We ensure that columns, icons, and photos don't break the text extraction process, guaranteeing your data is parsed correctly.
              </p>
            </div>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
