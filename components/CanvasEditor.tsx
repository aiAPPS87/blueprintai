'use client';

// ============================================================
// Blueprint AI — Canvas Editor (pure HTML5 Canvas 2D)
// Architectural rendering: "black house, carved rooms"
// Y increases downward (matches layout engine convention)
// ============================================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FloorPlan, Room } from '@/types/plan';
import { moveRoom, EXT_WALL, INT_WALL } from '@/lib/floorPlanEngine';

const BASE_PPM = 50; // pixels per meter at 100%

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
  const [offset, setOffset] = useState({ x: 80, y: 60 });
  const [size, setSize] = useState({ w: 800, h: 600 });

  const dragging = useRef<{ roomId: string; startMX: number; startMY: number; startRX: number; startRY: number } | null>(null);
  const panning = useRef<{ lastX: number; lastY: number } | null>(null);

  // Resize observer
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.offsetWidth, h: el.offsetHeight }));
    ro.observe(el);
    setSize({ w: el.offsetWidth, h: el.offsetHeight });
    return () => ro.disconnect();
  }, []);

  // Auto-fit when plan first arrives
  useEffect(() => {
    if (!plan || !wrapRef.current) return;
    const margin = 100;
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

    if (!plan) { drawEmpty(ctx, size.w, size.h); return; }

    const planW = plan.width * scale;
    const planH = plan.depth * scale;
    const ox = offset.x;
    const oy = offset.y;

    // Optional grid
    if (showGrid) drawGrid(ctx, ox, oy, planW, planH, scale);

    // Drop shadow on house
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.22)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#1F2937'; // wall color
    ctx.fillRect(ox, oy, planW, planH);
    ctx.restore();

    // House footprint (walls = dark fill, rooms carved out)
    ctx.fillStyle = '#1F2937';
    ctx.fillRect(ox, oy, planW, planH);

    // Carve out each room interior
    for (const room of plan.rooms) {
      const rx = ox + room.x * scale;
      const ry = oy + room.y * scale;
      const rw = room.width * scale;
      const rh = room.height * scale;

      ctx.fillStyle = room.color || '#F5F5F5';
      ctx.fillRect(rx, ry, rw, rh);

      // Selected room highlight
      if (room.id === selectedRoomId) {
        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
        ctx.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2);
      }
    }

    // Door symbols between adjacent rooms
    drawDoors(ctx, plan, scale, ox, oy);

    // Room labels
    for (const room of plan.rooms) {
      drawRoomLabel(ctx, room, scale, ox, oy, room.id === selectedRoomId);
    }

    // Exterior dimension lines
    drawDimensions(ctx, plan, scale, ox, oy);

    // North arrow
    drawNorthArrow(ctx, ox + planW + 50, oy + 44);

    // Scale bar
    drawScaleBar(ctx, ox, oy + planH + 36, scale);

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
      const dy = (e.clientY - dragging.current.startMY) / scale; // Y-down, no flip
      onPlanChange(moveRoom(plan, dragging.current.roomId, dragging.current.startRX + dx, dragging.current.startRY + dy));
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
    const margin = 100;
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
  ctx.fillText('Configure your house in the left panel and click Generate', w / 2, h / 2 + 14);
}

function drawGrid(ctx: CanvasRenderingContext2D, ox: number, oy: number, planW: number, planH: number, scale: number) {
  ctx.strokeStyle = 'rgba(156,163,175,0.4)';
  ctx.lineWidth = 0.5;
  const step = 1 * scale; // 1m grid
  for (let x = 0; x <= planW + 0.5; x += step) {
    ctx.beginPath(); ctx.moveTo(ox + x, oy); ctx.lineTo(ox + x, oy + planH); ctx.stroke();
  }
  for (let y = 0; y <= planH + 0.5; y += step) {
    ctx.beginPath(); ctx.moveTo(ox, oy + y); ctx.lineTo(ox + planW, oy + y); ctx.stroke();
  }
}

