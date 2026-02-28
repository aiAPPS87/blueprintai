// ============================================================
// Blueprint AI — Server-side JPG Renderer
// Uses Canvas API (node-canvas compatible) to render floor plans
// ============================================================

import { FloorPlan, Room, ROOM_COLORS } from '@/types/plan';

// Pixels per meter at target resolution
const PPM = 80;
const PADDING = 120;
const TITLE_HEIGHT = 160;
const FONT_FAMILY = 'Arial, sans-serif';

export interface RenderOptions {
  watermark?: boolean;
  projectName?: string;
  width?: number;
}

// ============================================================
// Client-side canvas renderer (returns data URL)
// ============================================================

export function renderFloorPlanToCanvas(
  plan: FloorPlan,
  canvas: HTMLCanvasElement,
  options: RenderOptions = {}
): void {
  const { watermark = false, projectName } = options;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const scale = PPM;
  const canvasW = plan.width * scale + PADDING * 2;
  const canvasH = plan.depth * scale + PADDING * 2 + TITLE_HEIGHT;

  canvas.width = Math.max(canvasW, 2480);
  canvas.height = Math.max(canvasH, 1754);

  // Scale factor to fill canvas
  const scaleX = (canvas.width - PADDING * 2) / (plan.width * scale);
  const scaleY = (canvas.height - PADDING * 2 - TITLE_HEIGHT) / (plan.depth * scale);
  const sf = Math.min(scaleX, scaleY, 1.5) * scale;

  // Clear background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw grid
  drawGrid(ctx, plan, sf, PADDING);

  // Draw rooms
  for (const room of plan.rooms) {
    drawRoom(ctx, room, sf, PADDING, plan.depth);
  }

  // Draw exterior boundary
  drawExteriorBoundary(ctx, plan, sf, PADDING);

  // Draw north arrow
  drawNorthArrow(ctx, canvas.width - 80, 80);

  // Draw scale bar
  drawScaleBar(ctx, PADDING, canvas.height - TITLE_HEIGHT - 40, sf);

  // Draw title block
  drawTitleBlock(ctx, plan, canvas.width, canvas.height, projectName);

  // Watermark
  if (watermark) {
    drawWatermark(ctx, canvas.width, canvas.height);
  }
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  plan: FloorPlan,
  sf: number,
  padding: number
): void {
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([2, 4]);

  for (let x = 0; x <= plan.width; x += 1) {
    ctx.beginPath();
    ctx.moveTo(padding + x * sf, padding);
    ctx.lineTo(padding + x * sf, padding + plan.depth * sf);
    ctx.stroke();
  }
  for (let y = 0; y <= plan.depth; y += 1) {
    ctx.beginPath();
    ctx.moveTo(padding, padding + y * sf);
    ctx.lineTo(padding + plan.width * sf, padding + y * sf);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawRoom(
  ctx: CanvasRenderingContext2D,
  room: Room,
  sf: number,
  padding: number,
  planDepth: number
): void {
  // Flip Y axis (canvas Y goes down, plan Y goes up)
  const cx = padding + room.x * sf;
  const cy = padding + (planDepth - room.y - room.height) * sf;
  const cw = room.width * sf;
  const ch = room.height * sf;

  // Room fill
  ctx.fillStyle = room.color || '#F5F5F5';
  ctx.fillRect(cx, cy, cw, ch);

  // Room border
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx, cy, cw, ch);

  // Room label
  ctx.fillStyle = '#111827';
  ctx.font = `bold ${Math.max(10, sf * 0.25)}px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(room.label, cx + cw / 2, cy + ch / 2 - sf * 0.1);

  // Dimensions
  ctx.font = `${Math.max(8, sf * 0.18)}px ${FONT_FAMILY}`;
  ctx.fillStyle = '#6B7280';
  ctx.fillText(
    `${room.width.toFixed(1)} × ${room.height.toFixed(1)}m`,
    cx + cw / 2,
    cy + ch / 2 + sf * 0.12
  );
}

function drawExteriorBoundary(
  ctx: CanvasRenderingContext2D,
  plan: FloorPlan,
  sf: number,
  padding: number
): void {
  ctx.strokeStyle = '#1F2937';
  ctx.lineWidth = 3;
  ctx.strokeRect(padding, padding, plan.width * sf, plan.depth * sf);
}

function drawNorthArrow(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.translate(x, y);

  // Circle
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, Math.PI * 2);
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Arrow
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(-8, 10);
  ctx.lineTo(0, 5);
  ctx.lineTo(8, 10);
  ctx.closePath();
  ctx.fillStyle = '#1F2937';
  ctx.fill();

  // N label
  ctx.fillStyle = '#1F2937';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('N', 0, -22);

  ctx.restore();
}

function drawScaleBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sf: number
): void {
  const barLength = sf * 5; // 5 meters
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 2;

  // Bar
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + barLength, y);
  ctx.stroke();

  // Ticks
  for (let i = 0; i <= 5; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * sf, y - 5);
    ctx.lineTo(x + i * sf, y + 5);
    ctx.stroke();
  }

  // Labels
  ctx.fillStyle = '#374151';
  ctx.font = '11px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('0', x, y + 18);
  ctx.fillText('5m', x + barLength, y + 18);
  ctx.fillText('Scale 1:100', x + barLength / 2, y + 30);
}

function drawTitleBlock(
  ctx: CanvasRenderingContext2D,
  plan: FloorPlan,
  canvasW: number,
  canvasH: number,
  projectName?: string
): void {
  const tbY = canvasH - TITLE_HEIGHT;
  const today = new Date().toLocaleDateString('en-AU');

  // Background
  ctx.fillStyle = '#F9FAFB';
  ctx.fillRect(0, tbY, canvasW, TITLE_HEIGHT);

  // Top border
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, tbY);
  ctx.lineTo(canvasW, tbY);
  ctx.stroke();

  // Logo / Title
  ctx.fillStyle = '#0284C7';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Blueprint AI', 40, tbY + 20);

  // Plan name
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(projectName || plan.name, canvasW / 2, tbY + 20);

  // Details row
  ctx.font = '14px Arial';
  ctx.fillStyle = '#6B7280';
  ctx.fillText(
    `Total Area: ${plan.totalArea}m²  |  ${plan.width}m × ${plan.depth}m  |  Scale 1:100  |  Date: ${today}`,
    canvasW / 2,
    tbY + 60
  );

  // Disclaimer
  ctx.font = '11px Arial';
  ctx.fillStyle = '#9CA3AF';
  ctx.fillText(
    'Generated by Blueprint AI — Concept Only. Not for Construction. Verify all dimensions with a licensed architect.',
    canvasW / 2,
    tbY + 100
  );
}

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number
): void {
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#374151';
  ctx.font = 'bold 80px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(canvasW / 2, canvasH / 2);
  ctx.rotate(-Math.PI / 6);
  ctx.fillText('BLUEPRINT AI — FREE PREVIEW', 0, 0);
  ctx.restore();
}

// ============================================================
// Export canvas as JPEG blob
// ============================================================

export function canvasToJpegBlob(canvas: HTMLCanvasElement, quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      },
      'image/jpeg',
      quality
    );
  });
}

export function canvasToDataURL(canvas: HTMLCanvasElement, quality = 0.92): string {
  return canvas.toDataURL('image/jpeg', quality);
}
