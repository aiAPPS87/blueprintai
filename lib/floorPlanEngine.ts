// ============================================================
// Blueprint AI — Zone-Based Floor Plan Layout Engine
// Produces buildable residential floor plans.
// ============================================================
// Zones (Y increases downward):
//   0 – Front  : Garage + Entry/Alfresco (auto-filled)
//   1 – Living  : Living, Kitchen, Dining
//   2 – Hallway : Auto-generated, full width
//   3 – Private : Master, Ensuite, Bathroom, Laundry
//   4 – Rear    : Bedrooms, Study, Storage
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { FloorPlan, Room, Wall, RoomType, ROOM_COLORS, ROOM_MIN_SIZES } from '@/types/plan';

export const EXT_WALL = 0.2;
export const INT_WALL = 0.1;
const GRID = 0.5;

function snap(v: number): number {
  return Math.round(v / GRID) * GRID;
}

// ============================================================
// Public types
// ============================================================

export interface RoomSpec {
  type: RoomType;
  label: string;
  width?: number;
  height?: number;
}

export interface HouseSpec {
  rooms: RoomSpec[];
  targetWidth?: number;
  targetDepth?: number;
}

interface Sized extends RoomSpec {
  w: number;  // resolved width
  h: number;  // resolved height
}

// ============================================================
// Zone assignment
// ============================================================

function zone(type: RoomType): number {
  switch (type) {
    case 'garage':                                   return 0;
    case 'living': case 'kitchen': case 'dining':   return 1;
    case 'hallway': case 'corridor':                 return 2;
    case 'master_bedroom': case 'ensuite':
    case 'bathroom': case 'laundry':                 return 3;
    default:                                         return 4; // bedroom, study, storage
  }
}

// ============================================================
// Helpers
// ============================================================

function naturalW(rooms: Sized[]): number {
  if (rooms.length === 0) return 0;
  return rooms.reduce((s, r) => s + r.w, 0) + (rooms.length - 1) * INT_WALL;
}

/** Distribute extra width proportionally; cap each room to maxAspect × height. */
function distribute(rooms: Sized[], targetW: number): Sized[] {
  if (rooms.length === 0) return rooms;
  const extra = targetW - naturalW(rooms);
  if (extra <= 0.05) return rooms;

  // Per-room aspect ratio cap (width ≤ aspect × height)
  const maxAspect: Partial<Record<RoomType, number>> = {
    living: 3.5, dining: 3.0, kitchen: 2.5,
    master_bedroom: 2.0, bedroom: 2.0, study: 2.0,
    bathroom: 2.0, ensuite: 2.0, laundry: 2.5,
    garage: 2.5, storage: 4.0, hallway: 50,
  };

  const total = rooms.reduce((s, r) => s + r.w, 0);
  let remaining = extra;

  const grown = rooms.map(r => {
    const share = extra * (r.w / total);
    const maxW   = r.h * (maxAspect[r.type] ?? 2.5);
    const actual = Math.min(share, maxW - r.w, remaining);
    remaining -= actual;
    return { ...r, w: snap(r.w + actual) };
  });

  // Any uncapped remainder → give to last room (it's farthest from entry)
  if (remaining > 0.05) {
    const last = grown[grown.length - 1];
    grown[grown.length - 1] = { ...last, w: snap(last.w + remaining) };
  }

  return grown;
}

// ============================================================
// Core layout
// ============================================================

