import React, { useEffect, useCallback, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { EditorProvider, useEditor } from '../context/EditorContext';
import axiosClient from '../api/axiosClient';
import axios from 'axios';
import { bindDataToCanvas, extractOverflowObjects } from '../utils/bindDataToCanvas';
import TopBar from '../components/templateeditor/TopBar';
import Toolbox from '../components/templateeditor/Toolbox';
import TemplateCanvas from '../components/templateeditor/TemplateCanvas';
import PropertiesPanel from '../components/templateeditor/PropertiesPanel';
import PageStrip from '../components/templateeditor/PageStrip';
import IngestionReviewPanel from '../components/templateeditor/IngestionReviewPanel';
import { useAuth } from '../context/AuthContext';
import SectionPanel from '../components/templateeditor/SectionPanel';
import SectionPopup from '../components/templateeditor/SectionPopup';
import AIAssistantPanel from '../components/templateeditor/AIAssistantPanel';
import { Layers, MonitorPlay, Sparkles } from 'lucide-react';

// Inner component — has access to EditorContext
function EditorShell() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const { undo, redo, canvasRef, loadAllPages, setTemplateMeta, addPage, pushHistory, setResumeData } = useEditor();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const resumeId = searchParams.get('resume_id');
  const [isInitializing, setIsInitializing] = useState(false);
  const [showSectionPanel, setShowSectionPanel] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Load template and bind resume data on mount
  useEffect(() => {
    if (!id) return;
    let mounted = true;
    const init = async () => {
      setIsInitializing(true);
      try {
        const baseUrl = axiosClient.defaults.baseURL.replace(/\/api$/, '');
        let loadedCanvasData = false;

        // 1. If we have a resume_id, see if there's saved canvas progress
        if (resumeId) {
          try {
            const resumeRes = await axiosClient.get(`/resume/${resumeId}`);
            if (resumeRes.data && resumeRes.data.canvas_json_url) {
              const canvasRes = await axios.get(baseUrl + resumeRes.data.canvas_json_url);
              let parsedCanvas = canvasRes.data;
              if (typeof parsedCanvas === 'string') {
                try { parsedCanvas = JSON.parse(parsedCanvas); } catch { }
              }
              
              if (Array.isArray(parsedCanvas)) {
                loadAllPages(parsedCanvas);
              } else if (parsedCanvas && parsedCanvas.pages) {
                loadAllPages(parsedCanvas.pages);
              } else {
                loadAllPages([JSON.stringify(parsedCanvas)]);
              }
              setTemplateMeta({ id: id, name: "Resumed Session", description: "" });
              pushHistory();
              loadedCanvasData = true;
            }
          } catch (err) {
            console.error("No saved canvas progress found or failed to load.", err);
          }
        }

        // If we successfully restored progress, we skip the base template loading
        // BUT we still need to load the resume JSON for AI features
        if (loadedCanvasData) {
           if (resumeId) {
             try {
               const resumeMeta2 = await axiosClient.get(`/resume/${resumeId}`);
               if (resumeMeta2.data?.json_url) {
                 const jsonRes2 = await axios.get(baseUrl + resumeMeta2.data.json_url);
                 setResumeData(jsonRes2.data);
               }
             } catch (err) {
               console.error('Failed to load resume JSON for AI features:', err);
             }
           }
           if (mounted) setIsInitializing(false);
           return;
        }

        // 2. Fallback: Load base template and execute bindDataToCanvas
        const res = await axiosClient.get(`/templates/${id}`);
        if (!mounted) return;
        
        let parsed;
        try { parsed = JSON.parse(res.data.fabric_json); } catch { parsed = null; }

        if (parsed && parsed.version === 1 && Array.isArray(parsed.pages)) {
          loadAllPages(parsed.pages);
        } else {
          loadAllPages([res.data.fabric_json]);
        }
        setTemplateMeta({ id: res.data.id, name: res.data.name, description: res.data.description || '' });

        if (resumeId) {
          setTimeout(async () => {
             try {
                const resumesRes = await axiosClient.get(`/resume/${resumeId}`);
                const resumeMeta = resumesRes.data;
                if (resumeMeta && resumeMeta.json_url) {
                   const jsonRes = await axios.get(baseUrl + resumeMeta.json_url);
                   const json = jsonRes.data;
                   setResumeData(json); // store for AI features
                   const canvas = canvasRef.current;
                   if (canvas) {
                      const count = bindDataToCanvas(canvas, json);
                      const overflow = extractOverflowObjects(canvas);
                      if (overflow.length > 0) {
                        overflow.forEach(({ obj }) => canvas.remove(obj));
                        canvas.requestRenderAll();
                        addPage();
                        setTimeout(() => {
                          const c2 = canvasRef.current;
                          overflow.forEach(({ obj, newTop }) => {
                            obj.set({ top: newTop });
                            c2.add(obj);
                          });
                          c2.requestRenderAll();
                          pushHistory();
                        }, 50);
                      } else {
                        pushHistory();
                      }
                   }
                }
             } catch (err) {
                console.error("Failed to load resume for binding", err);
             }
          }, 100);
        } else {
          pushHistory();
        }
      } catch (err) {
        console.error('Failed to load template or resume:', err);
      } finally {
        if (mounted) setIsInitializing(false);
      }
    };
    init();
    return () => { mounted = false; };
  }, [id, resumeId, loadAllPages, setTemplateMeta, canvasRef, addPage, pushHistory]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      const isInput = ['INPUT','TEXTAREA','SELECT'].includes(tag);
      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  if (isMobile) {
    return (
      <div className="h-screen w-screen bg-[#131316] flex items-center justify-center p-6 text-center font-body">
        <div className="bg-[#1C1C21] border border-brand-orange/20 rounded-2xl p-8 max-w-md w-full flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-brand-orange/10 flex items-center justify-center text-brand-orange mb-6">
            <MonitorPlay size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Desktop Required</h2>
          <p className="text-white/50 mb-8 text-sm leading-relaxed">
            The Resume Editor is a powerful design tool that requires a larger screen. Please open this page on a laptop or desktop computer for the best experience.
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full py-3 rounded-xl bg-brand-orange hover:bg-[#E65100] text-white font-bold transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#111114] overflow-hidden font-body select-none">
      {/* Top bar */}
      <TopBar />

      {/* Editor workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left — toolbox */}
        <Toolbox />

        {/* Section Panel for non-admins */}
        {/* Left — Layout or AI Panel (AI only for user) */}
        {showSectionPanel ? (
          <SectionPanel onClose={() => setShowSectionPanel(false)} />
        ) : showAIPanel && !isAdmin ? (
          <AIAssistantPanel onClose={() => setShowAIPanel(false)} />
        ) : (
          !isAdmin && (
            <div className="w-12 shrink-0 h-full bg-[#16161a] border-r border-white/5 flex flex-col items-center py-4 gap-3">
              <button
                onClick={() => { setShowSectionPanel(true); setShowAIPanel(false); }}
                className="p-2 text-white/40 hover:text-white bg-[#2A2A30] hover:bg-brand-orange/20 rounded-lg transition-colors"
                title="Layout"
              >
                <Layers size={16} />
              </button>
              {/* AI Assistant Panel Hidden for now 
              <button
                onClick={() => { setShowAIPanel(true); setShowSectionPanel(false); }}
                className="p-2 text-white/40 hover:text-white bg-[#2A2A30] hover:bg-brand-orange/20 rounded-lg transition-colors relative"
                title="AI Assistant"
              >
                <Sparkles size={16} />
                <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand-orange" />
              </button>
              */}
            </div>
          )
        )}

        {/* Page strip — one card per page */}
        <PageStrip />

        {/* Center — canvas */}
        <div className="flex-1 overflow-hidden relative">
          <TemplateCanvas />
          <SectionPopup />
        </div>

        {/* Right — properties panel */}
        <PropertiesPanel />

        {/* Ingestion review overlay (renders conditionally) */}
        <IngestionReviewPanel />
      </div>
    </div>
  );
}

// Outer wrapper — provides context. Rendered OUTSIDE <SmoothScroll> in App.jsx.
export default function TemplateEditorPage() {
  return (
    <EditorProvider>
      <EditorShell />
    </EditorProvider>
  );
}