function drawRoomLabel(
  ctx: CanvasRenderingContext2D, room: Room, scale: number, ox: number, oy: number, selected: boolean
) {
  const rx = ox + room.x * scale;
  const ry = oy + room.y * scale;
  const rw = room.width * scale;
  const rh = room.height * scale;

  ctx.save();
  ctx.beginPath();
  ctx.rect(rx + 2, ry + 2, rw - 4, rh - 4);
  ctx.clip();

  const nameSize = Math.max(8, Math.min(13, rw / 8));
  const dimSize = Math.max(7, Math.min(10, rw / 10));
  const centerX = rx + rw / 2;
  const centerY = ry + rh / 2;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Room name
  ctx.font = `600 ${nameSize}px Inter, Arial, sans-serif`;
  ctx.fillStyle = selected ? '#1D4ED8' : '#111827';
  ctx.fillText(room.label, centerX, centerY - dimSize * 0.9);

  // Dimensions
  ctx.font = `400 ${dimSize}px Inter, Arial, sans-serif`;
  ctx.fillStyle = selected ? '#3B82F6' : '#6B7280';
  ctx.fillText(`${room.width.toFixed(1)} × ${room.height.toFixed(1)}m`, centerX, centerY + nameSize * 0.8);

  ctx.restore();
}

// ============================================================
// Door symbols between adjacent rooms
// ============================================================

function drawDoors(ctx: CanvasRenderingContext2D, plan: FloorPlan, scale: number, ox: number, oy: number) {
  const tol = INT_WALL * 1.5; // tolerance for adjacency detection
  const rooms = plan.rooms;

  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i];
      const b = rooms[j];

      // Skip hallway-to-hallway (shouldn't exist) and same type utility spaces
      const skipTypes: string[] = ['garage'];
      if (skipTypes.includes(a.type) || skipTypes.includes(b.type)) continue;

      // Horizontal shared edge: a's bottom = b's top (or vice versa)
      const aBottom = a.y + a.height;
      const bBottom = b.y + b.height;

      if (Math.abs(aBottom - b.y) < tol || Math.abs(bBottom - a.y) < tol) {
        // Horizontal edge shared
        const topRoom = aBottom < b.y + tol ? a : b;
        const botRoom = topRoom === a ? b : a;
        const sharedY = topRoom.y + topRoom.height;

        // Overlap in X
        const overlapLeft = Math.max(topRoom.x, botRoom.x);
        const overlapRight = Math.min(topRoom.x + topRoom.width, botRoom.x + botRoom.width);
        if (overlapRight - overlapLeft < 0.6) continue;

        const midX = (overlapLeft + overlapRight) / 2;
        const doorW = Math.min(0.9, overlapRight - overlapLeft - 0.1);
        drawDoorSymbolH(ctx, scale, ox, oy, midX - doorW / 2, sharedY, doorW);
      }

      // Vertical shared edge: a's right = b's left (or vice versa)
      const aRight = a.x + a.width;
      const bRight = b.x + b.width;

      if (Math.abs(aRight - b.x) < tol || Math.abs(bRight - a.x) < tol) {
        const leftRoom = aRight < b.x + tol ? a : b;
        const rightRoom = leftRoom === a ? b : a;
        const sharedX = leftRoom.x + leftRoom.width;

        const overlapTop = Math.max(leftRoom.y, rightRoom.y);
        const overlapBot = Math.min(leftRoom.y + leftRoom.height, rightRoom.y + rightRoom.height);
        if (overlapBot - overlapTop < 0.6) continue;

        const midY = (overlapTop + overlapBot) / 2;
        const doorH = Math.min(0.9, overlapBot - overlapTop - 0.1);
        drawDoorSymbolV(ctx, scale, ox, oy, sharedX, midY - doorH / 2, doorH);
      }
    }
  }
}

function drawDoorSymbolH(
  ctx: CanvasRenderingContext2D, scale: number, ox: number, oy: number,
  doorX: number, wallY: number, doorW: number
) {
  // Gap in wall line, quarter-circle arc showing door swing
  const x = ox + doorX * scale;
  const y = oy + wallY * scale;
  const w = doorW * scale;
  const arc = w; // radius = door width

  ctx.save();
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);

  // Door leaf line
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();

  // Door swing arc (quarter circle)
  ctx.beginPath();
  ctx.arc(x, y, arc, 0, Math.PI / 2);
  ctx.setLineDash([3, 2]);
  ctx.strokeStyle = '#9CA3AF';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

