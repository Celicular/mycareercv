import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { Loader2, ShieldCheck, Download, AlertCircle } from 'lucide-react';

export default function SharedViewer() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSharedResume = async () => {
      try {
        const res = await axiosClient.get(`/resume/shared/${token}`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load resume');
      } finally {
        setLoading(false);
      }
    };
    fetchSharedResume();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#131316] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-white/50">
          <Loader2 size={32} className="animate-spin text-brand-orange" />
          <p className="text-sm tracking-widest uppercase font-bold">Loading Resume...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#131316] flex items-center justify-center p-6">
        <div className="bg-[#1C1C21] border border-red-500/20 rounded-2xl p-8 max-w-md w-full text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-6">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Resume Not Found</h2>
          <p className="text-white/50 mb-8">{error}</p>
          <Link to="/" className="w-full py-3 rounded-xl bg-brand-orange hover:bg-[#E65100] text-white font-bold transition-colors">
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // The backend might return a relative URL like /uploads/...
  const baseUrl = axiosClient.defaults.baseURL.replace(/\/api$/, '');
  const pdfUrl = data.shared_pdf_url.startsWith('http') ? data.shared_pdf_url : baseUrl + data.shared_pdf_url;

  return (
    <div className="h-screen w-full bg-[#131316] flex flex-col font-body">
      
      {/* Header */}
      <header className="h-16 shrink-0 bg-[#1A1A1F] border-b border-white/5 flex items-center justify-between px-6 z-10">
        
        <div className="flex items-center gap-4">
          <Link to="/" className="text-xl font-heading font-black text-white hover:opacity-80 transition-opacity">
            MY CAREER CV
          </Link>
          <div className="h-6 w-px bg-white/10 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck size={14} />
            Verified Profile
          </div>
        </div>

        <div className="flex items-center gap-4">
          <a
            href={pdfUrl}
            download={data.document_name + '.pdf'}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-colors border border-white/10"
          >
            <Download size={16} />
            Download
          </a>
          <Link
            to="/"
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-orange hover:bg-[#E65100] text-white text-sm font-bold transition-colors"
          >
            Build your own
          </Link>
        </div>
      </header>

      {/* Main PDF Viewer */}
      <main className="flex-1 w-full bg-[#1A1A1F] flex justify-center overflow-hidden">
        <embed
          src={pdfUrl + '#toolbar=0&navpanes=0'}
          type="application/pdf"
          className="w-full h-full max-w-5xl shadow-2xl"
        />
      </main>
    </div>
  );
}
