// ============================================================
// Blueprint AI — Architectural JPG Renderer (client-side canvas)
// Matches the CanvasEditor architectural style:
//   • White walls with diagonal hatch
//   • Window symbols, door arcs
//   • Full title block, sheet border
//   • Y increases downward (no Y flip)
// ============================================================

import { FloorPlan, Room } from '@/types/plan';

const PPM     = 96;   // pixels per metre at export resolution
const SHEET_MARGIN = 60;
const HEADING_H    = 50;
const DIM_SPACE    = 70;
const TITLE_H      = 120;
const RIGHT_SPACE  = 110;
const EXT_WALL = 0.2;
const INT_WALL = 0.1;

export interface RenderOptions {
  watermark?: boolean;
  projectName?: string;
}

// ============================================================
// Main render function
// ============================================================

export function renderFloorPlanToCanvas(
  plan: FloorPlan, canvas: HTMLCanvasElement, options: RenderOptions = {}
): void {
  const { watermark = false } = options;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const planW  = plan.width  * PPM;
  const planH  = plan.depth  * PPM;
  const sheetW = planW + RIGHT_SPACE + SHEET_MARGIN * 2;
  const sheetH = HEADING_H + planH + DIM_SPACE + TITLE_H + SHEET_MARGIN * 2;

  canvas.width  = sheetW;
  canvas.height = sheetH;

  const ox = SHEET_MARGIN;
  const oy = SHEET_MARGIN + HEADING_H;

  // Background
  ctx.fillStyle = '#D1D5DB';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Sheet
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, sheetW, sheetH);

  // Grid
  drawGrid(ctx, ox, oy, planW, planH, PPM);

  // House white base
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  buildHousePath(ctx, plan, PPM, ox, oy, planW, planH);
  ctx.fill();

  // Room fills
  for (const r of plan.rooms) {
    ctx.fillStyle = r.color || '#F5F5F5';
    ctx.fillRect(ox + r.x * PPM, oy + r.y * PPM, r.width * PPM, r.height * PPM);
  }

  // Wall hatch
  drawWallHatch(ctx, plan, PPM, ox, oy, planW, planH);

  // Interior walls
  drawInteriorWalls(ctx, plan, PPM, ox, oy);

  // Exterior border
  ctx.strokeStyle = '#111827';
  ctx.lineWidth   = Math.max(4, EXT_WALL * PPM * 0.8);
  ctx.setLineDash([]);
  ctx.beginPath();
  buildHousePath(ctx, plan, PPM, ox, oy, planW, planH);
  ctx.stroke();

  // Windows
  drawWindows(ctx, plan, PPM, ox, oy);

  // Doors
  drawDoors(ctx, plan, PPM, ox, oy);

  // Room labels
  for (const r of plan.rooms) drawRoomLabel(ctx, r, PPM, ox, oy);

  // Heading
  ctx.font = 'bold 18px Arial';
  ctx.fillStyle = '#111827';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FLOOR PLAN', ox + planW / 2, oy - HEADING_H / 2);

  // Dimensions
  drawDimensions(ctx, plan, PPM, ox, oy, planW, planH);

  // Scale bar
  drawScaleBar(ctx, ox, oy + planH + DIM_SPACE - 20, PPM);

  // North arrow
  drawNorthArrow(ctx, ox + planW + RIGHT_SPACE - 40, oy + 50);

  // Title block
  const titleY = oy + planH + DIM_SPACE;
  drawTitleBlock(ctx, plan, 0, titleY, sheetW, TITLE_H);

  // Sheet border
  drawSheetBorder(ctx, 0, 0, sheetW, sheetH);

  // Watermark
  if (watermark) drawWatermark(ctx, sheetW, sheetH);
}

// ============================================================
// Drawing helpers (mirrored from CanvasEditor)
// ============================================================

function drawGrid(ctx: CanvasRenderingContext2D, ox: number, oy: number, planW: number, planH: number, ppm: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(156,163,175,0.3)';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([3, 5]);
  for (let x = 0; x <= planW + 0.5; x += ppm) {
    ctx.beginPath(); ctx.moveTo(ox + x, oy); ctx.lineTo(ox + x, oy + planH); ctx.stroke();
  }
  for (let y = 0; y <= planH + 0.5; y += ppm) {
    ctx.beginPath(); ctx.moveTo(ox, oy + y); ctx.lineTo(ox + planW, oy + y); ctx.stroke();
  }
  ctx.setLineDash([]); ctx.restore();
}

