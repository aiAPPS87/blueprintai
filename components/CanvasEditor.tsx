'use client';

// ============================================================
// Blueprint AI — Interactive Canvas Editor (Konva.js)
// ============================================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Group, Line, Arrow } from 'react-konva';
import Konva from 'konva';
import { FloorPlan, Room, Wall } from '@/types/plan';
import { moveRoom, resizeRoom } from '@/lib/floorPlanEngine';

// ---- Constants ----
const BASE_PPM = 60; // pixels per meter (base scale)
const GRID_COLOR = '#E5E7EB';
const EXT_WALL_COLOR = '#1F2937';
const INT_WALL_COLOR = '#6B7280';
const SELECTED_STROKE = '#0284C7';
const LABEL_FONT = 'Arial';

interface CanvasEditorProps {
  plan: FloorPlan | null;
  onPlanChange: (plan: FloorPlan) => void;
  selectedRoomId: string | null;
  onSelectRoom: (id: string | null) => void;
  showGrid?: boolean;
}

// ---- Utility ----
function mToPx(meters: number, scale: number): number {
  return meters * scale;
}

function pxToM(px: number, scale: number): number {
  return px / scale;
}

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(BASE_PPM);
  const [offset, setOffset] = useState({ x: 60, y: 60 });
  const [isDraggingStage, setIsDraggingStage] = useState(false);
  const [lastPointer, setLastPointer] = useState<{ x: number; y: number } | null>(null);

  // Responsive stage sizing
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Auto-fit plan to canvas when plan changes
  useEffect(() => {
    if (!plan || !containerRef.current) return;
    const margin = 80;
    const availW = containerRef.current.offsetWidth - margin * 2;
    const availH = containerRef.current.offsetHeight - margin * 2;
    const scaleX = availW / (plan.width * BASE_PPM);
    const scaleY = availH / (plan.depth * BASE_PPM);
    const newScale = Math.min(scaleX, scaleY, 1.5) * BASE_PPM;
    setScale(newScale);
    setOffset({ x: margin, y: margin });
  }, [plan?.id]); // only re-fit when plan identity changes

  // ---- Wheel zoom ----
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.max(20, Math.min(200, s * delta)));
  }, []);

  // ---- Pan ----
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsDraggingStage(true);
      setLastPointer({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingStage || !lastPointer) return;
    const dx = e.clientX - lastPointer.x;
    const dy = e.clientY - lastPointer.y;
    setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
    setLastPointer({ x: e.clientX, y: e.clientY });
  }, [isDraggingStage, lastPointer]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingStage(false);
    setLastPointer(null);
  }, []);

  if (!plan) {
    return (
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center bg-gray-50 text-gray-400"
        style={{ minHeight: 400 }}
      >
        <div className="text-center">
          <svg
            className="mx-auto mb-4 w-16 h-16 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"
            />
          </svg>
          <p className="text-lg font-medium text-gray-400">No floor plan yet</p>
          <p className="text-sm text-gray-300 mt-1">
            Describe your house in the chat panel to get started
          </p>
        </div>
      </div>
    );
  }

  const planW = mToPx(plan.width, scale);
  const planH = mToPx(plan.depth, scale);

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-gray-100 select-none"
      style={{ cursor: isDraggingStage ? 'grabbing' : 'default' }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        onClick={(e) => {
          if (e.target === e.target.getStage()) onSelectRoom(null);
        }}
      >
        {/* Grid Layer */}
        {showGrid && (
          <Layer>
            <GridLines
              offsetX={offset.x}
              offsetY={offset.y}
              planW={planW}
              planH={planH}
              scale={scale}
              stageW={stageSize.width}
              stageH={stageSize.height}
            />
          </Layer>
        )}

        {/* Plan Layer */}
        <Layer x={offset.x} y={offset.y}>
          {/* House boundary */}
          <Rect
            x={0}
            y={0}
            width={planW}
            height={planH}
            fill="#FFFFFF"
            stroke={EXT_WALL_COLOR}
            strokeWidth={3}
            shadowColor="rgba(0,0,0,0.15)"
            shadowBlur={12}
            shadowOffset={{ x: 2, y: 2 }}
          />

          {/* Rooms */}
          {plan.rooms.map((room) => (
            <RoomBlock
              key={room.id}
              room={room}
              scale={scale}
              planDepth={plan.depth}
              isSelected={selectedRoomId === room.id}
              onSelect={() => onSelectRoom(room.id)}
              onDragEnd={(x, y) => {
                const updated = moveRoom(plan, room.id, x, y);
                onPlanChange(updated);
              }}
              onResizeEnd={(w, h) => {
                const updated = resizeRoom(plan, room.id, w, h);
                onPlanChange(updated);
              }}
            />
          ))}

          {/* Interior walls */}
          {plan.walls
            .filter((w) => w.type === 'interior')
            .map((wall) => (
              <WallLine
                key={wall.id}
                wall={wall}
                scale={scale}
                planDepth={plan.depth}
                color={INT_WALL_COLOR}
              />
            ))}
        </Layer>

        {/* Overlay Layer (North arrow, scale bar) */}
        <Layer>
          <NorthArrow x={stageSize.width - 70} y={70} />
          <ScaleBar x={offset.x} y={offset.y + planH + 20} scale={scale} />
        </Layer>
      </Stage>

      {/* Zoom controls */}
      <ZoomControls
        onZoomIn={() => setScale((s) => Math.min(200, s * 1.2))}
        onZoomOut={() => setScale((s) => Math.max(20, s * 0.8))}
        onFit={() => {
          if (!containerRef.current || !plan) return;
          const margin = 80;
          const availW = containerRef.current.offsetWidth - margin * 2;
          const availH = containerRef.current.offsetHeight - margin * 2;
          const sx = availW / (plan.width * BASE_PPM);
          const sy = availH / (plan.depth * BASE_PPM);
          setScale(Math.min(sx, sy) * BASE_PPM);
          setOffset({ x: margin, y: margin });
        }}
        scale={scale}
      />

      {/* Selected room info */}
      {selectedRoomId && (
        <SelectedRoomInfo
          room={plan.rooms.find((r) => r.id === selectedRoomId) || null}
        />
      )}
    </div>
  );
}

