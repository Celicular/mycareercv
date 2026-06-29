import { fabric } from 'fabric';
import { SCHEMA_DEF } from '../schema/resumeSchema';

const A4_HEIGHT = 842; // A4 canvas height in px at 96dpi
const PAGE_TOP_MARGIN = 35; // top margin for content placed on a new page

/**
 * After data injection + reflow, call this to find objects that were pushed
 * past the bottom of the page (top >= A4_HEIGHT or bottom > A4_HEIGHT).
 *
 * Whole section groups stay together: if ANY element in a sectionGroupId
 * overflows, ALL elements in that group move to the next page — so a job
 * title is never orphaned on page 1 while its bullets land on page 2.
 *
 * Returns an array of { obj, newTop } ready to place on page 2,
 * or an empty array if nothing overflows.
 */
export function extractOverflowObjects(canvas) {
  if (!canvas) return [];
  const objects = canvas.getObjects();
  if (objects.length === 0) return [];

  // ── Step 1: find section groups that have at least one overflowing element ──
  const overflowGroupIds = new Set();
  objects.forEach(obj => {
    const objBottom = (obj.top ?? 0) + (obj.height ?? 0) * (obj.scaleY ?? 1);
    const directOverflow = (obj.top ?? 0) >= A4_HEIGHT || objBottom > A4_HEIGHT;
    if (directOverflow && obj.customMeta?.sectionGroupId) {
      overflowGroupIds.add(obj.customMeta.sectionGroupId);
    }
  });

  // ── Step 2: collect all objects that belong on the next page ──────────────
  const overflowObjs = objects.filter(obj => {
    const objBottom = (obj.top ?? 0) + (obj.height ?? 0) * (obj.scaleY ?? 1);
    const directOverflow = (obj.top ?? 0) >= A4_HEIGHT || objBottom > A4_HEIGHT;
    const groupOverflow  = obj.customMeta?.sectionGroupId
      && overflowGroupIds.has(obj.customMeta.sectionGroupId);
    return directOverflow || groupOverflow;
  });

  if (overflowObjs.length === 0) return [];

  // ── Step 3: compute top positions relative to page 2 ─────────────────────
  // Anchor point = the topmost overflow object; everything else keeps its
  // relative spacing.  We add a small top margin so the content isn't flush
  // against the very top of the new page.
  const minTop = Math.min(...overflowObjs.map(o => o.top ?? 0));

  return overflowObjs.map(obj => ({
    obj,
    newTop: (obj.top ?? 0) - minTop + PAGE_TOP_MARGIN,
  }));
}



