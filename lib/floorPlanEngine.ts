// ============================================================
// Blueprint AI — Zone-Based Floor Plan Layout Engine
// ============================================================
// Coordinates: Y increases downward (screen/canvas convention)
// Zone 0 (top/front): Garage, Entry
// Zone 1: Living, Kitchen, Dining
// Zone 2: Hallway (auto-generated, full width)
// Zone 3: Master Bed + Ensuite, Bathroom(s), Laundry
// Zone 4 (rear): Bedrooms, Study, Storage
//
// Rooms tile perfectly within zones — no overlaps by construction.
// EXT_WALL = 0.2m border, INT_WALL = 0.1m gap between rooms.
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { FloorPlan, Room, Wall, RoomType, ROOM_COLORS, ROOM_MIN_SIZES } from '@/types/plan';

export const EXT_WALL = 0.2;
export const INT_WALL = 0.1;
const GRID_CELL = 0.5;

function snap(v: number): number {
  return Math.round(v / GRID_CELL) * GRID_CELL;
}

// ============================================================
// Room specification (input from Claude or form)
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

// Internal sized room before layout
interface SizedRoom extends RoomSpec {
  w: number;
  h: number;
}

// ============================================================
// Zone assignment
// ============================================================

function getZone(type: RoomType): number {
  switch (type) {
    case 'garage':                                    return 0;
    case 'living': case 'kitchen': case 'dining':    return 1;
    case 'hallway': case 'corridor':                  return 2; // auto-generated
    case 'master_bedroom': case 'ensuite':
    case 'bathroom': case 'laundry':                  return 3;
    case 'bedroom': case 'study': case 'storage':     return 4;
    default:                                          return 4;
  }
}

// ============================================================
// Core layout algorithm
// ============================================================