function buildHousePath(
  ctx: CanvasRenderingContext2D, plan: FloorPlan, ppm: number,
  ox: number, oy: number, planW: number, planH: number
) {
  if (plan.garageWingWidth && plan.garageWingDepth) {
    const gW = plan.garageWingWidth * ppm;
    const gH = plan.garageWingDepth * ppm;
    ctx.moveTo(ox,         oy);
    ctx.lineTo(ox + gW,    oy);
    ctx.lineTo(ox + gW,    oy + gH);
    ctx.lineTo(ox + planW, oy + gH);
    ctx.lineTo(ox + planW, oy + planH);
    ctx.lineTo(ox,         oy + planH);
  } else {
    ctx.rect(ox, oy, planW, planH);
  }
  ctx.closePath();
}

function drawWallHatch(
  ctx: CanvasRenderingContext2D, plan: FloorPlan, ppm: number,
  ox: number, oy: number, planW: number, planH: number
) {
  const tile = document.createElement('canvas');
  tile.width = 8; tile.height = 8;
  const tc = tile.getContext('2d')!;
  tc.strokeStyle = '#9CA3AF'; tc.lineWidth = 0.8;
  for (const [x1, y1, x2, y2] of [[-1,8,8,-1],[3.5,8,11.5,-1],[-4.5,8,4.5,-1]] as [number,number,number,number][]) {
    tc.beginPath(); tc.moveTo(x1, y1); tc.lineTo(x2, y2); tc.stroke();
  }
  const pat = ctx.createPattern(tile, 'repeat');
  if (!pat) return;
  ctx.save();
  ctx.beginPath();
  buildHousePath(ctx, plan, ppm, ox, oy, planW, planH);
  for (const r of plan.rooms) ctx.rect(ox + r.x * ppm, oy + r.y * ppm, r.width * ppm, r.height * ppm);
  ctx.clip('evenodd');
  ctx.fillStyle = pat;
  ctx.fillRect(ox, oy, planW, planH);
  ctx.restore();
}

function drawInteriorWalls(ctx: CanvasRenderingContext2D, plan: FloorPlan, ppm: number, ox: number, oy: number) {
  ctx.save();
  ctx.strokeStyle = '#374151'; ctx.lineWidth = 2; ctx.setLineDash([]);
  const drawn = new Set<string>();
  for (const r of plan.rooms) {
    const rx = ox + r.x * ppm, ry = oy + r.y * ppm;
    const rw = r.width * ppm,  rh = r.height * ppm;
    const edges = [[rx,ry,rx+rw,ry],[rx+rw,ry,rx+rw,ry+rh],[rx,ry+rh,rx+rw,ry+rh],[rx,ry,rx,ry+rh]];
    for (const [x1,y1,x2,y2] of edges) {
      const k = `${Math.round(x1)},${Math.round(y1)},${Math.round(x2)},${Math.round(y2)}`;
      const kr = `${Math.round(x2)},${Math.round(y2)},${Math.round(x1)},${Math.round(y1)}`;
      if (drawn.has(k) || drawn.has(kr)) continue;
      drawn.add(k);
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    }
  }
  ctx.restore();
}

const WIN_TYPES = new Set(['living','dining','kitchen','bedroom','master_bedroom','study']);