// ============================================================
// Room Block
// ============================================================

interface RoomBlockProps {
  room: Room;
  scale: number;
  planDepth: number;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  onResizeEnd: (w: number, h: number) => void;
}

function RoomBlock({
  room,
  scale,
  planDepth,
  isSelected,
  onSelect,
  onDragEnd,
}: RoomBlockProps) {
  const x = mToPx(room.x, scale);
  const y = mToPx(planDepth - room.y - room.height, scale); // flip Y
  const w = mToPx(room.width, scale);
  const h = mToPx(room.height, scale);

  const labelFontSize = Math.max(9, Math.min(14, w / 8));
  const dimFontSize = Math.max(8, Math.min(11, w / 10));

  return (
    <Group
      x={x}
      y={y}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        const node = e.target;
        const newX = pxToM(node.x(), scale);
        const newY = planDepth - pxToM(node.y(), scale) - room.height;
        onDragEnd(newX, newY);
      }}
    >
      {/* Room fill */}
      <Rect
        width={w}
        height={h}
        fill={room.color}
        stroke={isSelected ? SELECTED_STROKE : '#9CA3AF'}
        strokeWidth={isSelected ? 2.5 : 1}
        cornerRadius={2}
      />

      {/* Room label */}
      <Text
        text={room.label}
        width={w}
        height={h / 2}
        align="center"
        verticalAlign="bottom"
        fontSize={labelFontSize}
        fontStyle="bold"
        fontFamily={LABEL_FONT}
        fill="#111827"
        padding={4}
      />

      {/* Dimensions */}
      <Text
        text={`${room.width.toFixed(1)} × ${room.height.toFixed(1)}m`}
        y={h / 2}
        width={w}
        height={h / 2}
        align="center"
        verticalAlign="top"
        fontSize={dimFontSize}
        fontFamily={LABEL_FONT}
        fill="#6B7280"
        padding={4}
      />

      {/* Selection handles */}
      {isSelected && (
        <>
          <Rect x={-4} y={-4} width={8} height={8} fill={SELECTED_STROKE} cornerRadius={2} />
          <Rect x={w - 4} y={-4} width={8} height={8} fill={SELECTED_STROKE} cornerRadius={2} />
          <Rect x={-4} y={h - 4} width={8} height={8} fill={SELECTED_STROKE} cornerRadius={2} />
          <Rect x={w - 4} y={h - 4} width={8} height={8} fill={SELECTED_STROKE} cornerRadius={2} />
        </>
      )}
    </Group>
  );
}

// ============================================================
// Wall Line
// ============================================================

function WallLine({
  wall,
  scale,
  planDepth,
  color,
}: {
  wall: Wall;
  scale: number;
  planDepth: number;
  color: string;
}) {
  return (
    <Line
      points={[
        mToPx(wall.x1, scale),
        mToPx(planDepth - wall.y1, scale),
        mToPx(wall.x2, scale),
        mToPx(planDepth - wall.y2, scale),
      ]}
      stroke={color}
      strokeWidth={Math.max(1, mToPx(wall.thickness, scale) * 0.5)}
    />
  );
}

