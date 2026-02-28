'use client';

// ============================================================
// Blueprint AI — Canvas Editor (pure HTML5 Canvas 2D)
// No react-konva dependency — avoids React 18.3 reconciler issues
// ============================================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FloorPlan, Room, Wall } from '@/types/plan';
import { moveRoom, resizeRoom } from '@/lib/floorPlanEngine';

const BASE_PPM = 60;
const GRID_COLOR = '#E5E7EB';
const EXT_WALL_COLOR = '#1F2937';
const INT_WALL_COLOR = '#6B7280';
const SELECTED_COLOR = '#0284C7';
const FONT = '500 13px Inter, Arial, sans-serif';
const FONT_DIM = '400 10px Inter, Arial, sans-serif';

interface CanvasEditorProps {
  plan: FloorPlan | null;
  onPlanChange: (plan: FloorPlan) => void;
  selectedRoomId: string | null;
  onSelectRoom: (id: string | null) => void;
  showGrid?: boolean;
}

function mToPx(m: number, scale: number) { return m * scale; }
function pxToM(px: number, scale: number) { return px / scale; }

// ============================================================
// Main Component
// ============================================================

export default function CanvasEditor({
  plan,
  onPlanChange,
  selectedRoomId,
  onSelectRoom,
  showGrid = true,
}: CanvasEditorProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(BASE_PPM);
  const [offset, setOffset] = useState({ x: 60, y: 60 });
  const [size, setSize] = useState({ w: 800, h: 600 });

  // drag-room state
  const dragging = useRef<{ roomId: string; startMX: number; startMY: number; startRX: number; startRY: number } | null>(null);
  // pan state
  const panning = useRef<{ lastX: number; lastY: number } | null>(null);

  // ---- Resize observer ----
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.offsetWidth, h: el.offsetHeight });
    });
    ro.observe(el);
    setSize({ w: el.offsetWidth, h: el.offsetHeight });
    return () => ro.disconnect();
  }, []);

  // ---- Auto-fit when plan first arrives ----
  useEffect(() => {
    if (!plan || !wrapRef.current) return;
    const margin = 80;
    const sx = (wrapRef.current.offsetWidth - margin * 2) / (plan.width * BASE_PPM);
    const sy = (wrapRef.current.offsetHeight - margin * 2) / (plan.depth * BASE_PPM);
    setScale(Math.min(sx, sy, 1.5) * BASE_PPM);
    setOffset({ x: margin, y: margin });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.id]);

  // ---- Draw ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, size.w, size.h);
    ctx.fillStyle = '#F3F4F6';
    ctx.fillRect(0, 0, size.w, size.h);

    if (!plan) {
      drawEmpty(ctx, size.w, size.h);
      return;
    }

    const planW = mToPx(plan.width, scale);
    const planH = mToPx(plan.depth, scale);
    const ox = offset.x;
    const oy = offset.y;

    // Grid
    if (showGrid) drawGrid(ctx, ox, oy, planW, planH, scale, size.w, size.h);

    // House shadow + white fill
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#fff';
    ctx.fillRect(ox, oy, planW, planH);
    ctx.restore();

    // Rooms
    for (const room of plan.rooms) {
      drawRoom(ctx, room, scale, plan.depth, ox, oy, room.id === selectedRoomId);
    }

    // Interior walls
    for (const wall of plan.walls.filter(w => w.type === 'interior')) {
      drawWall(ctx, wall, scale, plan.depth, ox, oy, INT_WALL_COLOR);
    }

    // Exterior border
    ctx.strokeStyle = EXT_WALL_COLOR;
    ctx.lineWidth = 3;
    ctx.strokeRect(ox, oy, planW, planH);

    // North arrow
    drawNorthArrow(ctx, size.w - 55, 55);

    // Scale bar
    drawScaleBar(ctx, ox, oy + planH + 24, scale);

  }, [plan, scale, offset, size, showGrid, selectedRoomId]);

  // ---- Hit-test: which room did the pointer land in? ----
  const hitRoom = useCallback((cx: number, cy: number): Room | null => {
    if (!plan) return null;
    const ox = offset.x, oy = offset.y;
    for (let i = plan.rooms.length - 1; i >= 0; i--) {
      const r = plan.rooms[i];
      const rx = ox + mToPx(r.x, scale);
      const ry = oy + mToPx(plan.depth - r.y - r.height, scale);
      const rw = mToPx(r.width, scale);
      const rh = mToPx(r.height, scale);
      if (cx >= rx && cx <= rx + rw && cy >= ry && cy <= ry + rh) return r;
    }
    return null;
  }, [plan, offset, scale]);

  // ---- Pointer events ----
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    // Middle-button or Alt+left = pan
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      panning.current = { lastX: e.clientX, lastY: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    const room = hitRoom(cx, cy);
    if (room) {
      onSelectRoom(room.id);
      dragging.current = {
        roomId: room.id,
        startMX: e.clientX,
        startMY: e.clientY,
        startRX: room.x,
        startRY: room.y,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    } else {
      onSelectRoom(null);
    }
  }, [hitRoom, onSelectRoom]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    // Pan
    if (panning.current) {
      const dx = e.clientX - panning.current.lastX;
      const dy = e.clientY - panning.current.lastY;
      panning.current = { lastX: e.clientX, lastY: e.clientY };
      setOffset(o => ({ x: o.x + dx, y: o.y + dy }));
      return;
    }
    // Drag room
    if (dragging.current && plan) {
      const dx = pxToM(e.clientX - dragging.current.startMX, scale);
      const dy = pxToM(dragging.current.startMY - e.clientY, scale); // Y flip
      const newX = dragging.current.startRX + dx;
      const newY = dragging.current.startRY + dy;
      onPlanChange(moveRoom(plan, dragging.current.roomId, newX, newY));
    }
  }, [plan, scale, onPlanChange]);

  const onPointerUp = useCallback(() => {
    dragging.current = null;
    panning.current = null;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setScale(s => Math.max(20, Math.min(200, s * (e.deltaY > 0 ? 0.9 : 1.1))));
  }, []);

  const handleFit = () => {
    if (!plan || !wrapRef.current) return;
    const margin = 80;
    const sx = (wrapRef.current.offsetWidth - margin * 2) / (plan.width * BASE_PPM);
    const sy = (wrapRef.current.offsetHeight - margin * 2) / (plan.depth * BASE_PPM);
    setScale(Math.min(sx, sy) * BASE_PPM);
    setOffset({ x: margin, y: margin });
  };

  const selectedRoom = plan?.rooms.find(r => r.id === selectedRoomId) ?? null;

  return (
    <div ref={wrapRef} className="flex-1 relative overflow-hidden bg-gray-100 select-none">
      <canvas
        ref={canvasRef}
        style={{ display: 'block', cursor: panning.current ? 'grabbing' : 'default' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
      />

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col bg-white rounded-lg shadow border border-gray-200 overflow-hidden text-gray-600">
        <button onClick={() => setScale(s => Math.min(200, s * 1.2))} className="px-3 py-2 hover:bg-gray-50 font-mono text-lg leading-none">+</button>
        <div className="px-3 py-1 text-xs text-center font-mono border-y border-gray-100 text-gray-500">
          {Math.round((scale / BASE_PPM) * 100)}%
        </div>
        <button onClick={() => setScale(s => Math.max(20, s * 0.8))} className="px-3 py-2 hover:bg-gray-50 font-mono text-lg leading-none">−</button>
        <button onClick={handleFit} className="px-3 py-1.5 text-xs hover:bg-gray-50 border-t border-gray-100">Fit</button>
      </div>

      {/* Selected room tooltip */}
      {selectedRoom && (
        <div className="absolute top-3 left-3 bg-white rounded-lg shadow border border-gray-200 px-3 py-2 text-sm pointer-events-none">
          <p className="font-semibold text-gray-800">{selectedRoom.label}</p>
          <p className="text-gray-500">
            {selectedRoom.width.toFixed(1)}m × {selectedRoom.height.toFixed(1)}m = {(selectedRoom.width * selectedRoom.height).toFixed(1)}m²
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
  ctx.fillText('No floor plan yet', w / 2, h / 2 - 12);
  ctx.font = '400 13px Inter, Arial, sans-serif';
  ctx.fillStyle = '#D1D5DB';
  ctx.fillText('Configure your house in the left panel and click Generate', w / 2, h / 2 + 16);
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  ox: number, oy: number,
  planW: number, planH: number,
  scale: number,
  stageW: number, stageH: number
) {
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 0.5;
  const step = mToPx(1, scale);
  for (let x = 0; x <= planW + 0.1; x += step) {
    ctx.beginPath();
    ctx.moveTo(ox + x, 0);
    ctx.lineTo(ox + x, stageH);
    ctx.stroke();
  }
  for (let y = 0; y <= planH + 0.1; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, oy + y);
    ctx.lineTo(stageW, oy + y);
    ctx.stroke();
  }
}

function drawRoom(
  ctx: CanvasRenderingContext2D,
  room: Room,
  scale: number,
  planDepth: number,
  ox: number, oy: number,
  selected: boolean
) {
  const x = ox + mToPx(room.x, scale);
  const y = oy + mToPx(planDepth - room.y - room.height, scale);
  const w = mToPx(room.width, scale);
  const h = mToPx(room.height, scale);

  // Fill
  ctx.fillStyle = room.color || '#F5F5F5';
  ctx.fillRect(x, y, w, h);

  // Border
  ctx.strokeStyle = selected ? SELECTED_COLOR : '#9CA3AF';
  ctx.lineWidth = selected ? 2.5 : 1;
  ctx.strokeRect(x, y, w, h);

  // Selection corner handles
  if (selected) {
    ctx.fillStyle = SELECTED_COLOR;
    const hs = 5;
    for (const [hx, hy] of [[x - hs/2, y - hs/2], [x + w - hs/2, y - hs/2], [x - hs/2, y + h - hs/2], [x + w - hs/2, y + h - hs/2]]) {
      ctx.fillRect(hx, hy, hs, hs);
    }
  }

  // Label
  ctx.save();
  ctx.clip(); // keep text inside room
  const labelSize = Math.max(9, Math.min(13, w / 9));
  ctx.font = `600 ${labelSize}px Inter, Arial, sans-serif`;
  ctx.fillStyle = '#111827';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(room.label, x + w / 2, y + h / 2 - labelSize * 0.6);

  const dimSize = Math.max(8, Math.min(11, w / 11));
  ctx.font = `400 ${dimSize}px Inter, Arial, sans-serif`;
  ctx.fillStyle = '#6B7280';
  ctx.fillText(`${room.width.toFixed(1)} × ${room.height.toFixed(1)}m`, x + w / 2, y + h / 2 + dimSize * 0.9);
  ctx.restore();
}

function drawWall(
  ctx: CanvasRenderingContext2D,
  wall: Wall,
  scale: number,
  planDepth: number,
  ox: number, oy: number,
  color: string
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, mToPx(wall.thickness, scale) * 0.4);
  ctx.beginPath();
  ctx.moveTo(ox + mToPx(wall.x1, scale), oy + mToPx(planDepth - wall.y1, scale));
  ctx.lineTo(ox + mToPx(wall.x2, scale), oy + mToPx(planDepth - wall.y2, scale));
  ctx.stroke();
}

function drawNorthArrow(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const r = 22;
  ctx.save();

  // Circle
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Arrow (pointing up = North)
  ctx.fillStyle = '#1F2937';
  ctx.beginPath();
  ctx.moveTo(cx, cy - r + 6);
  ctx.lineTo(cx - 6, cy + 6);
  ctx.lineTo(cx, cy + 2);
  ctx.lineTo(cx + 6, cy + 6);
  ctx.closePath();
  ctx.fill();

  // N label
  ctx.font = 'bold 11px Arial';
  ctx.fillStyle = '#1F2937';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('N', cx, cy - r + 5);

  ctx.restore();
}

function drawScaleBar(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  const len = mToPx(5, scale);
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + len, y);
  ctx.stroke();
  // End ticks
  for (const tx of [x, x + len]) {
    ctx.beginPath();
    ctx.moveTo(tx, y - 4);
    ctx.lineTo(tx, y + 4);
    ctx.stroke();
  }
  ctx.font = '11px Arial';
  ctx.fillStyle = '#374151';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('0', x, y + 6);
  ctx.fillText('5m', x + len, y + 6);
  ctx.fillStyle = '#9CA3AF';
  ctx.font = '10px Arial';
  ctx.fillText('Scale 1:100', x + len / 2, y + 18);
}