function drawWindows(ctx: CanvasRenderingContext2D, plan: FloorPlan, ppm: number, ox: number, oy: number) {
  const extW = EXT_WALL * ppm;
  for (const r of plan.rooms) {
    if (!WIN_TYPES.has(r.type)) continue;
    const rx = ox + r.x * ppm, ry = oy + r.y * ppm;
    const rw = r.width * ppm,  rh = r.height * ppm;
    const wW = Math.min(rw * 0.5, 90), wH = Math.min(rh * 0.5, 90);
    if (Math.abs(r.y - EXT_WALL) < 0.12)
      drawWinH(ctx, rx + (rw - wW) / 2, oy, wW, extW);
    if (Math.abs(r.y + r.height - (plan.depth - EXT_WALL)) < 0.12)
      drawWinH(ctx, rx + (rw - wW) / 2, oy + plan.depth * ppm - extW, wW, extW);
    if (Math.abs(r.x - EXT_WALL) < 0.12)
      drawWinV(ctx, ox, ry + (rh - wH) / 2, extW, wH);
    if (Math.abs(r.x + r.width - (plan.width - EXT_WALL)) < 0.12)
      drawWinV(ctx, ox + plan.width * ppm - extW, ry + (rh - wH) / 2, extW, wH);
  }
}

function drawWinH(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, t: number) {
  ctx.save();
  ctx.fillStyle = '#BFDBFE'; ctx.fillRect(x, y, w, t);
  ctx.strokeStyle = '#374151'; ctx.lineWidth = 1; ctx.setLineDash([]);
  for (const f of [0.15, 0.5, 0.85]) { ctx.beginPath(); ctx.moveTo(x, y + t*f); ctx.lineTo(x+w, y+t*f); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x,y+t); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x+w,y); ctx.lineTo(x+w,y+t); ctx.stroke();
  ctx.restore();
}

function drawWinV(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, h: number) {
  ctx.save();
  ctx.fillStyle = '#BFDBFE'; ctx.fillRect(x, y, t, h);
  ctx.strokeStyle = '#374151'; ctx.lineWidth = 1; ctx.setLineDash([]);
  for (const f of [0.15, 0.5, 0.85]) { ctx.beginPath(); ctx.moveTo(x+t*f,y); ctx.lineTo(x+t*f,y+h); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+t,y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x,y+h); ctx.lineTo(x+t,y+h); ctx.stroke();
  ctx.restore();
}

function drawDoors(ctx: CanvasRenderingContext2D, plan: FloorPlan, ppm: number, ox: number, oy: number) {
  const tol = INT_WALL * 2;
  const skip = new Set(['garage']);
  const rooms = plan.rooms;
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i], b = rooms[j];
      if (skip.has(a.type) || skip.has(b.type)) continue;
      for (const [top, bot] of [[a,b],[b,a]] as [Room,Room][]) {
        if (Math.abs(top.y + top.height - bot.y) < tol) {
          const ol = Math.max(top.x, bot.x), or_ = Math.min(top.x+top.width, bot.x+bot.width);
          if (or_ - ol < 0.5) continue;
          const mid = (ol+or_)/2, dw = Math.min(0.85, or_-ol-0.1);
          const sx = ox + (mid-dw/2)*ppm, sy = oy + (top.y+top.height)*ppm, sw = dw*ppm;
          ctx.save(); ctx.strokeStyle='#1F2937'; ctx.lineWidth=2; ctx.setLineDash([]);
          ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx+sw,sy); ctx.stroke();
          ctx.setLineDash([4,3]); ctx.strokeStyle='#6B7280'; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.arc(sx,sy,sw,0,Math.PI/2); ctx.stroke();
          ctx.setLineDash([]); ctx.restore();
        }
      }
      for (const [left, right] of [[a,b],[b,a]] as [Room,Room][]) {
        if (Math.abs(left.x + left.width - right.x) < tol) {
          const ot = Math.max(left.y, right.y), ob = Math.min(left.y+left.height, right.y+right.height);
          if (ob - ot < 0.5) continue;
          const mid = (ot+ob)/2, dh = Math.min(0.85, ob-ot-0.1);
          const sx = ox + (left.x+left.width)*ppm, sy = oy + (mid-dh/2)*ppm, sh = dh*ppm;
          ctx.save(); ctx.strokeStyle='#1F2937'; ctx.lineWidth=2; ctx.setLineDash([]);
          ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx,sy+sh); ctx.stroke();
          ctx.setLineDash([4,3]); ctx.strokeStyle='#6B7280'; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.arc(sx,sy,sh,Math.PI/2,Math.PI); ctx.stroke();
          ctx.setLineDash([]); ctx.restore();
        }
      }
    }
  }
}

