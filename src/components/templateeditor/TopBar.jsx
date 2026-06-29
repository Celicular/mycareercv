import React, { useState, useEffect, useRef } from 'react';
import { useEditor } from '../../context/EditorContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import {
  Save, FolderOpen, RotateCcw, RotateCw, ZoomIn, ZoomOut,
  FileText, Eye, Plus, Trash2, ChevronDown, Check, Loader2, Magnet, Database, Upload, ArrowLeft, Download
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { setSnapEnabled, isSnapEnabled } from './snapHelpers';
import { analyzeCanvasBindings } from '../../schema/resumeSchema';
import { bindDataToCanvas, extractOverflowObjects } from '../../utils/bindDataToCanvas';
import IngestionModal from './IngestionModal';
import LayoutManagerModal from './LayoutManagerModal';
import { AlignLeft, Link as LinkIcon, Share2 } from 'lucide-react';
import PreviewModal from './PreviewModal';
import DownloadModal from './DownloadModal';
import ShareModal from './ShareModal';

// ── Zoom presets ──────────────────────────────────────────────────────────────
const ZOOM_PRESETS = [0.5, 0.75, 0.9, 1.0, 1.25, 1.5, 2.0];

export default function TopBar() {
  const {
    canvasRef, zoom, setZoom,
    templateMeta, setTemplateMeta,
    isDirty, setIsDirty,
    isSaving, setIsSaving,
    undo, redo, canUndo, canRedo,
    pushHistory,
    activePageIdx, getAllPagesJson, loadAllPages,
    addPage,
  } = useEditor();

  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const [showLoad, setShowLoad]     = useState(false);
  const [templates, setTemplates]   = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [saveOk, setSaveOk]         = useState(false);
  const [saveResumeOk, setSaveResumeOk] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState(null);
  const [snapOn, setSnapOn]         = useState(true);  // snap toggle UI state
  const [showIngest, setShowIngest] = useState(false);  // ingestion modal
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewImages, setPreviewImages] = useState([]);
  
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareToken, setShareToken] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);

  const [searchParams] = useSearchParams();
  const resumeId = searchParams.get('resume_id');

  // Auto-save logic for users
  const isDirtyRef = useRef(isDirty);
  useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);

  const saveActionRef = useRef();
  useEffect(() => { saveActionRef.current = handleSaveResumeCanvas; });

  useEffect(() => {
    if (isAdmin || !resumeId) return;
    const interval = setInterval(() => {
      if (isDirtyRef.current && saveActionRef.current) {
        saveActionRef.current();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isAdmin, resumeId]);

  const toggleSnap = () => {
    const next = !snapOn;
    setSnapOn(next);
    setSnapEnabled(next);
  };

  // On mount, if resumeId exists, fetch resume to check if it has a share_token
  useEffect(() => {
    if (resumeId) {
      axiosClient.get(`/resume/`).then(res => {
        const resume = res.data.find(r => r.id === parseInt(resumeId));
        if (resume && resume.share_token) {
          setShareToken(resume.share_token);
          setShareUrl(resume.canvas_json_url ? `/share/${resume.share_token}` : null); // Assuming backend returns it or we know the format
        }
      }).catch(err => console.error(err));
    }
  }, [resumeId]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsSaving(true);
    try {
      // Active page canvas JSON with templateMetadata for the backend renderer
      const activeCanvasJson = canvas.toJSON(['customMeta']);
      const analysis = analyzeCanvasBindings(canvas);
      if (analysis) {
        activeCanvasJson.templateMetadata = { instanceCounts: analysis.counts };
      }

      // Collect all pages — replace active page slot with the annotated JSON
      const allPages = getAllPagesJson();
      allPages[activePageIdx] = JSON.stringify(activeCanvasJson);

      // Multi-page envelope
      const fabric_json   = JSON.stringify({ version: 1, pages: allPages });
      const thumbnail_b64 = canvas.toDataURL({ format: 'png', multiplier: 0.3 });

      const payload = {
        name:        templateMeta.name || 'Untitled Template',
        description: templateMeta.description || '',
        fabric_json,
        thumbnail_b64,
        is_public:   templateMeta.is_public || false,
      };
      if (templateMeta.id) {
        const res = await axiosClient.put(`/templates/${templateMeta.id}`, payload);
        setTemplateMeta(m => ({ ...m, id: res.data.id }));
      } else {
        const res = await axiosClient.post('/templates/', payload);
        setTemplateMeta(m => ({ ...m, id: res.data.id }));
      }
      setIsDirty(false);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2000);
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Save Resume Canvas (User Mode) ─────────────────────────────────────────
  const handleSaveResumeCanvas = async () => {
    if (!resumeId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsSaving(true);
    try {
      const activeCanvasJson = canvas.toJSON(['customMeta']);
      const analysis = analyzeCanvasBindings(canvas);
      if (analysis) {
        activeCanvasJson.templateMetadata = { instanceCounts: analysis.counts };
      }

      const allPages = getAllPagesJson();
      allPages[activePageIdx] = JSON.stringify(activeCanvasJson);

      const fabric_json = JSON.stringify(allPages);

      await axiosClient.put(`/resume/${resumeId}/canvas`, {
        canvas_data: fabric_json
      });
      setIsDirty(false);
      setSaveResumeOk(true);
      setLastAutoSave(new Date());
      setTimeout(() => setSaveResumeOk(false), 2000);
    } catch (e) {
      console.error('Save resume canvas failed:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Load list ──────────────────────────────────────────────────────────────
  const openLoadPanel = async () => {
    setShowLoad(true);
    setLoadingList(true);
    try {
      const res = await axiosClient.get('/templates/');
      setTemplates(res.data);
    } catch { /* ignore */ }
    finally { setLoadingList(false); }
  };

  const loadTemplate = async (tmpl) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setShowLoad(false);
    try {
      const res = await axiosClient.get(`/templates/${tmpl.id}`);
      // Detect multi-page envelope vs legacy single-page string
      let parsed;
      try { parsed = JSON.parse(res.data.fabric_json); } catch { parsed = null; }

      if (parsed && parsed.version === 1 && Array.isArray(parsed.pages)) {
        loadAllPages(parsed.pages);              // multi-page template
      } else {
        loadAllPages([res.data.fabric_json]);    // legacy: wrap as single page
      }
      setTemplateMeta({ id: tmpl.id, name: tmpl.name, description: tmpl.description || '', is_public: tmpl.is_public || false });
      setIsDirty(false);
      pushHistory();
    } catch (e) { console.error('Load failed:', e); }
  };

  const deleteTemplate = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this template?')) return;
    await axiosClient.delete(`/templates/${id}`);
    setTemplates(t => t.filter(x => x.id !== id));
    if (templateMeta.id === id) setTemplateMeta({ id: null, name: 'Untitled Template', description: '' });
  };

  // ── New canvas ─────────────────────────────────────────────────────────────
  const handleNew = () => {
    if (isDirty && !confirm('Discard unsaved changes and start a new template?')) return;
    loadAllPages([null]);  // reset to single blank page, clears all other pages
    setTemplateMeta({ id: null, name: 'Untitled Template', description: '', is_public: false });
    setIsDirty(false);
    pushHistory();
  };

  // ── Preview ────────────────────────────────────────────────────────────────
  const handlePreview = async () => {
    setIsExporting(true);
    try {
      const pages = getAllPagesJson();
      const canvas = canvasRef.current;
      const originalActiveIdx = activePageIdx;
      const images = [];

      for (let i = 0; i < pages.length; i++) {
        await new Promise(resolve => {
          canvas.loadFromJSON(JSON.parse(pages[i]), () => {
            canvas.renderAll();
            resolve();
          });
        });
        const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 2 });
        images.push(dataUrl);
      }

      await new Promise(resolve => {
        canvas.loadFromJSON(JSON.parse(pages[originalActiveIdx]), () => {
          canvas.renderAll();
          resolve();
        });
      });
      
      setPreviewImages(images);
      setShowPreviewModal(true);
    } catch (err) {
      console.error(err);
      alert('Failed to generate preview.');
    } finally {
      setIsExporting(false);
    }
  };

  // ── PDF Export / Publish Helper ────────────────────────────────────────────
  const generatePDFBlob = async () => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [794, 1123] // A4
    });

    const pages = getAllPagesJson();
    const canvas = canvasRef.current;
    const originalActiveIdx = activePageIdx;
    
    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage();
      
      await new Promise(resolve => {
        canvas.loadFromJSON(JSON.parse(pages[i]), () => {
          canvas.renderAll();
          resolve();
        });
      });
      
      const dataUrl = canvas.toDataURL({ format: 'jpeg', quality: 0.9, multiplier: 2 });
      pdf.addImage(dataUrl, 'JPEG', 0, 0, 794, 1123, undefined, 'FAST');
      
      if (i === pages.length - 1) {
        // Add hidden verification flag for ATS checker
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(2);
        pdf.text('MYCAREERCV_VERIFIED_TEMPLATE', 5, 1120);
      }
    }
    
    await new Promise(resolve => {
      canvas.loadFromJSON(JSON.parse(pages[originalActiveIdx]), () => {
        canvas.renderAll();
        resolve();
      });
    });
    
    return pdf.output('blob');
  };

  const handleSavePDF = async () => {
    setIsExporting(true);
    try {
      const blob = await generatePDFBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${templateMeta.name || 'Resume'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF Export failed:', err);
      alert('Failed to export PDF.');
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleDownloadImages = async () => {
    setIsExporting(true);
    try {
      const pages = getAllPagesJson();
      const canvas = canvasRef.current;
      const originalActiveIdx = activePageIdx;

      for (let i = 0; i < pages.length; i++) {
        await new Promise(resolve => {
          canvas.loadFromJSON(JSON.parse(pages[i]), () => {
            canvas.renderAll();
            resolve();
          });
        });
        const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 2 });
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${templateMeta.name || 'Resume'}_Page_${i + 1}.png`;
        a.click();
      }

      await new Promise(resolve => {
        canvas.loadFromJSON(JSON.parse(pages[originalActiveIdx]), () => {
          canvas.renderAll();
          resolve();
        });
      });
    } catch (err) {
      console.error('Image Export failed:', err);
      alert('Failed to export Images.');
    } finally {
      setIsExporting(false);
    }
  };
  
  const handlePublish = async () => {
    if (!resumeId) return;
    setIsPublishing(true);
    try {
      // First save the resume canvas to ensure backend has latest JSON just in case
      await handleSaveResumeCanvas();
      
      const blob = await generatePDFBlob();
      const formData = new FormData();
      formData.append('file', blob, 'resume.pdf');
      
      const res = await axiosClient.post(`/resume/${resumeId}/publish`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setShareToken(res.data.share_token);
      setShareUrl(`/share/${res.data.share_token}`);
      setShowShareModal(true);
    } catch (err) {
      console.error('Publish failed:', err);
      alert('Failed to publish resume.');
    } finally {
      setIsPublishing(false);
    }
  };

  // ── Test Data ──────────────────────────────────────────────────────────────
  const handleTestUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json   = JSON.parse(ev.target.result);
        const canvas = canvasRef.current;

        // ── 1. Inject data & reflow ──────────────────────────────────────────
        const count = bindDataToCanvas(canvas, json);

        // ── 2. Detect overflow (elements pushed past the A4 bottom edge) ─────
        const overflow = extractOverflowObjects(canvas);

        if (overflow.length > 0) {
          // ── 3. Remove overflow objects from page 1 ─────────────────────────
          overflow.forEach(({ obj }) => canvas.remove(obj));
          canvas.requestRenderAll();

          // ── 4. Create page 2 ───────────────────────────────────────────────
          // addPage() internally saves page 1 (now clean) then clears canvas
          addPage();

          // ── 5. Place overflow objects on the new blank page 2 ──────────────
          overflow.forEach(({ obj, newTop }) => {
            obj.set({ top: newTop });
            canvas.add(obj);
          });
          canvas.requestRenderAll();

          alert(
            `Filled ${count} elements with test data.\n` +
            `${overflow.length} element(s) overflowed and were moved to page 2.`
          );
        } else {
          alert(`Successfully filled ${count} bound elements with test data!`);
        }

        pushHistory();
      } catch (err) {
        alert('Invalid JSON file format.');
        console.error(err);
      }
      e.target.value = null; // Reset input so same file can be selected again
    };
    reader.readAsText(file);
  };

  return (
    <header className="flex items-center gap-3 px-4 py-2.5 bg-[#111114] border-b border-white/5 shrink-0 relative z-10">

      {/* Back to Dashboard */}
      <button onClick={() => navigate('/dashboard')} title="Back to Dashboard" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#2A2A30] hover:bg-[#34343A] text-white/80 hover:text-white border border-white/5 shadow-sm text-xs font-semibold transition-all mr-2">
        <ArrowLeft size={13} /> Dashboard
      </button>

      {/* Brand mark */}
      <div className="flex items-center gap-2 mr-1">
        <div className="w-6 h-6 rounded-lg bg-brand-orange flex items-center justify-center">
          <FileText size={13} className="text-white" />
        </div>
        <span className="text-xs font-bold text-white/60 hidden sm:block">MyCareerCV</span>
      </div>

      <div className="h-5 w-px bg-white/8" />

      {/* Action buttons (Admin Only) */}
      {isAdmin ? (
        <>
          <button onClick={handleNew} title="New template" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#2A2A30] hover:bg-[#34343A] text-white/80 hover:text-white border border-white/5 shadow-sm text-xs font-semibold transition-all">
            <Plus size={13} /> New
          </button>

          <button onClick={openLoadPanel} title="Load template" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#2A2A30] hover:bg-[#34343A] text-white/80 hover:text-white border border-white/5 shadow-sm text-xs font-semibold transition-all">
            <FolderOpen size={13} /> Load
          </button>

          <button onClick={() => setShowIngest(true)} title="Import from image/PDF" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/20 shadow-sm text-xs font-semibold transition-all">
            <Upload size={13} /> Import
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
              ${saveOk ? 'bg-emerald-500/20 text-emerald-400' : 'bg-brand-orange/90 hover:bg-brand-orange text-white shadow-md shadow-brand-orange/20'}
              disabled:opacity-60`}
          >
            {isSaving ? <Loader2 size={13} className="animate-spin" /> : saveOk ? <Check size={13} /> : <Save size={13} />}
            {isSaving ? 'Saving…' : saveOk ? 'Saved!' : 'Save Template'}
            {isDirty && !isSaving && !saveOk && <span className="w-1.5 h-1.5 rounded-full bg-white/70 ml-0.5" />}
          </button>

          <div className="h-5 w-px bg-white/8" />
        </>
      ) : (
        <>
          {resumeId && (
            <button
              onClick={handleSaveResumeCanvas}
              disabled={isSaving}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                ${saveResumeOk ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#2A2A30] hover:bg-[#34343A] text-white/80 hover:text-white border border-white/5'}
                disabled:opacity-60 shadow-sm`}
            >
              {isSaving ? <Loader2 size={13} className="animate-spin" /> : saveResumeOk ? <Check size={13} /> : <Save size={13} />}
              {isSaving ? 'Saving…' : saveResumeOk ? 'Saved!' : 'Save Progress'}
              {isDirty && !isSaving && !saveResumeOk && <span className="w-1.5 h-1.5 rounded-full bg-brand-orange ml-0.5" />}
            </button>
          )}
          {lastAutoSave && !isDirty && !isSaving && (
             <span className="text-[10px] text-white/30 hidden md:block">Saved at {lastAutoSave.toLocaleTimeString()}</span>
          )}
          <div className="h-5 w-px bg-white/8" />
        </>
      )}

      {/* Undo / Redo */}
      <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="p-1.5 rounded-lg bg-[#2A2A30] hover:bg-[#34343A] text-white/80 hover:text-white border border-white/5 shadow-sm disabled:opacity-25 transition-all">
        <RotateCcw size={14} />
      </button>
      <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)" className="p-1.5 rounded-lg bg-[#2A2A30] hover:bg-[#34343A] text-white/80 hover:text-white border border-white/5 shadow-sm disabled:opacity-25 transition-all">
        <RotateCw size={14} />
      </button>

      <div className="h-5 w-px bg-white/8" />

      {/* Snap toggle */}
      <button
        onClick={toggleSnap}
        title={snapOn ? 'Snapping ON — click to disable' : 'Snapping OFF — click to enable'}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all
          ${snapOn
            ? 'bg-brand-orange/15 text-brand-orange border border-brand-orange/30'
            : 'text-white/30 hover:text-white hover:bg-white/6 border border-transparent'
          }`}
      >
        <Magnet size={13} />
        <span className="hidden sm:block">Snap</span>
      </button>

      <div className="h-5 w-px bg-white/8" />

      {/* Template name */}
      <input
        value={templateMeta.name || ''}
        onChange={e => { setTemplateMeta(m => ({ ...m, name: e.target.value })); setIsDirty(true); }}
        disabled={!isAdmin}
        className={`bg-transparent border-none outline-none text-sm font-semibold text-white/70 w-40 placeholder:text-white/25 rounded-lg px-2 py-1 transition-all ${isAdmin ? 'hover:text-white focus:text-white focus:bg-white/5' : ''}`}
        placeholder="Untitled Template"
      />

      {/* Public Toggle (Admin Only) */}
      {isAdmin && (
        <label className="flex items-center gap-2 text-xs font-semibold text-white/60 cursor-pointer hover:text-white transition-colors ml-2">
          <input
            type="checkbox"
            checked={templateMeta.is_public || false}
            onChange={(e) => { setTemplateMeta(m => ({ ...m, is_public: e.target.checked })); setIsDirty(true); }}
            className="w-3.5 h-3.5 rounded border-white/20 bg-white/10 text-brand-orange focus:ring-0 cursor-pointer"
          />
          Public
        </label>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Test Data Upload (Admin Only) */}
      {isAdmin && (
        <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 shadow-sm text-xs font-semibold transition-all cursor-pointer mr-2">
          <Database size={13} /> Test Data
          <input type="file" accept=".json" className="hidden" onChange={handleTestUpload} />
        </label>
      )}

      {/* Layout Manager */}
      <button onClick={() => setShowLayoutModal(true)} title="Rearrange Sections" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#2A2A30] hover:bg-[#34343A] text-white/80 hover:text-white border border-white/5 shadow-sm text-xs font-semibold transition-all mr-2">
        <AlignLeft size={13} /> Layout
      </button>

      {/* Preview */}
      <button onClick={handlePreview} disabled={isExporting} title="Preview Template" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#2A2A30] hover:bg-[#34343A] text-white/80 hover:text-white border border-white/5 shadow-sm text-xs font-semibold transition-all mr-2 disabled:opacity-60">
        {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />} Preview
      </button>

      {/* Publish / Link (User Mode) */}
      {!isAdmin && resumeId && (
        shareToken ? (
          <button onClick={() => setShowShareModal(true)} title="Share Link" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-md shadow-[#3B82F6]/20 text-xs font-bold transition-all mr-2">
            <LinkIcon size={13} /> Link
          </button>
        ) : (
          <button onClick={handlePublish} disabled={isPublishing || isExporting} title="Publish to Web" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-md shadow-[#3B82F6]/20 text-xs font-bold transition-all disabled:opacity-60 mr-2">
            {isPublishing ? <Loader2 size={13} className="animate-spin" /> : <Share2 size={13} />} Publish
          </button>
        )
      )}

      {/* Download Modal Trigger */}
      <button onClick={() => setShowDownloadModal(true)} disabled={isExporting} title="Download Resume" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00B67A] hover:bg-[#00B67A]/90 text-white shadow-md shadow-[#00B67A]/20 text-xs font-bold transition-all disabled:opacity-60">
        {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
        {isExporting ? 'Exporting...' : 'Download'}
      </button>

      <div className="h-5 w-px bg-white/8" />

      {/* Zoom controls */}
      <button onClick={() => setZoom(z => Math.max(0.25, +(z - 0.1).toFixed(2)))} title="Zoom Out" className="p-1.5 rounded-lg bg-[#2A2A30] hover:bg-[#34343A] text-white/80 hover:text-white border border-white/5 shadow-sm transition-all">
        <ZoomOut size={14} />
      </button>
      <span className="text-xs font-bold text-white/60 tabular-nums w-10 text-center select-none" title="Current Zoom Level">
        {Math.round(zoom * 100)}%
      </span>
      <button onClick={() => setZoom(z => Math.min(2.5, +(z + 0.1).toFixed(2)))} title="Zoom In" className="p-1.5 rounded-lg bg-[#2A2A30] hover:bg-[#34343A] text-white/80 hover:text-white border border-white/5 shadow-sm transition-all">
        <ZoomIn size={14} />
      </button>

      {/* ── Load dropdown ──────────────────────────────────────────────────── */}
      {showLoad && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowLoad(false)} />
          <div className="absolute top-full left-32 mt-2 z-50 w-72 bg-[#1a1a20] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <p className="text-xs font-bold text-white/70">Your Templates</p>
            </div>
            {loadingList ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-brand-orange" />
              </div>
            ) : templates.length === 0 ? (
              <p className="text-xs text-white/30 text-center py-8">No templates saved yet</p>
            ) : (
              <div className="max-h-72 overflow-y-auto">
                {templates.map(t => (
                  <div key={t.id}
                    onClick={() => loadTemplate(t)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer transition-all group"
                  >
                    {/* Thumbnail */}
                    <div className="w-10 h-14 rounded-lg bg-white/5 overflow-hidden shrink-0 border border-white/10">
                      {t.thumbnail_b64 ? (
                        <img src={t.thumbnail_b64} alt={t.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText size={14} className="text-white/20" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{t.name}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">{new Date(t.created_at).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={(e) => deleteTemplate(t.id, e)}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-white/25 hover:text-red-400 hover:bg-red-400/10 transition-all"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Ingestion Modal */}
      {showIngest && (
        <IngestionModal
          onClose={() => setShowIngest(false)}
          onPopulate={(data) => {
            setShowIngest(false);
            console.log('Ingested data:', data);
          }}
        />
      )}

      {/* Modals */}
      {showPreviewModal && <PreviewModal images={previewImages} onClose={() => setShowPreviewModal(false)} />}
      
      {showDownloadModal && (
        <DownloadModal 
          onClose={() => setShowDownloadModal(false)} 
          onDownloadPDF={handleSavePDF}
          onDownloadImage={handleDownloadImages}
        />
      )}

      {showShareModal && (
        <ShareModal
          onClose={() => setShowShareModal(false)}
          shareUrl={shareUrl}
          isPublishing={isPublishing}
          onRepublish={handlePublish}
        />
      )}

      {/* Layout Manager */}
      {showLayoutModal && <LayoutManagerModal onClose={() => setShowLayoutModal(false)} />}
    </header>
  );
}
