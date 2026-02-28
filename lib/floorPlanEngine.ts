// ============================================================
// Blueprint AI — Constraint-Based Floor Plan Engine
// ============================================================
// Grid cell size: 500mm = 0.5m
// All coordinates are in meters.
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import {
  FloorPlan,
  Room,
  Wall,
  RoomType,
  ROOM_COLORS,
  ROOM_MIN_SIZES,
} from '@/types/plan';

const GRID_CELL = 0.5; // meters per grid cell
const EXT_WALL = 0.2;  // exterior wall thickness
const INT_WALL = 0.1;  // interior wall thickness

// ============================================================
// Utility helpers
// ============================================================

function snapToGrid(value: number): number {
  return Math.round(value / GRID_CELL) * GRID_CELL;
}

function roomsOverlap(a: Room, b: Room, margin = 0.05): boolean {
  return (
    a.x < b.x + b.width - margin &&
    a.x + a.width > b.x + margin &&
    a.y < b.y + b.height - margin &&
    a.y + a.height > b.y + margin
  );
}

function roomArea(r: Room): number {
  return parseFloat((r.width * r.height).toFixed(2));
}

function clampRoom(room: Room, maxW: number, maxH: number): Room {
  const r = { ...room };
  r.x = Math.max(EXT_WALL, Math.min(r.x, maxW - r.width - EXT_WALL));
  r.y = Math.max(EXT_WALL, Math.min(r.y, maxH - r.height - EXT_WALL));
  return r;
}

function roomsAreAdjacent(a: Room, b: Room, tolerance = 0.15): boolean {
  const horizontallyAligned =
    a.x < b.x + b.width + tolerance && a.x + a.width > b.x - tolerance;
  const verticallyAligned =
    a.y < b.y + b.height + tolerance && a.y + a.height > b.y - tolerance;
  const touchingHorizontally =
    Math.abs(a.x + a.width - b.x) < tolerance ||
    Math.abs(b.x + b.width - a.x) < tolerance;
  const touchingVertically =
    Math.abs(a.y + a.height - b.y) < tolerance ||
    Math.abs(b.y + b.height - a.y) < tolerance;
  return (
    (touchingHorizontally && verticallyAligned) ||
    (touchingVertically && horizontallyAligned)
  );
}

// ============================================================
// Room specification (input from Claude)
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
  garageDouble?: boolean;
}

// ============================================================
// Core layout algorithm
// ============================================================