function drawRoomLabel(ctx: CanvasRenderingContext2D, r: Room, ppm: number, ox: number, oy: number) {
  const rx = ox + r.x * ppm, ry = oy + r.y * ppm;
  const rw = r.width * ppm,  rh = r.height * ppm;
  ctx.save();
  ctx.beginPath(); ctx.rect(rx+4, ry+4, rw-8, rh-8); ctx.clip();
  const ns = Math.max(10, Math.min(15, rw/7, rh/4));
  const ds = Math.max(9, Math.min(12, rw/9, rh/6));
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `bold ${ns}px Arial`; ctx.fillStyle = '#111827';
  ctx.fillText(r.label.toUpperCase(), rx+rw/2, ry+rh/2 - ds);
  ctx.font = `${ds}px Arial`; ctx.fillStyle = '#6B7280';
  ctx.fillText(`${r.width.toFixed(1)} × ${r.height.toFixed(1)}m`, rx+rw/2, ry+rh/2+ns*0.8);
  ctx.restore();
}

function drawDimensions(
  ctx: CanvasRenderingContext2D, plan: FloorPlan, ppm: number,
  ox: number, oy: number, planW: number, planH: number
) {
  const GAP = 28, TICK = 9;
  ctx.save();
  ctx.strokeStyle = '#374151'; ctx.fillStyle = '#374151';
  ctx.lineWidth = 1.5; ctx.font = '13px Arial'; ctx.setLineDash([]);

  const dimY = oy + planH + GAP;
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.beginPath(); ctx.moveTo(ox, oy+planH); ctx.lineTo(ox, dimY+TICK); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ox+planW, oy+planH); ctx.lineTo(ox+planW, dimY+TICK); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ox, dimY); ctx.lineTo(ox+planW, dimY); ctx.stroke();
  ctx.fillText(`${plan.width.toFixed(1)} m`, ox+planW/2, dimY-4);

  const dimX = ox + planW + GAP;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.beginPath(); ctx.moveTo(ox+planW, oy); ctx.lineTo(dimX+TICK, oy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ox+planW, oy+planH); ctx.lineTo(dimX+TICK, oy+planH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(dimX, oy); ctx.lineTo(dimX, oy+planH); ctx.stroke();
  ctx.save();
  ctx.translate(dimX+18, oy+planH/2);
  ctx.rotate(-Math.PI/2);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`${plan.depth.toFixed(1)} m`, 0, 0);
  ctx.restore();

  ctx.restore();
}

function drawScaleBar(ctx: CanvasRenderingContext2D, x: number, y: number, ppm: number) {
  const len = 5 * ppm;
  ctx.save();
  ctx.strokeStyle = '#374151'; ctx.lineWidth = 2; ctx.setLineDash([]);
  for (let i = 0; i < 2; i++) {
    ctx.fillStyle = i%2===0?'#1F2937':'#FFFFFF';
    ctx.fillRect(x+i*len/2, y-5, len/2, 10);
    ctx.strokeRect(x+i*len/2, y-5, len/2, 10);
  }
  ctx.fillStyle = '#374151'; ctx.font = '12px Arial';
  ctx.textAlign = 'left';  ctx.textBaseline = 'top'; ctx.fillText('0', x, y+8);
  ctx.textAlign = 'center'; ctx.fillText('2.5m', x+len/2, y+8);
  ctx.textAlign = 'right';  ctx.fillText('5m', x+len, y+8);
  ctx.fillStyle = '#6B7280'; ctx.font = '11px Arial'; ctx.textAlign = 'center';
  ctx.fillText('SCALE 1:100', x+len/2, y+24);
  ctx.restore();
}

function drawNorthArrow(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const r = 30;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.fillStyle='#FFFFFF'; ctx.fill();
  ctx.strokeStyle='#374151'; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='#1F2937';
  ctx.beginPath(); ctx.moveTo(cx,cy-r+7); ctx.lineTo(cx-7,cy+4); ctx.lineTo(cx,cy); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#D1D5DB';
  ctx.beginPath(); ctx.moveTo(cx,cy-r+7); ctx.lineTo(cx+7,cy+4); ctx.lineTo(cx,cy); ctx.closePath(); ctx.fill();
  ctx.font='bold 13px Arial'; ctx.fillStyle='#1F2937';
  ctx.textAlign='center'; ctx.textBaseline='bottom';
  ctx.fillText('N', cx, cy-r+5);
  ctx.restore();
}

