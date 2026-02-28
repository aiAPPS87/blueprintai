// ============================================================
// Blueprint AI — Claude API Integration
// Claude determines room specs (type, size).
// Our layout engine determines room positions.
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import { FloorPlan, ChatMessage, RoomType, ROOM_COLORS } from '@/types/plan';
import { generateFloorPlan, recalculateWalls, RoomSpec } from '@/lib/floorPlanEngine';
import { v4 as uuidv4 } from 'uuid';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ============================================================
// Claude system prompts
// ============================================================

const GENERATE_SYSTEM_PROMPT = `You are a senior residential architect designing Australian single-storey homes for Blueprint AI.
The user describes a house. Return a JSON room list with ONLY types and dimensions — NO coordinates.
Our layout engine places rooms automatically in architectural zones.

AVAILABLE ROOM TYPES:
  bedroom, master_bedroom, bathroom, ensuite, kitchen, living, dining, garage, laundry, study, storage

DO NOT INCLUDE IN YOUR OUTPUT:
  hallway, entry, porch, alfresco, linen — the engine generates these automatically.

TYPICAL AUSTRALIAN ROOM SIZES (width × depth in metres):
  garage single:    3.0 × 5.5    | garage double:      5.8 × 5.5   | garage triple:  8.5 × 5.5
  living room:      5.0 × 4.5    | family/rumpus room: 4.5 × 4.0
  kitchen:          4.0 × 4.0    | open-plan kitchen:  4.5 × 4.0
  dining:           3.5 × 3.5    | open-plan dining:   4.0 × 3.5
  master bedroom:   4.5 × 3.8    | large master:       5.0 × 4.0   (always pair with ensuite)
  ensuite:          2.0 × 2.5    | large ensuite:      2.5 × 3.0
  bedroom:          3.5 × 3.2    | small bedroom:      3.0 × 3.0
  bathroom:         2.0 × 2.8    | second bathroom:    2.0 × 2.4
  laundry:          2.0 × 2.2
  study / home office: 3.0 × 3.0

MANDATORY ARCHITECTURAL RULES:
1. Every master_bedroom MUST be accompanied by an ensuite — always include both or neither.
2. Every house requires exactly 1 bathroom (add a 2nd for 4+ bedrooms or if user requests).
3. Every house requires exactly 1 laundry.
4. Garage width: single car = 3.0m, double = 5.8m, triple = 8.5m. Depth always ≥ 5.5m.
5. Use sizes at or above the typical values listed — Australian homes are generous.
6. For open-plan living/dining, still list as SEPARATE rooms but make each slightly larger.
7. A "rumpus" or "family room" should use type "living" with label "Rumpus Room" or "Family Room".

TYPICAL ROOM COUNTS BY HOME SIZE:
  2 bed: master+ensuite, 1 bedroom, living, kitchen, dining, bathroom, laundry [+garage]
  3 bed: master+ensuite, 2 bedrooms, living, kitchen, dining, bathroom, laundry [+garage, +study]
  4 bed: master+ensuite, 3 bedrooms, living, family room, kitchen, dining, 2×bathroom, laundry [+garage]
  5 bed: master+ensuite, 4 bedrooms, living, family room, kitchen, dining, 2×bathroom, laundry, study [+garage]

Return ONLY valid JSON — no markdown, no explanation, no coordinates:
{
  "name": "3 Bedroom Family Home",
  "rooms": [
    { "type": "garage",         "label": "Double Garage",    "width": 5.8, "height": 5.5 },
    { "type": "living",         "label": "Living Room",      "width": 5.0, "height": 4.5 },
    { "type": "dining",         "label": "Dining",           "width": 3.5, "height": 3.5 },
    { "type": "kitchen",        "label": "Kitchen",          "width": 4.0, "height": 4.0 },
    { "type": "master_bedroom", "label": "Master Bedroom",   "width": 4.5, "height": 3.8 },
    { "type": "ensuite",        "label": "Ensuite",          "width": 2.0, "height": 2.5 },
    { "type": "bathroom",       "label": "Bathroom",         "width": 2.0, "height": 2.8 },
    { "type": "laundry",        "label": "Laundry",          "width": 2.0, "height": 2.2 },
    { "type": "bedroom",        "label": "Bedroom 2",        "width": 3.5, "height": 3.2 },
    { "type": "bedroom",        "label": "Bedroom 3",        "width": 3.5, "height": 3.2 }
  ]
}`;