export function generateFloorPlan(spec: HouseSpec): FloorPlan {
  const rooms: Room[] = [];

  // Resolve sizes for each room
  const sizedRooms = spec.rooms.map((rs) => {
    const minSize = ROOM_MIN_SIZES[rs.type] || { width: 3.0, height: 3.0 };
    const w = snapToGrid(Math.max(rs.width ?? minSize.width, minSize.width));
    const h = snapToGrid(Math.max(rs.height ?? minSize.height, minSize.height));
    return { ...rs, width: w, height: h };
  });

  // Calculate approximate house footprint
  const totalArea = sizedRooms.reduce((sum, r) => sum + r.width * r.height, 0);
  const aspectRatio = 1.4;
  const rawW = Math.sqrt(totalArea * aspectRatio) * 1.3;
  const rawH = rawW / aspectRatio;

  const houseW = snapToGrid(
    Math.max(spec.targetWidth ?? rawW, 8)
  );
  const houseH = snapToGrid(
    Math.max(spec.targetDepth ?? rawH, 7)
  );

  // --- Phase 1: Place garage at front (bottom of plan = front/south) ---
  const garageSpec = sizedRooms.find(
    (r) => r.type === 'garage'
  );
  let currentX = EXT_WALL;
  let currentY = EXT_WALL;

  if (garageSpec) {
    const garage: Room = {
      id: uuidv4(),
      type: garageSpec.type,
      label: garageSpec.label,
      x: EXT_WALL,
      y: EXT_WALL,
      width: garageSpec.width,
      height: garageSpec.height,
      color: ROOM_COLORS.garage,
      connections: [],
    };
    rooms.push(garage);
    currentX = garage.x + garage.width + INT_WALL;
  }

  // --- Phase 2: Place living / kitchen / dining area ---
  const livingTypes: RoomType[] = ['living', 'dining', 'kitchen'];
  const livingRooms = sizedRooms.filter((r) => livingTypes.includes(r.type));

  let livingStartY = EXT_WALL;
  let livingMaxX = currentX;

  for (const lr of livingRooms) {
    const room: Room = {
      id: uuidv4(),
      type: lr.type,
      label: lr.label,
      x: currentX,
      y: livingStartY,
      width: lr.width,
      height: lr.height,
      color: ROOM_COLORS[lr.type],
      connections: [],
    };
    rooms.push(room);
    livingStartY += lr.height + INT_WALL;
    livingMaxX = Math.max(livingMaxX, currentX + lr.width);
  }

  // --- Phase 3: Hallway spine ---
  const hallwaySpec = sizedRooms.find(
    (r) => r.type === 'hallway' || r.type === 'corridor'
  );
  const hallwayX = livingMaxX + INT_WALL;
  const hallwayW = hallwaySpec?.width ?? 1.2;
  const hallway: Room = {
    id: uuidv4(),
    type: 'hallway',
    label: 'Hallway',
    x: hallwayX,
    y: EXT_WALL,
    width: hallwayW,
    height: houseH - EXT_WALL * 2,
    color: ROOM_COLORS.hallway,
    connections: [],
  };
  rooms.push(hallway);

  // --- Phase 4: Place bedrooms and wet areas off the hallway ---
  const bedroomTypes: RoomType[] = ['bedroom', 'master_bedroom'];
  const wetTypes: RoomType[] = ['bathroom', 'ensuite', 'laundry'];
  const otherTypes: RoomType[] = ['study', 'storage'];

  const bedroomRooms = sizedRooms.filter((r) => bedroomTypes.includes(r.type));
  const wetRooms = sizedRooms.filter((r) => wetTypes.includes(r.type));
  const otherRooms = sizedRooms.filter((r) => otherTypes.includes(r.type));

  const remainingRooms = [...bedroomRooms, ...wetRooms, ...otherRooms];
  const rightStart = hallwayX + hallwayW + INT_WALL;

  // Try to pack rooms into two columns off the hallway
  let col1Y = EXT_WALL;
  let col2Y = EXT_WALL;
  const col1X = rightStart;
  const col2X = rightStart + (sizedRooms[0]?.width ?? 3.5) + INT_WALL;

  for (let i = 0; i < remainingRooms.length; i++) {
    const rs = remainingRooms[i];
    const useCol2 = col1Y > col2Y && col2X < houseW - rs.width - EXT_WALL;
    const x = useCol2 ? col2X : col1X;
    const y = useCol2 ? col2Y : col1Y;

    const room: Room = {
      id: uuidv4(),
      type: rs.type,
      label: rs.label,
      x,
      y,
      width: rs.width,
      height: rs.height,
      color: ROOM_COLORS[rs.type],
      connections: [hallway.id],
    };

    // Collision detection & shifting
    const placed = placeRoomWithoutCollision(room, rooms, houseW, houseH);
    rooms.push(placed);

    if (useCol2) {
      col2Y += placed.height + INT_WALL;
    } else {
      col1Y += placed.height + INT_WALL;
    }
  }

  // --- Phase 5: Connect rooms logically ---
  const hallwayRoom = rooms.find((r) => r.type === 'hallway');
  if (hallwayRoom) {
    rooms.forEach((r) => {
      if (r.id !== hallwayRoom.id && !r.connections.includes(hallwayRoom.id)) {
        if (roomsAreAdjacent(r, hallwayRoom)) {
          r.connections.push(hallwayRoom.id);
        }
      }
    });
  }

  // --- Phase 6: Clamp all rooms within house boundary ---
  const clampedRooms = rooms.map((r) => clampRoom(r, houseW, houseH));

  // --- Phase 7: Expand house to fit all rooms ---
  let maxRoomX = 0;
  let maxRoomY = 0;
  for (const r of clampedRooms) {
    maxRoomX = Math.max(maxRoomX, r.x + r.width);
    maxRoomY = Math.max(maxRoomY, r.y + r.height);
  }
  const finalW = snapToGrid(maxRoomX + EXT_WALL);
  const finalH = snapToGrid(maxRoomY + EXT_WALL);

  // --- Phase 8: Generate walls ---
  const walls = generateWalls(clampedRooms, finalW, finalH);

  // --- Phase 9: Calculate total area ---
  const totalHabArea = clampedRooms
    .filter((r) => r.type !== 'garage' && r.type !== 'hallway')
    .reduce((sum, r) => sum + roomArea(r), 0);

  return {
    id: uuidv4(),
    name: 'New Floor Plan',
    totalArea: parseFloat(totalHabArea.toFixed(1)),
    width: finalW,
    depth: finalH,
    rooms: clampedRooms,
    walls,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================
// Collision resolution
// ============================================================

function placeRoomWithoutCollision(
  room: Room,
  existing: Room[],
  maxW: number,
  maxH: number,
  maxAttempts = 50
): Room {
  let candidate = { ...room };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const collision = existing.find((r) => roomsOverlap(candidate, r));
    if (!collision) return candidate;

    // Try shifting right then up
    if (candidate.x + candidate.width + INT_WALL + collision.width < maxW - EXT_WALL) {
      candidate = { ...candidate, x: collision.x + collision.width + INT_WALL };
    } else {
      candidate = { ...candidate, x: room.x, y: collision.y + collision.height + INT_WALL };
    }
    candidate = clampRoom(candidate, maxW, maxH);
  }

  // Fallback: stack below existing rooms
  const maxY = existing.reduce((m, r) => Math.max(m, r.y + r.height), 0);
  return clampRoom({ ...candidate, x: EXT_WALL, y: maxY + INT_WALL }, maxW, maxH + room.height + INT_WALL);
}

// ============================================================
// Wall generation
// ============================================================

function generateWalls(rooms: Room[], houseW: number, houseH: number): Wall[] {
  const walls: Wall[] = [];

  // Exterior perimeter walls
  const exteriorCoords = [
    { x1: 0, y1: 0, x2: houseW, y2: 0 },          // South
    { x1: houseW, y1: 0, x2: houseW, y2: houseH }, // East
    { x1: houseW, y1: houseH, x2: 0, y2: houseH }, // North
    { x1: 0, y1: houseH, x2: 0, y2: 0 },           // West
  ];

  for (const coords of exteriorCoords) {
    walls.push({
      id: uuidv4(),
      ...coords,
      thickness: EXT_WALL,
      type: 'exterior',
    });
  }

  // Interior walls — generate from room edges
  for (const room of rooms) {
    const { x, y, width, height } = room;
    const roomWalls = [
      { x1: x, y1: y, x2: x + width, y2: y },          // Bottom
      { x1: x + width, y1: y, x2: x + width, y2: y + height }, // Right
      { x1: x + width, y1: y + height, x2: x, y2: y + height }, // Top
      { x1: x, y1: y + height, x2: x, y2: y },          // Left
    ];

    for (const w of roomWalls) {
      // Skip if it duplicates an exterior wall
      const isExterior =
        (Math.abs(w.x1) < 0.01 && Math.abs(w.x2) < 0.01) ||
        (Math.abs(w.y1) < 0.01 && Math.abs(w.y2) < 0.01) ||
        (Math.abs(w.x1 - houseW) < 0.01 && Math.abs(w.x2 - houseW) < 0.01) ||
        (Math.abs(w.y1 - houseH) < 0.01 && Math.abs(w.y2 - houseH) < 0.01);

      if (!isExterior) {
        // Deduplicate very similar interior walls
        const duplicate = walls.some(
          (ew) =>
            ew.type === 'interior' &&
            Math.abs(ew.x1 - w.x1) < 0.05 &&
            Math.abs(ew.y1 - w.y1) < 0.05 &&
            Math.abs(ew.x2 - w.x2) < 0.05 &&
            Math.abs(ew.y2 - w.y2) < 0.05
        );
        if (!duplicate) {
          walls.push({
            id: uuidv4(),
            ...w,
            thickness: INT_WALL,
            type: 'interior',
          });
        }
      }
    }
  }

  return walls;
}

// ============================================================
// Modify / refine plan utilities
// ============================================================

export function resizeRoom(
  plan: FloorPlan,
  roomId: string,
  newWidth: number,
  newHeight: number
): FloorPlan {
  const rooms = plan.rooms.map((r) => {
    if (r.id !== roomId) return r;
    const minSize = ROOM_MIN_SIZES[r.type] || { width: 1.0, height: 1.0 };
    return {
      ...r,
      width: snapToGrid(Math.max(newWidth, minSize.width)),
      height: snapToGrid(Math.max(newHeight, minSize.height)),
    };
  });

  const walls = generateWalls(rooms, plan.width, plan.depth);
  const totalArea = rooms
    .filter((r) => r.type !== 'garage' && r.type !== 'hallway')
    .reduce((sum, r) => sum + roomArea(r), 0);

  return {
    ...plan,
    rooms,
    walls,
    totalArea: parseFloat(totalArea.toFixed(1)),
    updatedAt: new Date().toISOString(),
  };
}

export function moveRoom(
  plan: FloorPlan,
  roomId: string,
  newX: number,
  newY: number
): FloorPlan {
  const rooms = plan.rooms.map((r) => {
    if (r.id !== roomId) return r;
    return {
      ...r,
      x: snapToGrid(Math.max(EXT_WALL, newX)),
      y: snapToGrid(Math.max(EXT_WALL, newY)),
    };
  });

  const walls = generateWalls(rooms, plan.width, plan.depth);
  return {
    ...plan,
    rooms,
    walls,
    updatedAt: new Date().toISOString(),
  };
}

export function addRoom(plan: FloorPlan, spec: RoomSpec): FloorPlan {
  const minSize = ROOM_MIN_SIZES[spec.type] || { width: 3.0, height: 3.0 };
  const w = snapToGrid(Math.max(spec.width ?? minSize.width, minSize.width));
  const h = snapToGrid(Math.max(spec.height ?? minSize.height, minSize.height));

  const newRoom: Room = {
    id: uuidv4(),
    type: spec.type,
    label: spec.label,
    x: EXT_WALL,
    y: EXT_WALL,
    width: w,
    height: h,
    color: ROOM_COLORS[spec.type],
    connections: [],
  };

  const placed = placeRoomWithoutCollision(newRoom, plan.rooms, plan.width + w + 5, plan.depth + h + 5);
  const newRooms = [...plan.rooms, placed];

  // Expand house if needed
  const maxX = newRooms.reduce((m, r) => Math.max(m, r.x + r.width), 0) + EXT_WALL;
  const maxY = newRooms.reduce((m, r) => Math.max(m, r.y + r.height), 0) + EXT_WALL;
  const newW = snapToGrid(Math.max(plan.width, maxX));
  const newH = snapToGrid(Math.max(plan.depth, maxY));

  const walls = generateWalls(newRooms, newW, newH);
  const totalArea = newRooms
    .filter((r) => r.type !== 'garage' && r.type !== 'hallway')
    .reduce((sum, r) => sum + roomArea(r), 0);

  return {
    ...plan,
    rooms: newRooms,
    walls,
    width: newW,
    depth: newH,
    totalArea: parseFloat(totalArea.toFixed(1)),
    updatedAt: new Date().toISOString(),
  };
}

export function removeRoom(plan: FloorPlan, roomId: string): FloorPlan {
  const newRooms = plan.rooms.filter((r) => r.id !== roomId);
  const walls = generateWalls(newRooms, plan.width, plan.depth);
  const totalArea = newRooms
    .filter((r) => r.type !== 'garage' && r.type !== 'hallway')
    .reduce((sum, r) => sum + roomArea(r), 0);

  return {
    ...plan,
    rooms: newRooms,
    walls,
    totalArea: parseFloat(totalArea.toFixed(1)),
    updatedAt: new Date().toISOString(),
  };
}

// Re-generate walls for a plan (used after AI modification)
export function recalculateWalls(plan: FloorPlan): FloorPlan {
  const walls = generateWalls(plan.rooms, plan.width, plan.depth);
  const totalArea = plan.rooms
    .filter((r) => r.type !== 'garage' && r.type !== 'hallway')
    .reduce((sum, r) => sum + roomArea(r), 0);

  return {
    ...plan,
    walls,
    totalArea: parseFloat(totalArea.toFixed(1)),
    updatedAt: new Date().toISOString(),
  };
}