export function generateFloorPlan(spec: HouseSpec): FloorPlan {
  // --- Resolve sizes ---
  const sized: Sized[] = spec.rooms
    .filter(rs => rs.type !== 'hallway' && rs.type !== 'corridor')
    .map(rs => {
      const min = ROOM_MIN_SIZES[rs.type] ?? { width: 3.0, height: 3.0 };
      return {
        ...rs,
        w: snap(Math.max(rs.width  ?? min.width,  min.width)),
        h: snap(Math.max(rs.height ?? min.height, min.height)),
      };
    });

  // --- Bucket into zones ---
  const zones: Sized[][] = [[], [], [], [], []];
  for (const r of sized) zones[zone(r.type)].push(r);

  // --- Zone heights (tallest room in each zone) ---
  const needsHallway = zones[3].length > 0 || zones[4].length > 0;
  const zH: number[] = zones.map((z, i) => {
    if (i === 2) return needsHallway ? 1.2 : 0;
    if (z.length === 0) return 0;
    return Math.max(...z.map(r => r.h));
  });

  // --- House interior width: driven by Zone 1 (living area) ---
  // If Zone 1 is empty, use the widest non-empty zone.
  const liveW = naturalW(zones[1]);
  const otherMaxW = Math.max(...[0,3,4].map(i => naturalW(zones[i])));
  let houseW = snap(Math.max(liveW > 0 ? liveW : otherMaxW, 8.0));
  if (spec.targetWidth) houseW = snap(Math.max(spec.targetWidth - EXT_WALL * 2, houseW));

  // --- Auto-fill Zone 0 (garage) with Entry and/or Alfresco ---
  if (zones[0].length > 0 && zH[0] > 0) {
    const extra = houseW - naturalW(zones[0]);
    if (extra > 1.4) {
      // Add Entry/Porch (2–3m) beside the garage
      const entryW = snap(Math.min(extra - INT_WALL, 3.0));
      zones[0].push({ type: 'storage', label: 'Entry / Porch', w: entryW, h: zH[0] });

      // If still significant space left, add Alfresco
      const stillExtra = houseW - naturalW(zones[0]);
      if (stillExtra > 1.4) {
        const alfW = snap(stillExtra - INT_WALL);
        zones[0].push({ type: 'storage', label: 'Alfresco', w: alfW, h: zH[0] });
      }
    }
  }

  // --- Auto-fill Zone 4 (bedrooms) with Linen if too much spare ---
  if (zones[4].length > 0 && zH[4] > 0) {
    const extra = houseW - naturalW(zones[4]);
    if (extra > 2.0) {
      const linenW = snap(Math.min(extra - INT_WALL, 2.0));
      zones[4].push({ type: 'storage', label: 'Linen', w: linenW, h: zH[4] });
    }
  }

  // --- Distribute remaining extra width per zone (proportional, aspect-capped) ---
  for (let zi = 0; zi < 5; zi++) {
    if (zi === 2 || zones[zi].length === 0) continue;
    zones[zi] = distribute(zones[zi], houseW);
  }

  // --- Determine L-shape geometry ---
  // An L-shape forms when Zone 0 (garage) natural width is meaningfully
  // narrower than the main body. Threshold: < 72% of main body width.
  const zone0NatW = naturalW(zones[0]);
  const hasGarage  = zones[0].length > 0 && zH[0] > 0;
  const isLShape   = hasGarage && zone0NatW < houseW * 0.72;

  // For L-shapes, re-distribute Zone 0 within its own narrower width.
  if (isLShape) {
    zones[0] = distribute(zones[0], zone0NatW);
  }

  // --- Place rooms ---
  const rooms: Room[] = [];
  let curY = EXT_WALL;

  for (let zi = 0; zi < 5; zi++) {
    const h = zH[zi];
    if (h === 0) continue;

    if (zi === 2) {
      // Full-width hallway (always spans main body width)
      rooms.push({
        id: uuidv4(), type: 'hallway', label: 'Hallway',
        x: EXT_WALL, y: curY, width: houseW, height: h,
        color: ROOM_COLORS.hallway, connections: [],
      });
    } else {
      let curX = EXT_WALL;
      for (const rs of zones[zi]) {
        rooms.push({
          id: uuidv4(), type: rs.type, label: rs.label,
          x: curX, y: curY, width: rs.w, height: h,
          color: ROOM_COLORS[rs.type] ?? '#F5F5F5', connections: [],
        });
        curX += rs.w + INT_WALL;
      }
    }

    curY += h + INT_WALL;
  }

  const planW = snap(EXT_WALL + houseW + EXT_WALL);
  const planH = snap(curY - INT_WALL + EXT_WALL);

  // L-shape wing outer dimensions
  const garageWingWidth = isLShape ? snap(EXT_WALL + zone0NatW + EXT_WALL) : undefined;
  const garageWingDepth = isLShape ? snap(EXT_WALL + zH[0] + INT_WALL)     : undefined;

  const walls = buildWalls(rooms, planW, planH, garageWingWidth, garageWingDepth);
  const totalArea = rooms
    .filter(r => r.type !== 'garage' && r.type !== 'hallway' && r.type !== 'storage')
    .reduce((s, r) => +(s + r.width * r.height).toFixed(2), 0);

  return {
    id: uuidv4(), name: 'New Floor Plan',
    totalArea: parseFloat(totalArea.toFixed(1)),
    width: planW, depth: planH,
    garageWingWidth, garageWingDepth,
    rooms, walls,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================
// Wall generation
// ============================================================

function buildWalls(
  rooms: Room[], planW: number, planH: number,
  garageWingWidth?: number, garageWingDepth?: number
): Wall[] {
  const walls: Wall[] = [];

  // Exterior perimeter — L-shape or rectangle
  if (garageWingWidth && garageWingDepth) {
    const gW = garageWingWidth;
    const gH = garageWingDepth;
    // L-shape polygon (clockwise): top-left → top-right of wing → step → main body right → bottom → left
    const segs = [
      { x1: 0,   y1: 0,     x2: gW,    y2: 0     },  // top of wing
      { x1: gW,  y1: 0,     x2: gW,    y2: gH    },  // right side of wing down to step
      { x1: gW,  y1: gH,    x2: planW, y2: gH    },  // horizontal step
      { x1: planW, y1: gH,  x2: planW, y2: planH },  // right side of main body
      { x1: planW, y1: planH, x2: 0,   y2: planH },  // bottom
      { x1: 0,   y1: planH, x2: 0,     y2: 0     },  // left side
    ];
    for (const c of segs) walls.push({ id: uuidv4(), ...c, thickness: EXT_WALL, type: 'exterior' });
  } else {
    for (const c of [
      { x1: 0, y1: 0,         x2: planW, y2: 0     },
      { x1: planW, y1: 0,     x2: planW, y2: planH },
      { x1: planW, y1: planH, x2: 0,     y2: planH },
      { x1: 0, y1: planH,     x2: 0,     y2: 0     },
    ]) walls.push({ id: uuidv4(), ...c, thickness: EXT_WALL, type: 'exterior' });
  }

  // Interior (room edges, deduplicated)
  const seen = new Set<string>();
  for (const r of rooms) {
    const edges = [
      [r.x, r.y,           r.x + r.width, r.y],
      [r.x + r.width, r.y, r.x + r.width, r.y + r.height],
      [r.x, r.y + r.height, r.x + r.width, r.y + r.height],
      [r.x, r.y,            r.x, r.y + r.height],
    ];
    for (const [x1, y1, x2, y2] of edges) {
      const onExt =
        (Math.abs(x1) < 0.05 && Math.abs(x2) < 0.05) ||
        (Math.abs(y1) < 0.05 && Math.abs(y2) < 0.05) ||
        (Math.abs(x1 - planW) < 0.05 && Math.abs(x2 - planW) < 0.05) ||
        (Math.abs(y1 - planH) < 0.05 && Math.abs(y2 - planH) < 0.05);
      if (onExt) continue;
      const k  = `${Math.round(x1*10)},${Math.round(y1*10)},${Math.round(x2*10)},${Math.round(y2*10)}`;
      const kr = `${Math.round(x2*10)},${Math.round(y2*10)},${Math.round(x1*10)},${Math.round(y1*10)}`;
      if (seen.has(k) || seen.has(kr)) continue;
      seen.add(k);
      walls.push({ id: uuidv4(), x1, y1, x2, y2, thickness: INT_WALL, type: 'interior' });
    }
  }
  return walls;
}

// ============================================================
// Edit utilities
// ============================================================

function area(r: Room) { return +(r.width * r.height).toFixed(2); }

export function resizeRoom(plan: FloorPlan, roomId: string, newW: number, newH: number): FloorPlan {
  const rooms = plan.rooms.map(r => {
    if (r.id !== roomId) return r;
    const min = ROOM_MIN_SIZES[r.type] ?? { width: 1.0, height: 1.0 };
    return { ...r, width: snap(Math.max(newW, min.width)), height: snap(Math.max(newH, min.height)) };
  });
  return { ...plan, rooms, walls: buildWalls(rooms, plan.width, plan.depth), updatedAt: new Date().toISOString() };
}

export function moveRoom(plan: FloorPlan, roomId: string, newX: number, newY: number): FloorPlan {
  const rooms = plan.rooms.map(r => r.id !== roomId ? r : {
    ...r, x: snap(Math.max(EXT_WALL, newX)), y: snap(Math.max(EXT_WALL, newY)),
  });
  return { ...plan, rooms, walls: buildWalls(rooms, plan.width, plan.depth), updatedAt: new Date().toISOString() };
}

export function addRoom(plan: FloorPlan, spec: RoomSpec): FloorPlan {
  const min = ROOM_MIN_SIZES[spec.type] ?? { width: 3.0, height: 3.0 };
  const w = snap(Math.max(spec.width  ?? min.width,  min.width));
  const h = snap(Math.max(spec.height ?? min.height, min.height));
  const maxY = plan.rooms.reduce((m, r) => Math.max(m, r.y + r.height), 0) + INT_WALL;
  const newRoom: Room = {
    id: uuidv4(), type: spec.type, label: spec.label,
    x: EXT_WALL, y: maxY, width: w, height: h,
    color: ROOM_COLORS[spec.type], connections: [],
  };
  const rooms = [...plan.rooms, newRoom];
  const planW = snap(Math.max(plan.width, EXT_WALL + w + EXT_WALL));
  const planH = snap(maxY + h + EXT_WALL);
  return { ...plan, rooms, walls: buildWalls(rooms, planW, planH), width: planW, depth: planH, updatedAt: new Date().toISOString() };
}

export function removeRoom(plan: FloorPlan, roomId: string): FloorPlan {
  const rooms = plan.rooms.filter(r => r.id !== roomId);
  return { ...plan, rooms, walls: buildWalls(rooms, plan.width, plan.depth), updatedAt: new Date().toISOString() };
}

export function recalculateWalls(plan: FloorPlan): FloorPlan {
  const walls = buildWalls(plan.rooms, plan.width, plan.depth);
  const totalArea = plan.rooms
    .filter(r => r.type !== 'garage' && r.type !== 'hallway')
    .reduce((s, r) => s + area(r), 0);
  return { ...plan, walls, totalArea: parseFloat(totalArea.toFixed(1)), updatedAt: new Date().toISOString() };
}