// ============================================================
// Grid Lines
// ============================================================

function GridLines({
  offsetX,
  offsetY,
  planW,
  planH,
  scale,
  stageW,
  stageH,
}: {
  offsetX: number;
  offsetY: number;
  planW: number;
  planH: number;
  scale: number;
  stageW: number;
  stageH: number;
}) {
  const lines: React.ReactElement[] = [];
  const step = mToPx(1, scale); // 1m grid

  for (let x = 0; x <= planW + 0.5; x += step) {
    lines.push(
      <Line
        key={`vg-${x}`}
        points={[offsetX + x, 0, offsetX + x, stageH]}
        stroke={GRID_COLOR}
        strokeWidth={0.5}
      />
    );
  }
  for (let y = 0; y <= planH + 0.5; y += step) {
    lines.push(
      <Line
        key={`hg-${y}`}
        points={[0, offsetY + y, stageW, offsetY + y]}
        stroke={GRID_COLOR}
        strokeWidth={0.5}
      />
    );
  }
  return <>{lines}</>;
}

// ============================================================
// North Arrow
// ============================================================

function NorthArrow({ x, y }: { x: number; y: number }) {
  return (
    <Group x={x} y={y}>
      {/* Circle */}
      <Rect
        x={-25}
        y={-25}
        width={50}
        height={50}
        cornerRadius={25}
        stroke="#374151"
        strokeWidth={1.5}
        fill="white"
      />
      {/* Arrow */}
      <Arrow
        points={[0, 18, 0, -18]}
        pointerLength={8}
        pointerWidth={8}
        fill="#1F2937"
        stroke="#1F2937"
        strokeWidth={2}
      />
      {/* N */}
      <Text
        text="N"
        x={-8}
        y={-28}
        fontSize={11}
        fontStyle="bold"
        fontFamily="Arial"
        fill="#1F2937"
      />
    </Group>
  );
}

// ============================================================
// Scale Bar
// ============================================================

function ScaleBar({ x, y, scale }: { x: number; y: number; scale: number }) {
  const fiveM = mToPx(5, scale);
  return (
    <Group x={x} y={y}>
      <Line
        points={[0, 0, fiveM, 0]}
        stroke="#374151"
        strokeWidth={2}
      />
      <Line points={[0, -5, 0, 5]} stroke="#374151" strokeWidth={1.5} />
      <Line points={[fiveM, -5, fiveM, 5]} stroke="#374151" strokeWidth={1.5} />
      <Text text="0" x={-4} y={8} fontSize={10} fill="#374151" fontFamily="Arial" />
      <Text text="5m" x={fiveM - 8} y={8} fontSize={10} fill="#374151" fontFamily="Arial" />
      <Text
        text="1:100"
        x={fiveM / 2 - 12}
        y={20}
        fontSize={9}
        fill="#6B7280"
        fontFamily="Arial"
      />
    </Group>
  );
}

// ============================================================
// Zoom Controls (HTML overlay)
// ============================================================

function ZoomControls({
  onZoomIn,
  onZoomOut,
  onFit,
  scale,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  scale: number;
}) {
  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-1 bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      <button
        onClick={onZoomIn}
        className="px-3 py-2 text-lg text-gray-600 hover:bg-gray-50 font-mono leading-none"
        title="Zoom in"
      >
        +
      </button>
      <div className="px-3 py-1 text-xs text-center text-gray-500 font-mono border-y border-gray-100">
        {Math.round((scale / BASE_PPM) * 100)}%
      </div>
      <button
        onClick={onZoomOut}
        className="px-3 py-2 text-lg text-gray-600 hover:bg-gray-50 font-mono leading-none"
        title="Zoom out"
      >
        −
      </button>
      <button
        onClick={onFit}
        className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 border-t border-gray-100"
        title="Fit to screen"
      >
        Fit
      </button>
    </div>
  );
}

// ============================================================
// Selected Room Info Panel
// ============================================================

function SelectedRoomInfo({ room }: { room: Room | null }) {
  if (!room) return null;
  return (
    <div className="absolute top-3 left-3 bg-white rounded-lg shadow-md border border-gray-200 px-3 py-2 text-sm">
      <p className="font-semibold text-gray-800">{room.label}</p>
      <p className="text-gray-500">
        {room.width.toFixed(1)}m × {room.height.toFixed(1)}m ={' '}
        {(room.width * room.height).toFixed(1)}m²
      </p>
      <p className="text-xs text-gray-400 mt-0.5">Drag to move · Alt+drag to pan</p>
    </div>
  );
}