const REFINE_SYSTEM_PROMPT = `You are a senior residential architect modifying an Australian floor plan for Blueprint AI.
You receive the current room list and an instruction. Return the COMPLETE updated room list.

RULES (same as generation):
1. Return ONLY valid JSON — no markdown, no explanation
2. No x, y coordinates — engine handles placement
3. Never include: hallway, entry, porch, alfresco, linen — engine auto-generates these
4. Every master_bedroom must be paired with an ensuite
5. Use typical Australian sizes (see below) — do not shrink existing rooms unnecessarily
6. Return the COMPLETE room list (all rooms, not just changed ones)

TYPICAL SIZES (width × depth): garage single 3.0×5.5 | double 5.8×5.5 | living 5.0×4.5 |
kitchen 4.0×4.0 | dining 3.5×3.5 | master_bedroom 4.5×3.8 | ensuite 2.0×2.5 |
bedroom 3.5×3.2 | bathroom 2.0×2.8 | laundry 2.0×2.2 | study 3.0×3.0

Return: { "name": "...", "rooms": [ { "type": "...", "label": "...", "width": 0, "height": 0 }, ... ] }`;

// ============================================================
// Generate floor plan from natural language
// ============================================================

export async function generateFloorPlanFromText(
  userInput: string
): Promise<{ plan: FloorPlan; message: string }> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: GENERATE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Design a house: ${userInput}` }],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude');

  const spec = parseRoomSpec(content.text);
  const plan = generateFloorPlan({ rooms: spec.rooms });
  plan.name = spec.name || 'New Floor Plan';
  plan.createdAt = new Date().toISOString();
  plan.updatedAt = new Date().toISOString();

  return { plan, message: buildGenerateMessage(plan, userInput) };
}

// ============================================================
// Refine floor plan from instruction
// ============================================================

export async function refinePlan(
  currentPlan: FloorPlan,
  userInstruction: string,
  history: ChatMessage[]
): Promise<{ plan: FloorPlan; message: string }> {
  // Summarize current rooms (no coordinates needed)
  const currentRoomList = currentPlan.rooms
    .filter(r => r.type !== 'hallway' && r.type !== 'corridor')
    .map(r => ({ type: r.type, label: r.label, width: r.width, height: r.height }));

  const messages: Anthropic.MessageParam[] = [];
  const recentHistory = history.slice(-4);
  for (const msg of recentHistory) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
    }
  }
  messages.push({
    role: 'user',
    content: `Current rooms:\n${JSON.stringify(currentRoomList, null, 2)}\n\nInstruction: ${userInstruction}`,
  });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: REFINE_SYSTEM_PROMPT,
    messages,
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude');

  const spec = parseRoomSpec(content.text);
  const updatedPlan = generateFloorPlan({ rooms: spec.rooms });
  updatedPlan.id = currentPlan.id; // preserve original ID
  updatedPlan.name = spec.name || currentPlan.name;
  updatedPlan.updatedAt = new Date().toISOString();

  return { plan: updatedPlan, message: buildRefineMessage(updatedPlan, currentPlan, userInstruction) };
}

// ============================================================
// Parse Claude's room spec response
// ============================================================

function parseRoomSpec(text: string): { name: string; rooms: RoomSpec[] } {
  let raw = text.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed: { name?: string; rooms?: RoomSpec[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error(`Failed to parse room spec JSON: ${raw.slice(0, 200)}`);
    }
  }

  const rooms: RoomSpec[] = (parsed.rooms || []).map(r => ({
    type: (r.type || 'bedroom') as RoomType,
    label: r.label || capitalize(r.type || 'Room'),
    width: typeof r.width === 'number' ? r.width : undefined,
    height: typeof r.height === 'number' ? r.height : undefined,
  }));

  return { name: parsed.name || 'New Floor Plan', rooms };
}

function capitalize(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ============================================================
// Human-readable summary messages
// ============================================================

function buildGenerateMessage(plan: FloorPlan, input: string): string {
  const roomList = plan.rooms
    .filter(r => r.type !== 'hallway' && r.type !== 'corridor')
    .map(r => `• ${r.label} — ${r.width.toFixed(1)} × ${r.height.toFixed(1)}m`)
    .join('\n');

  return `Floor plan generated.\n\n**Rooms:**\n${roomList}\n\n**Total Area:** ~${plan.totalArea}m²\n**Footprint:** ${plan.width.toFixed(1)}m × ${plan.depth.toFixed(1)}m`;
}

function buildRefineMessage(updated: FloorPlan, original: FloorPlan, instruction: string): string {
  const added = updated.rooms.filter(r => !original.rooms.find(o => o.id === r.id));
  const removed = original.rooms.filter(r => !updated.rooms.find(u => u.id === r.id));
  let msg = 'Floor plan updated.\n\n';
  if (added.length > 0) msg += `**Added:** ${added.map(r => r.label).join(', ')}\n`;
  if (removed.length > 0) msg += `**Removed:** ${removed.map(r => r.label).join(', ')}\n`;
  msg += `\n**Area:** ~${updated.totalArea}m²  ·  **Footprint:** ${updated.width.toFixed(1)}m × ${updated.depth.toFixed(1)}m`;
  return msg;
}