function drawDoorSymbolV(
  ctx: CanvasRenderingContext2D, scale: number, ox: number, oy: number,
  wallX: number, doorY: number, doorH: number
) {
  const x = ox + wallX * scale;
  const y = oy + doorY * scale;
  const h = doorH * scale;

  ctx.save();
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);

  // Door leaf
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + h);
  ctx.stroke();

  // Door swing arc
  ctx.beginPath();
  ctx.arc(x, y, h, Math.PI / 2, Math.PI);
  ctx.setLineDash([3, 2]);
  ctx.strokeStyle = '#9CA3AF';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

// ============================================================
// Exterior dimension lines
// ============================================================

function drawDimensions(
  ctx: CanvasRenderingContext2D, plan: FloorPlan, scale: number, ox: number, oy: number
) {
  const planW = plan.width * scale;
  const planH = plan.depth * scale;
  const DIM_OFFSET = 28;
  const TICK = 6;

  ctx.save();
  ctx.strokeStyle = '#374151';
  ctx.fillStyle = '#374151';
  ctx.lineWidth = 1;
  ctx.font = '11px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.setLineDash([]);

  // Bottom dimension (width)
  const dimY = oy + planH + DIM_OFFSET;
  ctx.beginPath();
  ctx.moveTo(ox, dimY - TICK); ctx.lineTo(ox, dimY + TICK); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ox + planW, dimY - TICK); ctx.lineTo(ox + planW, dimY + TICK); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ox, dimY); ctx.lineTo(ox + planW, dimY); ctx.stroke();
  ctx.fillText(`${plan.width.toFixed(1)}m`, ox + planW / 2, dimY - 10);

  // Right dimension (depth)
  const dimX = ox + planW + DIM_OFFSET;
  ctx.beginPath();
  ctx.moveTo(dimX - TICK, oy); ctx.lineTo(dimX + TICK, oy); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(dimX - TICK, oy + planH); ctx.lineTo(dimX + TICK, oy + planH); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(dimX, oy); ctx.lineTo(dimX, oy + planH); ctx.stroke();

  ctx.save();
  ctx.translate(dimX + 10, oy + planH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${plan.depth.toFixed(1)}m`, 0, 0);
  ctx.restore();

  ctx.restore();
}

// ============================================================
// North arrow
// ============================================================

function drawNorthArrow(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const r = 20;
  ctx.save();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Filled north half (dark)
  ctx.fillStyle = '#1F2937';
  ctx.beginPath();
  ctx.moveTo(cx, cy - r + 5);
  ctx.lineTo(cx - 5, cy + 4);
  ctx.lineTo(cx, cy + 1);
  ctx.closePath();
  ctx.fill();

  // Outline south half (light)
  ctx.fillStyle = '#D1D5DB';
  ctx.beginPath();
  ctx.moveTo(cx, cy - r + 5);
  ctx.lineTo(cx + 5, cy + 4);
  ctx.lineTo(cx, cy + 1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#6B7280';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  ctx.font = 'bold 10px Arial';
  ctx.fillStyle = '#1F2937';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('N', cx, cy - r + 4);

  ctx.restore();
}

// ============================================================
// Scale bar
// ============================================================

function drawScaleBar(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  const len = 5 * scale; // 5m
  ctx.save();
  ctx.strokeStyle = '#374151';
  ctx.fillStyle = '#374151';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);

  // Baseline
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
  // End ticks
  for (const tx of [x, x + len]) {
    ctx.beginPath(); ctx.moveTo(tx, y - 4); ctx.lineTo(tx, y + 4); ctx.stroke();
  }
  // Labels
  ctx.font = '11px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('0', x, y + 6);
  ctx.fillText('5m', x + len, y + 6);
  ctx.fillStyle = '#9CA3AF';
  ctx.font = '10px Arial';
  ctx.fillText('Scale 1:100', x + len / 2, y + 18);
  ctx.restore();
}
