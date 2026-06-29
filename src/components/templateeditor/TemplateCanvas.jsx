import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import { useEditor } from '../../context/EditorContext';
import { useAuth } from '../../context/AuthContext';
import { initSnapping } from './snapHelpers';
import AIFloatingButton from './AIFloatingButton';

// A4 at 96dpi — standard PDF-unit canvas size
export const A4_W = 595;
export const A4_H = 842;

// Offset applied on each successive paste so duplicates don't stack perfectly
const PASTE_OFFSET = 10;

export default function TemplateCanvas() {
  const canvasElRef  = useRef(null);
  const pasteOffsetRef = useRef(0); // accumulates offset per paste cycle
  const highlightRectRef = useRef(null);

  const { canvasRef, clipboardRef, setSelectedObj, pushHistory, zoom, ingestionReview, hoveredSectionId, setHoveredSectionId, setActiveSectionPopup } = useEditor();
  const { isAdmin } = useAuth();

  // ── Init Fabric canvas ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: A4_W,
      height: A4_H,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: true,
      selectionColor: 'rgba(255,90,54,0.08)',
      selectionBorderColor: '#FF5A36',
      selectionLineWidth: 1.5,
    });

    // Custom control styles — orange handles
    fabric.Object.prototype.set({
      borderColor: '#FF5A36',
      cornerColor: '#FF5A36',
      cornerStyle: 'circle',
      cornerSize: 8,
      transparentCorners: false,
    });

    canvasRef.current = canvas;

    // ── Selection events ────────────────────────────────────────────────────
    const onSelect   = () => setSelectedObj(canvas.getActiveObject());
    const onDeselect = () => setSelectedObj(null);

    canvas.on('selection:created', onSelect);
    canvas.on('selection:updated', onSelect);
    canvas.on('selection:cleared', onDeselect);

    // ── History events ──────────────────────────────────────────────────────
    const pushOnMutation = (e) => {
      if (e?.target?.type === 'activeSelection') {
        const obj = e.target;
        // If it was scaled in any direction
        if (obj.scaleX !== 1 || obj.scaleY !== 1) {
          const children = obj.getObjects();
          canvas.discardActiveObject(); // applies group transform to children
          children.forEach(child => {
            if (['textbox', 'text', 'i-text', 'rect'].includes(child.type)) {
              child.set({ 
                width: child.width * child.scaleX, 
                height: child.height * child.scaleY,
                scaleX: 1, 
                scaleY: 1 
              });
            } else if (child.type === 'line') {
              if (Math.abs(child.y1 - child.y2) < 1) { // horizontal line
                child.set({ x2: child.x1 + (child.x2 - child.x1) * child.scaleX, scaleX: 1, scaleY: 1 });
              } else if (Math.abs(child.x1 - child.x2) < 1) { // vertical line
                child.set({ y2: child.y1 + (child.y2 - child.y1) * child.scaleY, scaleX: 1, scaleY: 1 });
              } else {
                child.set({ scaleX: 1, scaleY: 1 });
              }
            }
          });
          const sel = new fabric.ActiveSelection(children, { canvas });
          canvas.setActiveObject(sel);
          canvas.requestRenderAll();
        }
      }
      pushHistory();
    };
    canvas.on('object:modified', pushOnMutation);
    canvas.on('object:added',    (e) => { if (!e.target?.excludeFromExport) pushHistory(); });
    canvas.on('object:removed',  (e) => { if (!e.target?.excludeFromExport) pushHistory(); });

    // ── Smart Guides / Snapping ─────────────────────────────────────────────
    const cleanupSnapping = initSnapping(canvas);

    // ── Double-click → enter text editing ──────────────────────────────────
    const onDblClick = (e) => {
      const obj = e.target;
      if (!obj) return;
      if (['textbox', 'text', 'i-text'].includes(obj.type)) {
        canvas.setActiveObject(obj);
        obj.enterEditing();
        canvas.requestRenderAll();
      }
    };
    canvas.on('mouse:dblclick', onDblClick);

    // ── Ctrl/Cmd+click → add to selection ──────────────────────────────────
    const onMouseDown = (e) => {
      if (!e.target) return;
      const isCtrl = e.e.ctrlKey || e.e.metaKey;
      if (!isCtrl) return;

      const clicked = e.target;
      const current = canvas.getActiveObject();

      if (!current) {
        canvas.setActiveObject(clicked);
      } else if (current.type === 'activeSelection') {
        const objs = current.getObjects();
        if (objs.includes(clicked)) {
          current.removeWithUpdate(clicked);
          if (current.getObjects().length === 1) {
            canvas.setActiveObject(current.getObjects()[0]);
          }
        } else {
          current.addWithUpdate(clicked);
        }
      } else if (current !== clicked) {
        const sel = new fabric.ActiveSelection([current, clicked], { canvas });
        canvas.setActiveObject(sel);
      }
      canvas.requestRenderAll();
    };
    canvas.on('mouse:down', onMouseDown);

    // ── Hover Section Highlight & Click ─────────────────────────────────────
    const onMouseMove = (e) => {
      if (isAdmin) return; // Only for regular users
      
      const pointer = canvas.getPointer(e.e);
      let foundSectionId = null;

      // First check if we hit a specific object directly (fastest)
      const target = canvas.findTarget(e.e);
      if (target && target.customMeta?.sectionId) {
        foundSectionId = target.customMeta.sectionId;
      } 
      // If not, manually check if pointer is inside any section's bounding box
      else {
        const sectionedObjects = canvas.getObjects().filter(o => o.customMeta?.sectionId && o !== highlightRectRef.current && !o.excludeFromExport);
        const sectionBounds = {};
        
        sectionedObjects.forEach(obj => {
          const sid = obj.customMeta.sectionId;
          const br = obj.getBoundingRect(); 
          const left = br.left / canvas.getZoom();
          const top = br.top / canvas.getZoom();
          const width = br.width / canvas.getZoom();
          const height = br.height / canvas.getZoom();
          
          if (!sectionBounds[sid]) {
            sectionBounds[sid] = { minX: left, minY: top, maxX: left + width, maxY: top + height };
          } else {
            sectionBounds[sid].minX = Math.min(sectionBounds[sid].minX, left);
            sectionBounds[sid].minY = Math.min(sectionBounds[sid].minY, top);
            sectionBounds[sid].maxX = Math.max(sectionBounds[sid].maxX, left + width);
            sectionBounds[sid].maxY = Math.max(sectionBounds[sid].maxY, top + height);
          }
        });

        const padding = 10;
        for (const [sid, bounds] of Object.entries(sectionBounds)) {
          if (
            pointer.x >= bounds.minX - padding &&
            pointer.x <= bounds.maxX + padding &&
            pointer.y >= bounds.minY - padding &&
            pointer.y <= bounds.maxY + padding
          ) {
            foundSectionId = sid;
            break;
          }
        }
      }

      if (foundSectionId) {
        const sid = foundSectionId;
        // Don't update state unnecessarily if same section
        if (highlightRectRef.current?.sectionId !== sid) {
          setHoveredSectionId(sid);
          
          // Clear old highlight
          if (highlightRectRef.current) {
            canvas.remove(highlightRectRef.current);
          }

          // Compute bounding box
          const objects = canvas.getObjects().filter(o => o.customMeta?.sectionId === sid && o !== highlightRectRef.current);
          if (objects.length > 0) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            objects.forEach(obj => {
              const br = obj.getBoundingRect();
              minX = Math.min(minX, br.left);
              minY = Math.min(minY, br.top);
              maxX = Math.max(maxX, br.left + br.width);
              maxY = Math.max(maxY, br.top + br.height);
            });

            // Draw highlight rect
            const padding = 10;
            const rect = new fabric.Rect({
              left: (minX - padding) / canvas.getZoom(), // un-zoom because rect will be zoomed
              top: (minY - padding) / canvas.getZoom(),
              width: (maxX - minX + padding * 2) / canvas.getZoom(),
              height: (maxY - minY + padding * 2) / canvas.getZoom(),
              fill: 'rgba(59, 130, 246, 0.05)',
              stroke: 'rgba(59, 130, 246, 0.4)',
              strokeWidth: 1 / canvas.getZoom(),
              rx: 8,
              ry: 8,
              selectable: false,
              evented: false,
              excludeFromExport: true,
            });
            rect.sectionId = sid;
            canvas.add(rect);
            canvas.sendToBack(rect);
            highlightRectRef.current = rect;
            canvas.requestRenderAll();
          }
        }
      } else {
        if (highlightRectRef.current) {
          canvas.remove(highlightRectRef.current);
          highlightRectRef.current = null;
          setHoveredSectionId(null);
          canvas.requestRenderAll();
        }
      }
    };

    const onMouseUp = (e) => {
      if (isAdmin) return;
      if (highlightRectRef.current && highlightRectRef.current.sectionId) {
        // Calculate the center of the highlight rect relative to the viewport
        const rect = highlightRectRef.current.getBoundingRect();
        setActiveSectionPopup({
          sectionId: highlightRectRef.current.sectionId,
          x: rect.left + rect.width + 15, // Put it to the right of the section
          y: rect.top,
        });
      } else {
        setActiveSectionPopup(null);
      }
    };

    canvas.on('mouse:move', onMouseMove);
    canvas.on('mouse:up', onMouseUp);

    // ── Keyboard shortcuts ──────────────────────────────────────────────────
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

      const isCtrl = e.ctrlKey || e.metaKey;
      const active = canvas.getActiveObject();

      // ── Copy (Ctrl+C) ─────────────────────────────────────────────────────
      if (isCtrl && e.key === 'c' && active) {
        e.preventDefault();
        active.clone((cloned) => {
          clipboardRef.current = cloned;
          pasteOffsetRef.current = 0;
        }, ['customMeta']);
        return;
      }

      // ── Cut (Ctrl+X) — copy then remove, close the gap ────────────────────
      if (isCtrl && e.key === 'x' && active) {
        e.preventDefault();
        if (active.isEditing) return;

        // Collect the objects being cut
        const cutObjs = active.type === 'activeSelection'
          ? active.getObjects()
          : [active];

        // Clone to clipboard first
        active.clone((cloned) => {
          clipboardRef.current = cloned;
          pasteOffsetRef.current = 0; // paste at original coords on target page
        }, ['customMeta']);

        // Vertical span of the cut region
        const minTop    = Math.min(...cutObjs.map(o => o.top ?? 0));
        const maxBottom = Math.max(...cutObjs.map(o =>
          (o.top ?? 0) + (o.height ?? 0) * (o.scaleY ?? 1)
        ));
        const gap = maxBottom - minTop;

        // Remove cut objects
        cutObjs.forEach(obj => canvas.remove(obj));
        canvas.discardActiveObject();

        // Shift everything below the gap upward to close the space
        if (gap > 0) {
          canvas.getObjects().forEach(obj => {
            if ((obj.top ?? 0) >= maxBottom) {
              obj.set({ top: (obj.top ?? 0) - gap });
            }
          });
        }

        canvas.requestRenderAll();
        pushHistory();
        return;
      }

      // ── Paste (Ctrl+V) ────────────────────────────────────────────────────
      if (isCtrl && e.key === 'v') {
        e.preventDefault();
        const clipped = clipboardRef.current;
        if (!clipped) return;

        pasteOffsetRef.current += PASTE_OFFSET;
        const offset = pasteOffsetRef.current;

        clipped.clone((pasted) => {
          canvas.discardActiveObject();

          if (pasted.type === 'activeSelection') {
            // Multi-object paste — add each child individually then re-group
            pasted.canvas = canvas;
            pasted.forEachObject((obj) => {
              obj.set({
                left: obj.left + offset,
                top:  obj.top  + offset,
              });
              canvas.add(obj);
            });
            pasted.setCoords();
            const newSel = new fabric.ActiveSelection(pasted.getObjects(), { canvas });
            canvas.setActiveObject(newSel);
          } else {
            pasted.set({
              left: pasted.left + offset,
              top:  pasted.top  + offset,
              evented: true,
            });
            canvas.add(pasted);
            canvas.setActiveObject(pasted);
          }

          canvas.requestRenderAll();
          pushHistory();
        }, ['customMeta']);
        return;
      }

      // ── Delete ────────────────────────────────────────────────────────────
      if (!active) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (active.isEditing) return;
        if (active.type === 'activeSelection') {
          active.forEachObject(obj => canvas.remove(obj));
          canvas.discardActiveObject();
        } else {
          canvas.remove(active);
        }
        canvas.requestRenderAll();
        return;
      }

      // ── Arrow nudge: 1px, or 10px with Shift ─────────────────────────────
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        if (active.isEditing) return;
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        if (e.key === 'ArrowLeft')  active.set('left', active.left - d);
        if (e.key === 'ArrowRight') active.set('left', active.left + d);
        if (e.key === 'ArrowUp')    active.set('top',  active.top  - d);
        if (e.key === 'ArrowDown')  active.set('top',  active.top  + d);
        canvas.requestRenderAll();
        pushHistory();
      }
    };
    window.addEventListener('keydown', onKey);

    // Initial history snapshot
    pushHistory();

    return () => {
      canvas.off('selection:created', onSelect);
      canvas.off('selection:updated', onSelect);
      canvas.off('selection:cleared', onDeselect);
      canvas.off('object:modified',   pushOnMutation);
      canvas.off('object:added',      pushOnMutation);
      canvas.off('object:removed',    pushOnMutation);
      canvas.off('mouse:dblclick',    onDblClick);
      canvas.off('mouse:down',        onMouseDown);
      canvas.off('mouse:move',        onMouseMove);
      canvas.off('mouse:up',          onMouseUp);
      cleanupSnapping();
      window.removeEventListener('keydown', onKey);
      canvas.dispose();
      canvasRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Feature 3: Native Fabric zoom — re-renders at full pixel density ────────
  // Instead of CSS transform: scale() (which upscales a fixed bitmap → blurry),
  // we call canvas.setZoom() which makes Fabric re-rasterize at the correct
  // pixel size. The canvas element itself grows, and the outer overflow-auto
  // container handles scrolling naturally.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setZoom(zoom);
    canvas.setWidth(A4_W   * zoom);
    canvas.setHeight(A4_H  * zoom);
    canvas.requestRenderAll();
  }, [zoom, canvasRef]);

  // ── Ingestion confidence highlighting ───────────────────────────────────────
  // When templates are loaded from the ingestion pipeline, flag uncertain
  // elements with an orange dashed border so the user reviews them.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ingestionReview) return;

    const { confidences } = ingestionReview;
    if (!confidences || Object.keys(confidences).length === 0) return;

    // Apply orange dashed borders to low-confidence objects
    const objects = canvas.getObjects();
    objects.forEach((obj, idx) => {
      const elementId = `el_${String(idx + 1).padStart(3, '0')}`;
      const conf = confidences[elementId];

      if (conf !== undefined && conf < 0.70) {
        obj.set({
          stroke: '#FF8C00',
          strokeWidth: 1.5,
          strokeDashArray: [5, 3],
        });
      }
    });

    canvas.requestRenderAll();
  }, [ingestionReview, canvasRef]);

  return (
    <div
      className="relative flex items-start justify-center w-full h-full overflow-auto bg-[#1a1a1e] editor-panel-scroll"
      style={{ padding: '40px' }}
    >
      {/* A4 sheet — size is now driven by Fabric's own width/height via setZoom */}
      <div
        style={{
          boxShadow: '0 8px 48px rgba(0,0,0,0.55)',
          flexShrink: 0,
          position: 'relative',
          // width/height here match the canvas element, which Fabric resizes
          width:  A4_W * zoom,
          height: A4_H * zoom,
        }}
      >
        <canvas ref={canvasElRef} />
        <AIFloatingButton />
      </div>
    </div>
  );
}