export function bindDataToCanvas(canvas, data) {
  if (!canvas || !data) return;

  // Helper to check if two objects overlap horizontally
  const horizontallyOverlaps = (o1, o2) => {
    const l1 = o1.left ?? 0;
    const r1 = l1 + (o1.width ?? 0) * (o1.scaleX ?? 1);
    const l2 = o2.left ?? 0;
    const r2 = l2 + (o2.width ?? 0) * (o2.scaleX ?? 1);
    // Allow a small 5px tolerance for rounding
    return l1 < r2 + 5 && r1 + 5 > l2;
  };

  // Sort all objects top-to-bottom so we process in layout order
  const sorted = [...canvas.getObjects()].sort((a, b) => (a.top ?? 0) - (b.top ?? 0));
  let updatedCount = 0;

  sorted.forEach(obj => {
    const meta = obj.customMeta || {};
    const { bindParent, bindField, bindInstanceId = 0 } = meta;

    if (!bindParent || !bindField) return;
    if (typeof obj.set !== 'function' || obj.text === undefined) return;

    // ── 1. Resolve the value from the JSON payload ────────────────────────
    let resolvedValue = null;

    if (bindParent === 'identity') {
      // Backwards compatibility for old templates that incorrectly bound skills to identity
      if (bindField.startsWith('skills.') && data['skills']) {
        const skillField = bindField.split('.')[1];
        resolvedValue = data['skills'][skillField];
      } else {
        resolvedValue = data[bindField];
      }
    } else if (SCHEMA_DEF[bindParent]?.type === 'array') {
      const arr = data[bindParent];
      if (Array.isArray(arr)) {
        const idx = bindInstanceId - 1;
        if (idx >= 0 && idx < arr.length) resolvedValue = arr[idx][bindField];
      }
    } else {
      const obj2 = data[bindParent];
      if (obj2 && typeof obj2 === 'object') resolvedValue = obj2[bindField];
    }

    if (resolvedValue === null || resolvedValue === undefined) return;

    // ── 2. Format the value ───────────────────────────────────────────────
    let finalString = '';
    if (Array.isArray(resolvedValue)) {
      if (resolvedValue.length > 0) {
        if (meta.displayStyle === 'badges') {
          // ── SPECIAL BADGE RENDERING ──
          obj.set({ visible: false, text: '' });
          
          const badgeColor = meta.badgeColor || '#FF6B00';
          const gapX = 10;
          const gapY = 8;
          const linePadding = 3;
          const startX = obj.left ?? 0;
          const startY = obj.top ?? 0;
          const maxWidth = obj.width ?? 400; // Use object width for wrapping bounds
          
          let currentX = startX;
          let currentY = startY;
          let maxRowHeight = 0;

          if (typeof obj.initDimensions === 'function') obj.initDimensions();
          const oldHeight = obj.height ?? 0;
          const objBottom = startY + oldHeight;

          const generatedObjects = [];

          resolvedValue.forEach(item => {
            const textObj = new fabric.Text(String(item), {
              fontFamily: obj.fontFamily,
              fontSize: obj.fontSize,
              fontWeight: obj.fontWeight,
              fontStyle: obj.fontStyle,
              fill: obj.fill,
              left: currentX,
              top: currentY,
              selectable: false,
              evented: false,
              excludeFromExport: true,
            });

            // Wrap to next line if exceeds width
            if (currentX + textObj.width > startX + maxWidth && currentX > startX) {
              currentX = startX;
              currentY += maxRowHeight + gapY + linePadding;
              textObj.set({ left: currentX, top: currentY });
              maxRowHeight = 0;
            }

            maxRowHeight = Math.max(maxRowHeight, textObj.height);

            const lineY = currentY + textObj.height + linePadding;
            const lineObj = new fabric.Line([currentX, lineY, currentX + textObj.width, lineY], {
              stroke: badgeColor,
              strokeWidth: 2,
              selectable: false,
              evented: false,
              excludeFromExport: true,
            });

            generatedObjects.push(textObj, lineObj);
            currentX += textObj.width + gapX;
          });

          generatedObjects.forEach(go => canvas.add(go));

          const newHeight = (currentY + maxRowHeight + linePadding) - startY;
          const delta = newHeight - oldHeight;

          if (delta !== 0) {
            canvas.getObjects().forEach(other => {
              if (other === obj || generatedObjects.includes(other)) return;
              if ((other.top ?? 0) >= objBottom - 1 && horizontallyOverlaps(obj, other)) {
                other.set({ top: (other.top ?? 0) + delta });
                other.setCoords();
              }
            });
          }
          
          updatedCount++;
          return; // Skip normal text rendering
        } else if (meta.displayStyle === 'comma') {
          finalString = resolvedValue.join(', ');
        } else {
          const bullet = meta.bulletStyle || '•';
          const sep    = meta.listSeparator || '\n';
          finalString  = resolvedValue.map(item => `${bullet} ${item}`).join(sep);
        }
      }
    } else {
      finalString = String(resolvedValue);
    }

    // ── 3. Measure OLD height (live, not stale JSON value) ────────────────
    if (typeof obj.initDimensions === 'function') obj.initDimensions();
    const oldHeight = (obj.height ?? 0) * (obj.scaleY ?? 1);
    const objBottom = (obj.top ?? 0) + oldHeight;

    // ── 4. Inject text & recompute height ─────────────────────────────────
    obj.set({ text: finalString, visible: true });
    obj.setCoords();
    if (typeof obj.initDimensions === 'function') obj.initDimensions();

    const newHeight = (obj.height ?? 0) * (obj.scaleY ?? 1);
    const delta     = newHeight - oldHeight; // growth only, NOT full height

    // ── 5. Immediately push everything below by the delta ─────────────────
    if (delta !== 0) {
      canvas.getObjects().forEach(other => {
        if (other === obj) return;
        if ((other.top ?? 0) >= objBottom - 1 && horizontallyOverlaps(obj, other)) {
          other.set({ top: (other.top ?? 0) + delta });
          other.setCoords();
        }
      });
    }

    updatedCount++;
  });

  if (updatedCount > 0) canvas.requestRenderAll();
  return updatedCount;
}
