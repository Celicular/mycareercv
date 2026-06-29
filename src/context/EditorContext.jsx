import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import { bindDataToCanvas } from '../utils/bindDataToCanvas';

const EditorContext = createContext(null);

const MAX_HISTORY = 50;
const EMPTY_PAGE  = () => JSON.stringify({ version: '5.3.0', objects: [], background: '#ffffff' });

export function EditorProvider({ children }) {
  const canvasRef    = useRef(null);   // active Fabric.Canvas instance (single DOM canvas, content swapped per page)
  const clipboardRef = useRef(null);   // copy/paste clipboard

  const [selectedObj,   setSelectedObj]   = useState(null);
  const [zoom,          setZoom]          = useState(1.5);
  const [templateMeta,  setTemplateMeta]  = useState({ id: null, name: 'Untitled Template', description: '' });
  const [isDirty,       setIsDirty]       = useState(false);
  const [isSaving,      setIsSaving]      = useState(false);
  const [ingestionReview, setIngestionReview] = useState(null);  // { confidences: {}, flaggedIds: [] } or null
  const [historyVersion,  setHistoryVersion]  = useState(0);
  const [hoveredSectionId, setHoveredSectionId] = useState(null);
  const [activeSectionPopup, setActiveSectionPopup] = useState(null); // { sectionId, x, y }
  const [resumeData, setResumeData] = useState(null); // live resume JSON for AI features

  // ── Multi-page ──────────────────────────────────────────────────────────────
  // pagesJsonRef stores serialised fabric JSON strings for ALL pages.
  // The ACTIVE page's slot is updated just before any op that needs it
  // (save, switch, history push) — keeping reads cheap.
  const pagesJsonRef      = useRef([null]);        // null = blank page (not yet serialised)
  const pageThumbnailsRef = useRef(['']);           // data-URL thumbnails, updated on page-switch
  const activeIdxRef      = useRef(0);             // sync ref, readable inside callbacks

  const [activePageIdx,  setActivePageIdx]  = useState(0);
  const [pageCount,      setPageCount]      = useState(1);
  const [pageThumbnails, setPageThumbnails] = useState(['']);

  // ── Internal helpers ────────────────────────────────────────────────────────
  /** Serialize the live canvas + capture thumbnail for the given page index. */
  /** Serialize canvas to JSON, skipping non-serializable overlay objects (e.g. highlight rects). */
  const _safeToJSON = (canvas) => {
    const overlays = canvas.getObjects().filter(o => o.excludeFromExport);
    overlays.forEach(o => canvas.remove(o));
    const json = JSON.stringify(canvas.toJSON(['customMeta']));
    // Restore overlays to the live canvas so they don't permanently disappear
    overlays.forEach(o => canvas.add(o));
    return json;
  };

  const _syncPage = useCallback((idx) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    pagesJsonRef.current[idx]      = _safeToJSON(canvas);
    pageThumbnailsRef.current[idx] = canvas.toDataURL({ format: 'png', multiplier: 0.15 });
  }, []);

  /** Load a serialised page JSON string (or null = blank) into the canvas. */
  const _loadPage = useCallback((jsonStr) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (jsonStr) {
      canvas.loadFromJSON(JSON.parse(jsonStr), () => canvas.renderAll());
    } else {
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      canvas.requestRenderAll();
    }
  }, []);

  // ── Undo / Redo ─────────────────────────────────────────────────────────────
  // Each history entry: JSON.stringify({ pages: string[], activeIdx: number })
  const historyRef    = useRef([]);
  const historyIdxRef = useRef(-1);
  const isRestoringHistoryRef = useRef(false);

  const pushHistory = useCallback(() => {
    if (isRestoringHistoryRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Truncate future if we are not at the end of the stack
    if (historyIdxRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1);
    }

    // Capture state — strip UI-only overlay objects before serializing
    const allPages = [...pagesJsonRef.current];
    allPages[activeIdxRef.current] = _safeToJSON(canvas);
    const state = JSON.stringify({
      pages: allPages,
      activeIdx: activeIdxRef.current,
    });

    historyRef.current.push(state);
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    } else {
      historyIdxRef.current++;
    }

    setIsDirty(true);
    setHistoryVersion(v => v + 1);
  }, []);

  const _restoreSnapshot = useCallback((rawSnap) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let snap;
    try { snap = JSON.parse(rawSnap); } catch { return; }

    isRestoringHistoryRef.current = true;
    if (snap.pages) {
      // Multi-page snapshot
      pagesJsonRef.current = snap.pages;
      const idx = snap.activeIdx ?? 0;
      activeIdxRef.current = idx;
      setActivePageIdx(idx);
      setPageCount(snap.pages.length);
      setPageThumbnails(new Array(snap.pages.length).fill(''));
      
      if (snap.pages[idx]) {
        canvas.loadFromJSON(JSON.parse(snap.pages[idx]), () => {
          canvas.renderAll();
          isRestoringHistoryRef.current = false;
        });
      } else {
        canvas.clear();
        canvas.backgroundColor = '#ffffff';
        canvas.requestRenderAll();
        isRestoringHistoryRef.current = false;
      }
    } else {
      // Legacy single-page snapshot
      canvas.loadFromJSON(snap, () => {
        canvas.renderAll();
        isRestoringHistoryRef.current = false;
      });
    }
    setSelectedObj(null);
    setHistoryVersion(v => v + 1);
  }, []);

  const undo = useCallback(() => {
    if (historyIdxRef.current > 0) {
      historyIdxRef.current--;
      _restoreSnapshot(historyRef.current[historyIdxRef.current]);
      setHistoryVersion(v => v + 1);
    }
  }, [_restoreSnapshot]);

  const redo = useCallback(() => {
    if (historyIdxRef.current < historyRef.current.length - 1) {
      historyIdxRef.current++;
      _restoreSnapshot(historyRef.current[historyIdxRef.current]);
      setHistoryVersion(v => v + 1);
    }
  }, [_restoreSnapshot]);

  const canUndo = historyIdxRef.current > 0;
  const canRedo = historyIdxRef.current < historyRef.current.length - 1;

  // ── Page management ─────────────────────────────────────────────────────────
  const switchPage = useCallback((newIdx) => {
    if (newIdx === activeIdxRef.current) return;

    // Save & thumbnail the outgoing page
    _syncPage(activeIdxRef.current);

    // Switch
    activeIdxRef.current = newIdx;
    setActivePageIdx(newIdx);
    _loadPage(pagesJsonRef.current[newIdx]);
    setSelectedObj(null);

    // Reflect updated thumbnails in the strip
    setPageThumbnails([...pageThumbnailsRef.current]);
    pushHistory();
  }, [_syncPage, _loadPage, pushHistory]);

  const addPage = useCallback(() => {
    _syncPage(activeIdxRef.current);      // save current page

    const newIdx = pagesJsonRef.current.length;
    pagesJsonRef.current.push(null);      // blank page slot
    pageThumbnailsRef.current.push('');

    activeIdxRef.current = newIdx;
    setActivePageIdx(newIdx);
    setPageCount(pagesJsonRef.current.length);
    setPageThumbnails([...pageThumbnailsRef.current]);

    _loadPage(null);                      // blank canvas
    setSelectedObj(null);
    pushHistory();
  }, [_syncPage, _loadPage, pushHistory]);

  const deletePage = useCallback((idx) => {
    if (pagesJsonRef.current.length <= 1) return; // guard: must have at least 1 page

    _syncPage(activeIdxRef.current);
    pagesJsonRef.current.splice(idx, 1);
    pageThumbnailsRef.current.splice(idx, 1);

    const newIdx = Math.min(idx, pagesJsonRef.current.length - 1);
    activeIdxRef.current = newIdx;
    setActivePageIdx(newIdx);
    setPageCount(pagesJsonRef.current.length);
    setPageThumbnails([...pageThumbnailsRef.current]);

    _loadPage(pagesJsonRef.current[newIdx]);
    setSelectedObj(null);
    pushHistory();
  }, [_syncPage, _loadPage, pushHistory]);

  // ── TopBar helpers (save / load) ────────────────────────────────────────────
  /**
   * Returns a string[] of serialised JSON for all pages.
   * The active page is always synced from the live canvas first.
   * Null slots (blank pages) are replaced with an empty-canvas JSON string.
   */
  const getAllPagesJson = useCallback(() => {
    const canvas = canvasRef.current;
    const all    = [...pagesJsonRef.current];
    if (canvas) all[activeIdxRef.current] = JSON.stringify(canvas.toJSON(['customMeta']));
    return all.map(p => p || EMPTY_PAGE());
  }, []);

  /**
   * Initialises the editor from an array of serialised page JSON strings.
   * Called by TopBar after loading a template.
   */
  const loadAllPages = useCallback((pages) => {
    isRestoringHistoryRef.current = true;
    pagesJsonRef.current      = [...pages];
    pageThumbnailsRef.current = new Array(pages.length).fill('');
    activeIdxRef.current      = 0;
    setActivePageIdx(0);
    setPageCount(pages.length);
    setPageThumbnails(new Array(pages.length).fill(''));
    
    // Clear history on load
    historyRef.current = [];
    historyIdxRef.current = -1;
    
    const canvas = canvasRef.current;
    if (canvas && pages[0]) {
      canvas.loadFromJSON(JSON.parse(pages[0]), () => {
        canvas.renderAll();
        isRestoringHistoryRef.current = false;
        // Seed initial history state
        pushHistory();
      });
    } else if (canvas) {
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      canvas.requestRenderAll();
      isRestoringHistoryRef.current = false;
      pushHistory();
    }
    setSelectedObj(null);
  }, [pushHistory]);

  // ── AI: rebind canvas after data change ───────────────────────────────────
  const rebindCanvas = useCallback((newData) => {
    setResumeData(newData);
    const canvas = canvasRef.current;
    if (canvas && newData) {
      bindDataToCanvas(canvas, newData);
      canvas.requestRenderAll();
      pushHistory();
    }
  }, [pushHistory]);

  return (
    <EditorContext.Provider value={{
      canvasRef, clipboardRef,
      selectedObj, setSelectedObj,
      zoom, setZoom,
      templateMeta, setTemplateMeta,
      isDirty, setIsDirty,
      isSaving, setIsSaving,
      ingestionReview, setIngestionReview,
      historyVersion,
      hoveredSectionId, setHoveredSectionId,
      activeSectionPopup, setActiveSectionPopup,
      pushHistory, undo, redo, canUndo, canRedo,
      // Multi-page
      activePageIdx, pageCount, pageThumbnails,
      switchPage, addPage, deletePage,
      getAllPagesJson, loadAllPages,
      // AI features
      resumeData, setResumeData, rebindCanvas,
    }}>
      {children}
    </EditorContext.Provider>
  );
}

export const useEditor = () => {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used inside <EditorProvider>');
  return ctx;
};
