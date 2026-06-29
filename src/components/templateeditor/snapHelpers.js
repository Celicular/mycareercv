/**
 * Smart Guides & Snapping for Fabric.js
 *
 * Draws magenta guide lines directly onto the canvas context via `after:render`.
 * Snaps the moving object to:
 *  - Canvas edges (left, right, top, bottom)
 *  - Canvas center (horizontal & vertical)
 *  - Standard margins (40px each side)
 *  - Other objects' edges and centers
 *
 * Returns a cleanup function — call it when the canvas is destroyed.
 */

import { A4_W, A4_H } from './TemplateCanvas';

// ── Configuration ─────────────────────────────────────────────────────────────
const SNAP_THRESHOLD = 8;     // pixels — how close before snapping kicks in
const MARGIN        = 40;     // the default 40px document margin

const COLOR_CANVAS  = 'rgba(255, 0, 180, 0.85)';  // magenta — canvas/margin guides
const COLOR_OBJECT  = 'rgba(0, 191, 255, 0.85)';  // cyan    — object-to-object guides
const LINE_WIDTH    = 0.75;

// ── Active guide state (mutated during drag, read during render) ──────────────
let activeGuides = [];   // [{ type:'v'|'h', pos:number, color:string }]
let snapEnabled  = true; // can be toggled later

// ── Collect snap targets for horizontal (X) and vertical (Y) axes ────────────
function collectTargets(canvas, movingObj) {
  const xTargets = []; // each: { pos, align:'left'|'center'|'right', color }
  const yTargets = []; // each: { pos, align:'top'|'center'|'bottom', color }

  // ── 1. Canvas edges + center + margins ───────────────────────────────────
  xTargets.push(
    { pos: 0,           align: 'left',   color: COLOR_CANVAS },
    { pos: A4_W / 2,    align: 'center', color: COLOR_CANVAS },
    { pos: A4_W,        align: 'right',  color: COLOR_CANVAS },
    { pos: MARGIN,      align: 'left',   color: COLOR_CANVAS },
    { pos: A4_W - MARGIN, align: 'right',color: COLOR_CANVAS },
  );
  yTargets.push(
    { pos: 0,           align: 'top',    color: COLOR_CANVAS },
    { pos: A4_H / 2,    align: 'center', color: COLOR_CANVAS },
    { pos: A4_H,        align: 'bottom', color: COLOR_CANVAS },
    { pos: MARGIN,      align: 'top',    color: COLOR_CANVAS },
    { pos: A4_H - MARGIN, align: 'bottom', color: COLOR_CANVAS },
  );

  // ── 2. Other objects ─────────────────────────────────────────────────────
  canvas.getObjects().forEach(obj => {
    if (obj === movingObj || obj.isGuide) return;

    const oRect = obj.getBoundingRect(true);   // { left, top, width, height }
    const oL  = oRect.left;
    const oCX = oRect.left + oRect.width  / 2;
    const oR  = oRect.left + oRect.width;
    const oT  = oRect.top;
    const oCY = oRect.top  + oRect.height / 2;
    const oB  = oRect.top  + oRect.height;

    xTargets.push(
      { pos: oL,  align: 'left',   color: COLOR_OBJECT },
      { pos: oCX, align: 'center', color: COLOR_OBJECT },
      { pos: oR,  align: 'right',  color: COLOR_OBJECT },
    );
    yTargets.push(
      { pos: oT,  align: 'top',    color: COLOR_OBJECT },
      { pos: oCY, align: 'center', color: COLOR_OBJECT },
      { pos: oB,  align: 'bottom', color: COLOR_OBJECT },
    );
  });

  return { xTargets, yTargets };
}

