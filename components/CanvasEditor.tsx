'use client';

// ============================================================
// Blueprint AI — Architectural Canvas Renderer
// Full architectural plan: hatched walls, windows, doors,
// dimension lines, title block, sheet border.
// Y increases downward (matches zone-based layout engine).
// ============================================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FloorPlan, Room } from '@/types/plan';
import { moveRoom, EXT_WALL } from '@/lib/floorPlanEngine';

const BASE_PPM = 50;

// Layout constants (pixels, fixed — title block always legible)
const SHEET_MARGIN  = 32;  // around plan to sheet edge
const HEADING_H     = 34;  // "FLOOR PLAN" text above plan
const DIM_SPACE     = 52;  // space below plan for dimension lines
const TITLE_H       = 88;  // title block height
const RIGHT_SPACE   = 88;  // right margin for depth dim + N arrow

interface CanvasEditorProps {
  plan: FloorPlan | null;
  onPlanChange: (plan: FloorPlan) => void;
  selectedRoomId: string | null;
  onSelectRoom: (id: string | null) => void;
  showGrid?: boolean;
}

export default function CanvasEditor({
  plan, onPlanChange, selectedRoomId, onSelectRoom, showGrid = true,
}: CanvasEditorProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(BASE_PPM);
  const [offset, setOffset] = useState({ x: 80, y: 70 });
  const [size, setSize] = useState({ w: 800, h: 600 });

  const dragging = useRef<{ roomId: string; startMX: number; startMY: number; startRX: number; startRY: number } | null>(null);
  const panning  = useRef<{ lastX: number; lastY: number } | null>(null);

  // ---- Resize observer ----
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.offsetWidth, h: el.offsetHeight }));
    ro.observe(el);
    setSize({ w: el.offsetWidth, h: el.offsetHeight });
    return () => ro.disconnect();
  }, []);

  // ---- Auto-fit when plan first arrives ----
  useEffect(() => {
    if (!plan || !wrapRef.current) return;
    const el = wrapRef.current;
    const availW = el.offsetWidth  - SHEET_MARGIN * 2 - RIGHT_SPACE;
    const availH = el.offsetHeight - SHEET_MARGIN * 2 - HEADING_H - DIM_SPACE - TITLE_H - 20;
    const s = Math.min(availW / plan.width, availH / plan.depth, BASE_PPM * 1.4);
    setScale(Math.max(s, 24));
    setOffset({ x: SHEET_MARGIN + 10, y: SHEET_MARGIN + HEADING_H });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.id]);

  // ---- Draw ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width  = size.w * dpr;
    canvas.height = size.h * dpr;
    canvas.style.width  = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size.w, size.h);
    ctx.fillStyle = '#E5E7EB';
    ctx.fillRect(0, 0, size.w, size.h);

    if (!plan) { drawEmpty(ctx, size.w, size.h); return; }

    const planW = plan.width  * scale;
    const planH = plan.depth  * scale;
    const ox = offset.x;
    const oy = offset.y;

    // Compute sheet extents
    const sheetX = ox - SHEET_MARGIN;
    const sheetY = oy - HEADING_H - SHEET_MARGIN;
    const sheetW = planW + RIGHT_SPACE + SHEET_MARGIN * 2;
    const sheetH = HEADING_H + planH + DIM_SPACE + TITLE_H + SHEET_MARGIN * 2;
    const titleY = oy + planH + DIM_SPACE;

    // --- 1. Sheet paper ---
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur  = 20;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(sheetX, sheetY, sheetW, sheetH);
    ctx.restore();

    // --- 2. Optional grid ---
    if (showGrid) drawGrid(ctx, ox, oy, planW, planH, scale);

    // --- 3. House white base ---
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    buildHousePath(ctx, plan, scale, ox, oy, planW, planH);
    ctx.fill();

    // --- 4. Room color fills ---
    for (const room of plan.rooms) {
      ctx.fillStyle = room.color || '#F5F5F5';
      ctx.fillRect(ox + room.x * scale, oy + room.y * scale, room.width * scale, room.height * scale);
    }

    // --- 5. Wall hatch (diagonal lines in wall zones) ---
    drawWallHatch(ctx, plan, scale, ox, oy, planW, planH);

    // --- 6. Interior wall lines ---
    drawInteriorWalls(ctx, plan, scale, ox, oy);

    // --- 7. Exterior border (thick) ---
    ctx.save();
    ctx.strokeStyle = '#111827';
    ctx.lineWidth   = Math.max(3, EXT_WALL * scale * 0.8);
    ctx.setLineDash([]);
    ctx.beginPath();
    buildHousePath(ctx, plan, scale, ox, oy, planW, planH);
    ctx.stroke();
    ctx.restore();

    // --- 8. Window symbols ---
    drawWindows(ctx, plan, scale, ox, oy);

    // --- 9. Door symbols ---
    drawDoors(ctx, plan, scale, ox, oy);

    // --- 10. Room labels ---
    for (const room of plan.rooms) {
      drawRoomLabel(ctx, room, scale, ox, oy, room.id === selectedRoomId);
    }

    // --- 11. "FLOOR PLAN" heading ---
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '2px';
    ctx.fillText('FLOOR PLAN', ox + planW / 2, oy - HEADING_H / 2);
    ctx.letterSpacing = '0px';

    // --- 12. Dimension lines ---
    drawDimensions(ctx, plan, scale, ox, oy, planW, planH);

    // --- 13. Scale bar ---
    drawScaleBar(ctx, ox, oy + planH + DIM_SPACE - 14, scale);

    // --- 14. North arrow ---
    drawNorthArrow(ctx, ox + planW + RIGHT_SPACE - 28, oy + 34);

    // --- 15. Title block ---
    drawTitleBlock(ctx, plan, sheetX, titleY, sheetW, TITLE_H);

    // --- 16. Sheet border (drawn last) ---
    drawSheetBorder(ctx, sheetX, sheetY, sheetW, sheetH);

  }, [plan, scale, offset, size, showGrid, selectedRoomId]);

  // ---- Hit test ----
  const hitRoom = useCallback((cx: number, cy: number): Room | null => {
    if (!plan) return null;
    for (let i = plan.rooms.length - 1; i >= 0; i--) {
      const r = plan.rooms[i];
      const rx = offset.x + r.x * scale;
      const ry = offset.y + r.y * scale;
      if (cx >= rx && cx <= rx + r.width * scale && cy >= ry && cy <= ry + r.height * scale) return r;
    }
    return null;
  }, [plan, offset, scale]);

  // ---- Pointer events ----
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      panning.current = { lastX: e.clientX, lastY: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    const room = hitRoom(cx, cy);
    if (room) {
      onSelectRoom(room.id);
      dragging.current = { roomId: room.id, startMX: e.clientX, startMY: e.clientY, startRX: room.x, startRY: room.y };
      e.currentTarget.setPointerCapture(e.pointerId);
    } else {
      onSelectRoom(null);
    }
  }, [hitRoom, onSelectRoom]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (panning.current) {
      const dx = e.clientX - panning.current.lastX;
      const dy = e.clientY - panning.current.lastY;
      panning.current = { lastX: e.clientX, lastY: e.clientY };
      setOffset(o => ({ x: o.x + dx, y: o.y + dy }));
      return;
    }
    if (dragging.current && plan) {
      const dx = (e.clientX - dragging.current.startMX) / scale;
      const dy = (e.clientY - dragging.current.startMY) / scale;
      onPlanChange(moveRoom(plan, dragging.current.roomId, dragging.current.startRX + dx, dragging.current.startRY + dy));
    }
  }, [plan, scale, onPlanChange]);

  const onPointerUp = useCallback(() => { dragging.current = null; panning.current = null; }, []);

  const onWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setScale(s => Math.max(18, Math.min(200, s * (e.deltaY > 0 ? 0.9 : 1.1))));
  }, []);

  const handleFit = () => {
    if (!plan || !wrapRef.current) return;
    const el = wrapRef.current;
    const availW = el.offsetWidth  - SHEET_MARGIN * 2 - RIGHT_SPACE;
    const availH = el.offsetHeight - SHEET_MARGIN * 2 - HEADING_H - DIM_SPACE - TITLE_H - 20;
    setScale(Math.max(Math.min(availW / plan.width, availH / plan.depth, BASE_PPM * 1.4), 24));
    setOffset({ x: SHEET_MARGIN + 10, y: SHEET_MARGIN + HEADING_H });
  };

  const selectedRoom = plan?.rooms.find(r => r.id === selectedRoomId) ?? null;

  return (
    <div ref={wrapRef} className="flex-1 relative overflow-hidden bg-gray-300 select-none">
      <canvas
        ref={canvasRef}
        style={{ display: 'block', cursor: panning.current ? 'grabbing' : 'crosshair' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
      />

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col bg-white rounded-lg shadow border border-gray-200 overflow-hidden text-gray-600">
        <button onClick={() => setScale(s => Math.min(200, s * 1.2))} className="px-3 py-2 hover:bg-gray-50 font-mono text-lg leading-none">+</button>
        <div className="px-3 py-1 text-xs text-center border-y border-gray-100 text-gray-500 font-mono">
          {Math.round((scale / BASE_PPM) * 100)}%
        </div>
        <button onClick={() => setScale(s => Math.max(18, s * 0.8))} className="px-3 py-2 hover:bg-gray-50 font-mono text-lg leading-none">−</button>
        <button onClick={handleFit} className="px-3 py-1.5 text-xs hover:bg-gray-50 border-t border-gray-100">Fit</button>
      </div>

      {/* Selected room info */}
      {selectedRoom && (
        <div className="absolute top-3 left-3 bg-white rounded-lg shadow border border-gray-200 px-3 py-2 text-sm pointer-events-none">
          <p className="font-semibold text-gray-800">{selectedRoom.label}</p>
          <p className="text-gray-500">
            {selectedRoom.width.toFixed(1)}m × {selectedRoom.height.toFixed(1)}m &nbsp;=&nbsp; {(selectedRoom.width * selectedRoom.height).toFixed(1)}m²
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Drag to move · Alt+drag to pan</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Drawing helpers
// ============================================================

function drawEmpty(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#9CA3AF';
  ctx.font = '500 16px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('No floor plan yet', w / 2, h / 2 - 14);
  ctx.font = '400 13px Inter, Arial, sans-serif';
  ctx.fillStyle = '#D1D5DB';
  ctx.fillText('Configure your house and click Generate', w / 2, h / 2 + 14);
}

function drawGrid(ctx: CanvasRenderingContext2D, ox: number, oy: number, planW: number, planH: number, scale: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(156,163,175,0.35)';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([2, 4]);
  const step = scale;
  for (let x = 0; x <= planW + 0.5; x += step) {
    ctx.beginPath(); ctx.moveTo(ox + x, oy); ctx.lineTo(ox + x, oy + planH); ctx.stroke();
  }
  for (let y = 0; y <= planH + 0.5; y += step) {
    ctx.beginPath(); ctx.moveTo(ox, oy + y); ctx.lineTo(ox + planW, oy + y); ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
}

// ---- L-shape / rectangle house outline path ----
function buildHousePath(
  ctx: CanvasRenderingContext2D,
  plan: FloorPlan, scale: number, ox: number, oy: number, planW: number, planH: number
) {
  if (plan.garageWingWidth && plan.garageWingDepth) {
    const gW = plan.garageWingWidth * scale;
    const gH = plan.garageWingDepth * scale;
    ctx.moveTo(ox,       oy);
    ctx.lineTo(ox + gW,  oy);
    ctx.lineTo(ox + gW,  oy + gH);
    ctx.lineTo(ox + planW, oy + gH);
    ctx.lineTo(ox + planW, oy + planH);
    ctx.lineTo(ox,       oy + planH);
  } else {
    ctx.rect(ox, oy, planW, planH);
  }
  ctx.closePath();
}

// ---- Wall hatching (evenodd clip: house minus rooms) ----
function drawWallHatch(
  ctx: CanvasRenderingContext2D,
  plan: FloorPlan, scale: number, ox: number, oy: number, planW: number, planH: number
) {
  // Build a small diagonal-line tile pattern
  const tile = document.createElement('canvas');
  tile.width = 7; tile.height = 7;
  const tc = tile.getContext('2d')!;
  tc.strokeStyle = '#9CA3AF';
  tc.lineWidth = 0.8;
  // Diagonal: top-right to bottom-left
  tc.beginPath(); tc.moveTo(0, 7); tc.lineTo(7, 0); tc.stroke();
  tc.beginPath(); tc.moveTo(-3.5, 7); tc.lineTo(3.5, 0); tc.stroke();
  tc.beginPath(); tc.moveTo(3.5, 7); tc.lineTo(10.5, 0); tc.stroke();
  const pat = ctx.createPattern(tile, 'repeat');
  if (!pat) return;

  ctx.save();
  // Clip path = house outline MINUS all room rects (evenodd = holes)
  ctx.beginPath();
  buildHousePath(ctx, plan, scale, ox, oy, planW, planH);
  for (const r of plan.rooms) {
    ctx.rect(ox + r.x * scale, oy + r.y * scale, r.width * scale, r.height * scale);
  }
  ctx.clip('evenodd');
  ctx.fillStyle = pat;
  ctx.fillRect(ox, oy, planW, planH);
  ctx.restore();
}

// ---- Interior wall lines (room edges, deduplicated) ----
function drawInteriorWalls(
  ctx: CanvasRenderingContext2D, plan: FloorPlan, scale: number, ox: number, oy: number
) {
  ctx.save();
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  const drawn = new Set<string>();

  for (const r of plan.rooms) {
    const rx = ox + r.x * scale, ry = oy + r.y * scale;
    const rw = r.width * scale,  rh = r.height * scale;
    const edges = [
      [rx, ry, rx + rw, ry],
      [rx + rw, ry, rx + rw, ry + rh],
      [rx, ry + rh, rx + rw, ry + rh],
      [rx, ry, rx, ry + rh],
    ];
    for (const [x1, y1, x2, y2] of edges) {
      const k  = `${Math.round(x1)},${Math.round(y1)},${Math.round(x2)},${Math.round(y2)}`;
      const kr = `${Math.round(x2)},${Math.round(y2)},${Math.round(x1)},${Math.round(y1)}`;
      if (drawn.has(k) || drawn.has(kr)) continue;
      drawn.add(k);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
  }
  ctx.restore();
}

// ---- Window symbols on exterior walls ----
const WIN_ROOM_TYPES = new Set(['living', 'dining', 'kitchen', 'bedroom', 'master_bedroom', 'study']);

function drawWindows(
  ctx: CanvasRenderingContext2D, plan: FloorPlan, scale: number, ox: number, oy: number
) {
  const extW = EXT_WALL * scale;
  const planW = plan.width * scale;
  const planH = plan.depth * scale;

  for (const r of plan.rooms) {
    if (!WIN_ROOM_TYPES.has(r.type)) continue;
    const rx = ox + r.x * scale, ry = oy + r.y * scale;
    const rw = r.width * scale,  rh = r.height * scale;
    const winW = Math.min(rw * 0.5, 70);
    const winH = Math.min(rh * 0.5, 70);

    // Top exterior (room.y ≈ EXT_WALL)
    if (Math.abs(r.y - EXT_WALL) < 0.12)
      drawWindowH(ctx, rx + (rw - winW) / 2, oy, winW, extW);
    // Bottom exterior
    if (Math.abs(r.y + r.height - (plan.depth - EXT_WALL)) < 0.12)
      drawWindowH(ctx, rx + (rw - winW) / 2, oy + planH - extW, winW, extW);
    // Left exterior
    if (Math.abs(r.x - EXT_WALL) < 0.12)
      drawWindowV(ctx, ox, ry + (rh - winH) / 2, extW, winH);
    // Right exterior
    if (Math.abs(r.x + r.width - (plan.width - EXT_WALL)) < 0.12)
      drawWindowV(ctx, ox + planW - extW, ry + (rh - winH) / 2, extW, winH);
  }
}

function drawWindowH(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, wallT: number) {
  ctx.save();
  ctx.fillStyle = '#E0F2FE'; // light blue glass
  ctx.fillRect(x, y, w, wallT);
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 0.8;
  ctx.setLineDash([]);
  // 3 horizontal lines (outer wall face, glass centre, inner wall face)
  for (const frac of [0.15, 0.5, 0.85]) {
    ctx.beginPath(); ctx.moveTo(x, y + wallT * frac); ctx.lineTo(x + w, y + wallT * frac); ctx.stroke();
  }
  // Vertical end lines
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + wallT); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + wallT); ctx.stroke();
  ctx.restore();
}

function drawWindowV(ctx: CanvasRenderingContext2D, x: number, y: number, wallT: number, h: number) {
  ctx.save();
  ctx.fillStyle = '#E0F2FE';
  ctx.fillRect(x, y, wallT, h);
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 0.8;
  ctx.setLineDash([]);
  for (const frac of [0.15, 0.5, 0.85]) {
    ctx.beginPath(); ctx.moveTo(x + wallT * frac, y); ctx.lineTo(x + wallT * frac, y + h); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + wallT, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + wallT, y + h); ctx.stroke();
  ctx.restore();
}

// ---- Door symbols ----
const INT_WALL = 0.1;
const SKIP_DOOR_TYPES = new Set(['garage']);

function drawDoors(
  ctx: CanvasRenderingContext2D, plan: FloorPlan, scale: number, ox: number, oy: number
) {
  const tol = INT_WALL * 2;
  const rooms = plan.rooms;

  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i], b = rooms[j];
      if (SKIP_DOOR_TYPES.has(a.type) || SKIP_DOOR_TYPES.has(b.type)) continue;

      // Horizontal shared edge (a bottom / b top)
      for (const [top, bot] of [[a, b], [b, a]] as [Room, Room][]) {
        if (Math.abs(top.y + top.height - bot.y) < tol) {
          const ol = Math.max(top.x, bot.x);
          const or_ = Math.min(top.x + top.width, bot.x + bot.width);
          if (or_ - ol < 0.5) continue;
          const mid = (ol + or_) / 2;
          const dw  = Math.min(0.85, or_ - ol - 0.1);
          const sx  = ox + (mid - dw / 2) * scale;
          const sy  = oy + (top.y + top.height) * scale;
          const sw  = dw * scale;
          drawDoorH(ctx, sx, sy, sw);
        }
      }

      // Vertical shared edge (a right / b left)
      for (const [left, right] of [[a, b], [b, a]] as [Room, Room][]) {
        if (Math.abs(left.x + left.width - right.x) < tol) {
          const ot = Math.max(left.y, right.y);
          const ob = Math.min(left.y + left.height, right.y + right.height);
          if (ob - ot < 0.5) continue;
          const mid = (ot + ob) / 2;
          const dh  = Math.min(0.85, ob - ot - 0.1);
          const sx  = ox + (left.x + left.width) * scale;
          const sy  = oy + (mid - dh / 2) * scale;
          const sh  = dh * scale;
          drawDoorV(ctx, sx, sy, sh);
        }
      }
    }
  }
}

function drawDoorH(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  ctx.save();
  // Door leaf (thin line)
  ctx.strokeStyle = '#1F2937';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();
  // Swing arc (dashed quarter circle)
  ctx.setLineDash([3, 2]);
  ctx.strokeStyle = '#6B7280';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x, y, w, 0, Math.PI / 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawDoorV(ctx: CanvasRenderingContext2D, x: number, y: number, h: number) {
  ctx.save();
  ctx.strokeStyle = '#1F2937';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.stroke();
  ctx.setLineDash([3, 2]);
  ctx.strokeStyle = '#6B7280';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x, y, h, Math.PI / 2, Math.PI); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// ---- Room labels ----
function drawRoomLabel(
  ctx: CanvasRenderingContext2D, room: Room, scale: number,
  ox: number, oy: number, selected: boolean
) {
  const rx = ox + room.x * scale;
  const ry = oy + room.y * scale;
  const rw = room.width * scale;
  const rh = room.height * scale;

  ctx.save();
  ctx.beginPath(); ctx.rect(rx + 3, ry + 3, rw - 6, rh - 6); ctx.clip();

  const nameSize = Math.max(8, Math.min(12, rw / 8, rh / 4));
  const dimSize  = Math.max(7, Math.min(10, rw / 10, rh / 6));
  const cx_ = rx + rw / 2;
  const cy_ = ry + rh / 2;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Name (UPPERCASE for architectural look)
  ctx.font = `bold ${nameSize}px Arial, sans-serif`;
  ctx.fillStyle = selected ? '#1D4ED8' : '#111827';
  ctx.fillText(room.label.toUpperCase(), cx_, cy_ - dimSize * 0.9);

  // Dimensions
  ctx.font = `${dimSize}px Arial, sans-serif`;
  ctx.fillStyle = selected ? '#3B82F6' : '#6B7280';
  ctx.fillText(`${room.width.toFixed(1)} × ${room.height.toFixed(1)}m`, cx_, cy_ + nameSize * 0.8);

  ctx.restore();
}

// ---- Exterior dimension lines ----
function drawDimensions(
  ctx: CanvasRenderingContext2D, plan: FloorPlan, scale: number,
  ox: number, oy: number, planW: number, planH: number
) {
  const GAP  = 22; // px between plan edge and extension line
  const TICK = 7;
  ctx.save();
  ctx.strokeStyle = '#374151';
  ctx.fillStyle   = '#374151';
  ctx.lineWidth   = 1;
  ctx.font        = '11px Arial, sans-serif';
  ctx.setLineDash([]);

  // Width dimension (below plan)
  const dimY = oy + planH + GAP;
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.beginPath(); ctx.moveTo(ox, oy + planH); ctx.lineTo(ox, dimY + TICK); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ox + planW, oy + planH); ctx.lineTo(ox + planW, dimY + TICK); ctx.stroke();
  // Arrow line
  ctx.beginPath(); ctx.moveTo(ox, dimY); ctx.lineTo(ox + planW, dimY); ctx.stroke();
  drawArrow(ctx, ox, dimY, ox + planW, dimY);
  ctx.fillText(`${plan.width.toFixed(1)} m`, ox + planW / 2, dimY - 3);

  // Depth dimension (right of plan)
  const dimX = ox + planW + GAP;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.beginPath(); ctx.moveTo(ox + planW, oy); ctx.lineTo(dimX + TICK, oy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ox + planW, oy + planH); ctx.lineTo(dimX + TICK, oy + planH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(dimX, oy); ctx.lineTo(dimX, oy + planH); ctx.stroke();
  drawArrow(ctx, dimX, oy, dimX, oy + planH);
  ctx.save();
  ctx.translate(dimX + 14, oy + planH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`${plan.depth.toFixed(1)} m`, 0, 0);
  ctx.restore();

  ctx.restore();
}

function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const size = 6;
  for (const [px, py] of [[x1, y1], [x2, y2]]) {
    const dir = (px === x1 && py === y1) ? ang + Math.PI : ang;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + size * Math.cos(dir + 0.4), py + size * Math.sin(dir + 0.4));
    ctx.lineTo(px + size * Math.cos(dir - 0.4), py + size * Math.sin(dir - 0.4));
    ctx.closePath();
    ctx.fill();
  }
}

// ---- Scale bar ----
function drawScaleBar(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  const len = 5 * scale;
  ctx.save();
  ctx.strokeStyle = '#374151'; ctx.fillStyle = '#374151';
  ctx.lineWidth = 2; ctx.setLineDash([]);
  // Black/white alternating segments (2.5m each)
  for (let i = 0; i < 2; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#1F2937' : '#FFFFFF';
    ctx.fillRect(x + i * len / 2, y - 4, len / 2, 8);
    ctx.strokeRect(x + i * len / 2, y - 4, len / 2, 8);
  }
  ctx.fillStyle = '#374151';
  ctx.font = '10px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('0', x, y + 6);
  ctx.textAlign = 'center';
  ctx.fillText('2.5m', x + len / 2, y + 6);
  ctx.textAlign = 'right';
  ctx.fillText('5m', x + len, y + 6);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#6B7280'; ctx.font = '9px Arial';
  ctx.fillText('SCALE 1:100', x + len / 2, y + 18);
  ctx.restore();
}

// ---- North arrow ----
function drawNorthArrow(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const r = 22;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF'; ctx.fill();
  ctx.strokeStyle = '#374151'; ctx.lineWidth = 1.5; ctx.stroke();
  // Dark north half
  ctx.fillStyle = '#1F2937';
  ctx.beginPath(); ctx.moveTo(cx, cy - r + 5); ctx.lineTo(cx - 5, cy + 3); ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill();
  // Light south half
  ctx.fillStyle = '#D1D5DB';
  ctx.beginPath(); ctx.moveTo(cx, cy - r + 5); ctx.lineTo(cx + 5, cy + 3); ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#9CA3AF'; ctx.lineWidth = 0.5; ctx.stroke();
  ctx.font = 'bold 10px Arial'; ctx.fillStyle = '#1F2937';
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillText('N', cx, cy - r + 3);
  ctx.restore();
}

// ---- Title block ----
function drawTitleBlock(
  ctx: CanvasRenderingContext2D, plan: FloorPlan,
  x: number, y: number, w: number, h: number
) {
  // Background
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(x, y, w, h);

  // Outer border
  ctx.strokeStyle = '#1F2937';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.strokeRect(x, y, w, h);

  // Column dividers
  const c1 = x + w * 0.44;  // end of left column
  const c2 = x + w * 0.70;  // end of centre column
  const c3 = x + w * 0.81;  // label | value split for right column
  line(ctx, c1, y, c1, y + h, 1, '#374151');
  line(ctx, c2, y, c2, y + h, 1, '#374151');
  line(ctx, c3, y, c3, y + h, 0.8, '#9CA3AF');

  // Row dividers in right column
  const rh = h / 3;
  line(ctx, c1, y + rh,     x + w, y + rh,     0.8, '#9CA3AF');
  line(ctx, c1, y + rh * 2, x + w, y + rh * 2, 0.8, '#9CA3AF');

  // --- Left column: company + project ---
  ctx.textBaseline = 'middle'; ctx.setLineDash([]);

  ctx.font = 'bold 15px Arial'; ctx.fillStyle = '#0284C7'; ctx.textAlign = 'left';
  ctx.fillText('Blueprint AI', x + 12, y + h * 0.22);

  ctx.font = 'bold 11px Arial'; ctx.fillStyle = '#111827';
  ctx.fillText(plan.name || 'Concept Floor Plan', x + 12, y + h * 0.50);

  ctx.font = '9px Arial'; ctx.fillStyle = '#9CA3AF';
  ctx.fillText('CONCEPT ONLY — NOT FOR CONSTRUCTION', x + 12, y + h * 0.78);

  // --- Centre column: drawing title ---
  const midC = (c1 + c2) / 2;
  ctx.font = 'bold 13px Arial'; ctx.fillStyle = '#111827'; ctx.textAlign = 'center';
  ctx.fillText('FLOOR PLAN', midC, y + h * 0.30);
  ctx.font = '10px Arial'; ctx.fillStyle = '#374151';
  ctx.fillText(`${plan.width.toFixed(1)}m × ${plan.depth.toFixed(1)}m`, midC, y + h * 0.56);
  ctx.font = '9px Arial'; ctx.fillStyle = '#6B7280';
  ctx.fillText(`Total Area: ${plan.totalArea} m²`, midC, y + h * 0.78);

  // --- Right column: 3 info rows ---
  const today = new Date().toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
  const rows = [
    { label: 'DRAWN BY', value: 'Blueprint AI' },
    { label: 'DATE',     value: today },
    { label: 'SCALE',   value: '1 : 100' },
  ];
  for (let i = 0; i < rows.length; i++) {
    const ry_ = y + rh * i;
    ctx.font = 'bold 8px Arial'; ctx.fillStyle = '#9CA3AF'; ctx.textAlign = 'center';
    ctx.fillText(rows[i].label, (c1 + c3) / 2, ry_ + rh * 0.35);
    ctx.font = '10px Arial'; ctx.fillStyle = '#111827';
    ctx.fillText(rows[i].value, (c3 + x + w) / 2, ry_ + rh * 0.68);
  }
}

// ---- Sheet border (double-line) ----
function drawSheetBorder(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number
) {
  ctx.save();
  ctx.setLineDash([]);
  // Outer line (thick)
  ctx.strokeStyle = '#1F2937'; ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  // Inner line (thin, 6px inset)
  const inset = 6;
  ctx.strokeStyle = '#374151'; ctx.lineWidth = 0.8;
  ctx.strokeRect(x + inset, y + inset, w - inset * 2, h - inset * 2);
  ctx.restore();
}

function line(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  lw: number, color: string
) {
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.restore();
}
