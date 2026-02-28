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

const GENERATE_SYSTEM_PROMPT = `You are a residential architect assistant for Blueprint AI.
The user describes a house. Return a JSON list of rooms with ONLY types and sizes — NO coordinates.
Our layout engine will handle positioning.

ROOM TYPES: bedroom, master_bedroom, bathroom, ensuite, kitchen, living, dining, garage, laundry, hallway, study, storage

MINIMUM SIZES (width x height in meters):
- bedroom: 3.0 x 3.0
- master_bedroom: 4.0 x 3.5
- bathroom: 1.8 x 2.4
- ensuite: 1.5 x 2.0
- kitchen: 3.0 x 3.5
- living: 4.5 x 4.0
- dining: 3.0 x 3.5
- garage single: 3.0 x 5.5
- garage double: 5.5 x 5.5
- laundry: 1.8 x 2.0
- study: 2.5 x 2.5

RULES:
1. Return ONLY valid JSON — no markdown, no explanation
2. Do NOT include x, y coordinates — positions are auto-calculated
3. Do NOT include hallway — it is auto-generated
4. Size "width" = left-right, "height" = front-back depth of room
5. Respect minimum sizes. Use larger sizes for generous/standard requests.

Return this exact JSON structure:
{
  "name": "House Plan Name",
  "rooms": [
    { "type": "garage", "label": "Double Garage", "width": 5.5, "height": 5.5 },
    { "type": "living", "label": "Living Room", "width": 4.5, "height": 4.0 },
    { "type": "kitchen", "label": "Kitchen", "width": 3.5, "height": 3.5 },
    { "type": "dining", "label": "Dining Room", "width": 3.5, "height": 3.5 },
    { "type": "master_bedroom", "label": "Master Bedroom", "width": 4.0, "height": 3.5 },
    { "type": "ensuite", "label": "Ensuite", "width": 2.0, "height": 2.5 },
    { "type": "bathroom", "label": "Bathroom", "width": 2.0, "height": 2.5 },
    { "type": "bedroom", "label": "Bedroom 2", "width": 3.0, "height": 3.0 }
  ]
}`;

const REFINE_SYSTEM_PROMPT = `You are a residential architect assistant for Blueprint AI.
You receive the current room list and an instruction to modify it.
Return ONLY the updated room list JSON — no coordinates, no hallways.

Same rules as generation:
1. Return ONLY valid JSON
2. No x, y coordinates
3. No hallway rooms
4. Respect minimum sizes
5. Return the COMPLETE updated room list

Return same JSON structure:
{ "name": "...", "rooms": [ { "type": "...", "label": "...", "width": 0, "height": 0 }, ... ] }`;

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