function drawTitleBlock(
  ctx: CanvasRenderingContext2D, plan: FloorPlan,
  x: number, y: number, w: number, h: number
) {
  ctx.fillStyle = '#F8FAFC'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#1F2937'; ctx.lineWidth = 2; ctx.setLineDash([]);
  ctx.strokeRect(x, y, w, h);

  const c1 = x + w * 0.44, c2 = x + w * 0.70, c3 = x + w * 0.81;
  const ln = (x1:number,y1:number,x2:number,y2:number,lw:number,col:string) => {
    ctx.save(); ctx.strokeStyle=col; ctx.lineWidth=lw; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); ctx.restore();
  };
  ln(c1, y, c1, y+h, 1.5, '#374151');
  ln(c2, y, c2, y+h, 1.5, '#374151');
  ln(c3, y, c3, y+h, 1,   '#9CA3AF');
  const rh = h/3;
  ln(c1, y+rh,   x+w, y+rh,   1, '#9CA3AF');
  ln(c1, y+rh*2, x+w, y+rh*2, 1, '#9CA3AF');

  ctx.textBaseline='middle';
  ctx.font='bold 20px Arial'; ctx.fillStyle='#0284C7'; ctx.textAlign='left';
  ctx.fillText('Blueprint AI', x+16, y+h*0.22);
  ctx.font='bold 13px Arial'; ctx.fillStyle='#111827';
  ctx.fillText(plan.name||'Concept Floor Plan', x+16, y+h*0.52);
  ctx.font='11px Arial'; ctx.fillStyle='#9CA3AF';
  ctx.fillText('CONCEPT ONLY — NOT FOR CONSTRUCTION', x+16, y+h*0.80);

  const midC = (c1+c2)/2;
  ctx.font='bold 16px Arial'; ctx.fillStyle='#111827'; ctx.textAlign='center';
  ctx.fillText('FLOOR PLAN', midC, y+h*0.28);
  ctx.font='12px Arial'; ctx.fillStyle='#374151';
  ctx.fillText(`${plan.width.toFixed(1)}m × ${plan.depth.toFixed(1)}m`, midC, y+h*0.55);
  ctx.font='11px Arial'; ctx.fillStyle='#6B7280';
  ctx.fillText(`Total Area: ${plan.totalArea} m²`, midC, y+h*0.80);

  const today = new Date().toLocaleDateString('en-AU', { month:'short', year:'numeric' });
  const rows = [['DRAWN BY','Blueprint AI'],['DATE',today],['SCALE','1 : 100']];
  for (let i=0; i<rows.length; i++) {
    const ry_ = y + rh * i;
    ctx.font='bold 10px Arial'; ctx.fillStyle='#9CA3AF'; ctx.textAlign='center';
    ctx.fillText(rows[i][0], (c1+c3)/2, ry_+rh*0.35);
    ctx.font='12px Arial'; ctx.fillStyle='#111827';
    ctx.fillText(rows[i][1], (c3+x+w)/2, ry_+rh*0.68);
  }
}

function drawSheetBorder(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save(); ctx.setLineDash([]);
  ctx.strokeStyle='#1F2937'; ctx.lineWidth=3; ctx.strokeRect(x,y,w,h);
  const i=8;
  ctx.strokeStyle='#374151'; ctx.lineWidth=1; ctx.strokeRect(x+i,y+i,w-i*2,h-i*2);
  ctx.restore();
}

function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#374151';
  ctx.font = 'bold 90px Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.translate(w/2, h/2); ctx.rotate(-Math.PI/6);
  ctx.fillText('BLUEPRINT AI — PREVIEW', 0, 0);
  ctx.restore();
}

// ============================================================
// Export helpers
// ============================================================

export function canvasToJpegBlob(canvas: HTMLCanvasElement, quality = 0.94): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('Blob creation failed')), 'image/jpeg', quality);
  });
}

export function canvasToDataURL(canvas: HTMLCanvasElement, quality = 0.94): string {
  return canvas.toDataURL('image/jpeg', quality);
}