export function generateFloorPlan(spec: HouseSpec): FloorPlan {
  // Resolve sizes for each room
  const sizedRooms: SizedRoom[] = spec.rooms
    .filter(rs => rs.type !== 'hallway' && rs.type !== 'corridor')
    .map(rs => {
      const min = ROOM_MIN_SIZES[rs.type] || { width: 3.0, height: 3.0 };
      const w = snap(Math.max(rs.width ?? min.width, min.width));
      const h = snap(Math.max(rs.height ?? min.height, min.height));
      return { ...rs, w, h };
    });

  // Distribute rooms into zones 0, 1, 3, 4 (zone 2 = auto hallway)
  const zones: SizedRoom[][] = [[], [], [], [], []];
  for (const r of sizedRooms) {
    zones[getZone(r.type)].push(r);
  }

  // Helper: total interior width of a zone (sum of room widths + gaps)
  const zoneInteriorWidth = (zone: SizedRoom[]) =>
    zone.reduce((sum, r) => sum + r.w, 0) + Math.max(0, zone.length - 1) * INT_WALL;

  // Compute house interior width = max non-empty zone width (min 8m)
  const activeZoneWidths = zones
    .filter(z => z.length > 0)
    .map(zoneInteriorWidth);
  const rawInteriorW = Math.max(...activeZoneWidths, 8.0);
  const houseInteriorW = snap(
    spec.targetWidth ? Math.max(spec.targetWidth - EXT_WALL * 2, rawInteriorW) : rawInteriorW
  );

  // Zone heights = max room height within zone
  const needsHallway =
    zones[3].length > 0 || zones[4].length > 0;

  const zoneHeights: number[] = zones.map((zone, zi) => {
    if (zi === 2) return needsHallway ? 1.2 : 0; // hallway
    if (zone.length === 0) return 0;
    return Math.max(...zone.map(r => r.h));
  });

  // ---- Layout rooms ----
  const rooms: Room[] = [];
  let currentY = EXT_WALL;

  for (let zi = 0; zi < 5; zi++) {
    const zoneH = zoneHeights[zi];
    if (zoneH === 0) continue;

    if (zi === 2) {
      // Auto hallway — spans full interior width
      rooms.push({
        id: uuidv4(),
        type: 'hallway',
        label: 'Hallway',
        x: EXT_WALL,
        y: currentY,
        width: houseInteriorW,
        height: zoneH,
        color: ROOM_COLORS.hallway,
        connections: [],
      });
    } else {
      const zone = zones[zi];
      const totalW = zoneInteriorWidth(zone);
      const extra = snap(houseInteriorW - totalW); // space to distribute

      let currentX = EXT_WALL;
      for (let ri = 0; ri < zone.length; ri++) {
        const rs = zone[ri];
        const isLast = ri === zone.length - 1;
        // Give all extra width to the last room in the zone
        const w = isLast && extra > 0 ? snap(rs.w + extra) : rs.w;

        rooms.push({
          id: uuidv4(),
          type: rs.type,
          label: rs.label,
          x: currentX,
          y: currentY,
          width: w,
          height: zoneH,
          color: ROOM_COLORS[rs.type] || '#F5F5F5',
          connections: [],
        });

        currentX += w + INT_WALL;
      }

      // If zone is empty but house needs a zone placeholder, skip
    }

    currentY += zoneH + INT_WALL;
  }

  // Remove trailing INT_WALL gap and add EXT_WALL
  const houseW = snap(EXT_WALL + houseInteriorW + EXT_WALL);
  const houseH = snap(currentY - INT_WALL + EXT_WALL);

  // ---- Generate walls ----
  const walls = generateWalls(rooms, houseW, houseH);

  // ---- Calculate total habitable area ----
  const totalArea = rooms
    .filter(r => r.type !== 'garage' && r.type !== 'hallway')
    .reduce((sum, r) => +(sum + r.width * r.height).toFixed(2), 0);

  return {
    id: uuidv4(),
    name: 'New Floor Plan',
    totalArea: parseFloat(totalArea.toFixed(1)),
    width: houseW,
    depth: houseH,
    rooms,
    walls,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================
// Wall generation (perimeter + interior per room edge)
// ============================================================

function generateWalls(rooms: Room[], houseW: number, houseH: number): Wall[] {
  const walls: Wall[] = [];

  // Exterior perimeter walls
  const extCoords = [
    { x1: 0, y1: 0,      x2: houseW, y2: 0 },
    { x1: houseW, y1: 0, x2: houseW, y2: houseH },
    { x1: houseW, y1: houseH, x2: 0, y2: houseH },
    { x1: 0, y1: houseH, x2: 0, y2: 0 },
  ];
  for (const c of extCoords) {
    walls.push({ id: uuidv4(), ...c, thickness: EXT_WALL, type: 'exterior' });
  }

  // Interior walls from room edges (deduplicated)
  const seen = new Set<string>();
  for (const r of rooms) {
    const edges = [
      { x1: r.x, y1: r.y,           x2: r.x + r.width, y2: r.y },
      { x1: r.x + r.width, y1: r.y, x2: r.x + r.width, y2: r.y + r.height },
      { x1: r.x, y1: r.y + r.height, x2: r.x + r.width, y2: r.y + r.height },
      { x1: r.x, y1: r.y,            x2: r.x, y2: r.y + r.height },
    ];
    for (const e of edges) {
      const onExt =
        (Math.abs(e.x1) < 0.05 && Math.abs(e.x2) < 0.05) ||
        (Math.abs(e.y1) < 0.05 && Math.abs(e.y2) < 0.05) ||
        (Math.abs(e.x1 - houseW) < 0.05 && Math.abs(e.x2 - houseW) < 0.05) ||
        (Math.abs(e.y1 - houseH) < 0.05 && Math.abs(e.y2 - houseH) < 0.05);
      if (onExt) continue;

      const key = `${Math.round(e.x1*100)},${Math.round(e.y1*100)},${Math.round(e.x2*100)},${Math.round(e.y2*100)}`;
      const keyRev = `${Math.round(e.x2*100)},${Math.round(e.y2*100)},${Math.round(e.x1*100)},${Math.round(e.y1*100)}`;
      if (seen.has(key) || seen.has(keyRev)) continue;
      seen.add(key);

      walls.push({ id: uuidv4(), ...e, thickness: INT_WALL, type: 'interior' });
    }
  }

  return walls;
}

// ============================================================
// Modify / refine plan utilities (kept for drag interactions)
// ============================================================

function roomArea(r: Room) { return parseFloat((r.width * r.height).toFixed(2)); }

export function resizeRoom(plan: FloorPlan, roomId: string, newWidth: number, newHeight: number): FloorPlan {
  const rooms = plan.rooms.map(r => {
    if (r.id !== roomId) return r;
    const min = ROOM_MIN_SIZES[r.type] || { width: 1.0, height: 1.0 };
    return { ...r, width: snap(Math.max(newWidth, min.width)), height: snap(Math.max(newHeight, min.height)) };
  });
  return { ...plan, rooms, walls: generateWalls(rooms, plan.width, plan.depth), updatedAt: new Date().toISOString() };
}

export function moveRoom(plan: FloorPlan, roomId: string, newX: number, newY: number): FloorPlan {
  const rooms = plan.rooms.map(r => {
    if (r.id !== roomId) return r;
    return { ...r, x: snap(Math.max(EXT_WALL, newX)), y: snap(Math.max(EXT_WALL, newY)) };
  });
  return { ...plan, rooms, walls: generateWalls(rooms, plan.width, plan.depth), updatedAt: new Date().toISOString() };
}

export function addRoom(plan: FloorPlan, spec: RoomSpec): FloorPlan {
  const min = ROOM_MIN_SIZES[spec.type] || { width: 3.0, height: 3.0 };
  const w = snap(Math.max(spec.width ?? min.width, min.width));
  const h = snap(Math.max(spec.height ?? min.height, min.height));
  const maxY = plan.rooms.reduce((m, r) => Math.max(m, r.y + r.height), 0) + INT_WALL;
  const newRoom: Room = {
    id: uuidv4(), type: spec.type, label: spec.label,
    x: EXT_WALL, y: maxY, width: w, height: h,
    color: ROOM_COLORS[spec.type], connections: [],
  };
  const newRooms = [...plan.rooms, newRoom];
  const newW = snap(Math.max(plan.width, EXT_WALL + w + EXT_WALL));
  const newH = snap(maxY + h + EXT_WALL);
  return {
    ...plan, rooms: newRooms, walls: generateWalls(newRooms, newW, newH),
    width: newW, depth: newH, updatedAt: new Date().toISOString(),
  };
}

export function removeRoom(plan: FloorPlan, roomId: string): FloorPlan {
  const rooms = plan.rooms.filter(r => r.id !== roomId);
  return { ...plan, rooms, walls: generateWalls(rooms, plan.width, plan.depth), updatedAt: new Date().toISOString() };
}

export function recalculateWalls(plan: FloorPlan): FloorPlan {
  const walls = generateWalls(plan.rooms, plan.width, plan.depth);
  const totalArea = plan.rooms
    .filter(r => r.type !== 'garage' && r.type !== 'hallway')
    .reduce((sum, r) => sum + roomArea(r), 0);
  return { ...plan, walls, totalArea: parseFloat(totalArea.toFixed(1)), updatedAt: new Date().toISOString() };
}
