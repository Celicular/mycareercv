import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Plus, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/dashboard/Sidebar';
import axiosClient from '../api/axiosClient';

function TemplateCard({ tmpl, onClick, onDelete }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, boxShadow: '0 12px 36px rgba(0,0,0,0.08)' }}
      onClick={onClick}
      className="bg-white rounded-2xl border border-brand-dark/5 p-5 cursor-pointer transition-shadow flex flex-col gap-3 group relative"
    >
      <div className="w-full h-32 rounded-xl bg-brand-offwhite border border-brand-dark/5 overflow-hidden flex items-center justify-center shrink-0">
        {tmpl.thumbnail_b64 ? (
          <img src={tmpl.thumbnail_b64} alt={tmpl.name} className="w-full h-full object-cover" />
        ) : (
          <FileText size={32} className="text-brand-dark/20" />
        )}
      </div>
      <div className="flex-1 min-w-0 mt-2">
        <h3 className="font-bold text-brand-dark text-base truncate">{tmpl.name || 'Untitled Template'}</h3>
        <p className="text-xs text-brand-dark/40 mt-1 flex items-center gap-2">
          {new Date(tmpl.created_at).toLocaleDateString()}
          {tmpl.is_public && (
            <span className="px-2 py-0.5 bg-brand-orange/10 text-brand-orange rounded-full text-[10px] font-bold uppercase tracking-wider">
              Public
            </span>
          )}
        </p>
      </div>

      <button
        onClick={(e) => onDelete(tmpl.id, e)}
        className="absolute top-4 right-4 p-2 rounded-xl bg-white shadow-sm border border-brand-dark/5 text-brand-dark/40 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all z-10"
      >
        <Trash2 size={16} />
      </button>
    </motion.div>
  );
}

const AdminTemplates = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const fetchTemplates = async () => {
    try {
      const res = await axiosClient.get('/templates/');
      setTemplates(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleNewTemplate = () => {
    navigate('/template-editor');
  };

  const handleEditTemplate = (id) => {
    navigate(`/template-editor/${id}`);
  };

  const handleDeleteTemplate = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await axiosClient.delete(`/templates/${id}`);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete template.');
    }
  };

  return (
    <div className="flex h-screen bg-brand-offwhite overflow-hidden font-body selection:bg-brand-orange selection:text-white">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 lg:px-16 scroll-smooth">
          <div className="max-w-6xl mx-auto flex flex-col min-h-full">
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl md:text-4xl font-heading uppercase tracking-tighter text-brand-dark mb-1">
                  Manage Templates
                </h1>
                <p className="text-sm font-medium text-brand-dark/50">
                  Admin panel to create and edit global templates.
                </p>
              </div>
              <button
                onClick={handleNewTemplate}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-dark text-white rounded-xl text-sm font-bold hover:-translate-y-0.5 transition-all shadow-md shrink-0"
              >
                <Plus size={16} /> New Template
              </button>
            </div>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 size={32} className="animate-spin text-brand-orange mb-4" />
                <p className="text-sm font-semibold text-brand-dark/40">Loading templates...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-brand-dark/10 rounded-3xl bg-white">
                <div className="w-16 h-16 bg-brand-offwhite rounded-2xl flex items-center justify-center mb-4">
                  <FileText size={24} className="text-brand-dark/30" />
                </div>
                <h3 className="text-lg font-bold text-brand-dark mb-1">No Templates Found</h3>
                <p className="text-sm text-brand-dark/50 max-w-sm text-center mb-6">
                  You haven't created any templates yet. Click the button above to create one.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                {templates.map((tmpl) => (
                  <TemplateCard
                    key={tmpl.id}
                    tmpl={tmpl}
                    onClick={() => handleEditTemplate(tmpl.id)}
                    onDelete={handleDeleteTemplate}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminTemplates;