// ── Compute which guides fire and snap the object ─────────────────────────────
function snapObject(canvas, obj) {
  if (!snapEnabled) return;

  const rect = obj.getBoundingRect(true);
  const oL  = rect.left;
  const oCX = rect.left + rect.width  / 2;
  const oR  = rect.left + rect.width;
  const oT  = rect.top;
  const oCY = rect.top  + rect.height / 2;
  const oB  = rect.top  + rect.height;

  const { xTargets, yTargets } = collectTargets(canvas, obj);
  const guides = [];

  // ── X-axis snap (vertical guide lines) ────────────────────────────────────
  let snappedX = false;
  for (const t of xTargets) {
    if (snappedX) break;

    // Check each edge of the moving object against each target alignment
    const checks = [
      { objPos: oL,  delta: (d) => obj.set('left', obj.left + d) },
      { objPos: oCX, delta: (d) => obj.set('left', obj.left + d) },
      { objPos: oR,  delta: (d) => obj.set('left', obj.left + d) },
    ];

    for (const check of checks) {
      const diff = t.pos - check.objPos;
      if (Math.abs(diff) <= SNAP_THRESHOLD) {
        check.delta(diff);
        guides.push({ type: 'v', pos: t.pos, color: t.color });
        snappedX = true;
        break;
      }
    }
  }

  // ── Y-axis snap (horizontal guide lines) ──────────────────────────────────
  let snappedY = false;
  for (const t of yTargets) {
    if (snappedY) break;

    const checks = [
      { objPos: oT  },
      { objPos: oCY },
      { objPos: oB  },
    ];

    for (const check of checks) {
      const diff = t.pos - check.objPos;
      if (Math.abs(diff) <= SNAP_THRESHOLD) {
        // Re-fetch rect after possible X snap already modified position
        const freshRect = obj.getBoundingRect(true);
        const freshOT  = freshRect.top;
        const freshOCY = freshRect.top + freshRect.height / 2;
        const freshOB  = freshRect.top + freshRect.height;
        const freshPos = [freshOT, freshOCY, freshOB];
        const freshDiff = t.pos - freshPos[checks.indexOf(check)];
        obj.set('top', obj.top + freshDiff);
        guides.push({ type: 'h', pos: t.pos, color: t.color });
        snappedY = true;
        break;
      }
    }
  }

  activeGuides = guides;
}

// ── Draw guide lines on the canvas context ────────────────────────────────────
function drawGuides(ctx) {
  if (!activeGuides.length) return;
  ctx.save();
  for (const g of activeGuides) {
    ctx.strokeStyle = g.color;
    ctx.lineWidth   = LINE_WIDTH;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    if (g.type === 'v') {
      // Vertical line — full canvas height
      ctx.moveTo(g.pos, 0);
      ctx.lineTo(g.pos, A4_H);
    } else {
      // Horizontal line — full canvas width
      ctx.moveTo(0,     g.pos);
      ctx.lineTo(A4_W,  g.pos);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ── Public init function ──────────────────────────────────────────────────────
export function initSnapping(canvas) {
  const onMoving = ({ target }) => {
    snapObject(canvas, target);
    canvas.requestRenderAll();
  };

  const onScaling = ({ target }) => {
    // Reset guides during scale — don't snap scale handles
    activeGuides = [];
  };

  const onMouseUp = () => {
    activeGuides = [];
    canvas.requestRenderAll();
  };

  const onAfterRender = ({ ctx }) => {
    drawGuides(ctx);
  };

  canvas.on('object:moving',    onMoving);
  canvas.on('object:scaling',   onScaling);
  canvas.on('mouse:up',         onMouseUp);
  canvas.on('after:render',     onAfterRender);

  return () => {
    canvas.off('object:moving',  onMoving);
    canvas.off('object:scaling', onScaling);
    canvas.off('mouse:up',       onMouseUp);
    canvas.off('after:render',   onAfterRender);
    activeGuides = [];
  };
}

// ── Toggle snapping on/off (can be wired to a toolbar button later) ──────────
export function setSnapEnabled(val) {
  snapEnabled = val;
  if (!val) activeGuides = [];
}

export function isSnapEnabled() {
  return snapEnabled;
}
