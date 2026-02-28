// ============================================================
// Blueprint AI — Claude API Integration
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import { FloorPlan, ChatMessage, RoomType, ROOM_COLORS, ROOM_MIN_SIZES } from '@/types/plan';
import { recalculateWalls } from '@/lib/floorPlanEngine';
import { v4 as uuidv4 } from 'uuid';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================================
// System prompts
// ============================================================

const GENERATE_SYSTEM_PROMPT = `You are a floor plan layout engine for Blueprint AI.
The user describes a house and you return a complete, valid JSON floor plan.

IMPORTANT RULES:
1. Return ONLY valid JSON — no markdown, no explanation, no code blocks
2. All coordinates (x, y) are in meters from bottom-left origin (0,0)
3. Minimum room sizes must be respected:
   - bedroom: 3.0 x 3.0m
   - master_bedroom: 4.0 x 3.5m
   - bathroom: 1.8 x 2.4m
   - ensuite: 1.5 x 2.0m
   - kitchen: 3.0 x 3.5m
   - living: 4.0 x 4.0m
   - dining: 3.0 x 3.5m
   - garage (single): 3.0 x 5.5m, (double): 5.5 x 5.5m
   - laundry: 1.8 x 2.0m
   - hallway: 1.2m wide minimum
4. Rooms MUST NOT overlap — check all coordinates carefully
5. Place garage at front (low y values), bedrooms at rear
6. Group living/kitchen/dining together
7. Include a hallway connecting rooms
8. Bathrooms should be near bedrooms (shared plumbing walls)
9. totalArea is the sum of all room areas except garage/hallway
10. Use these room types only: bedroom, master_bedroom, bathroom, ensuite, kitchen, living, dining, garage, laundry, hallway, corridor, study, storage
11. Colors by type:
    bedroom: "#E8F4FD", master_bedroom: "#DBEAFE", bathroom: "#E0F4F1", ensuite: "#CCFBF1"
    kitchen: "#FEF3E2", living: "#E8F5E9", dining: "#FFFDE7", garage: "#F5F5F5"
    laundry: "#F3E5F5", hallway: "#FAFAFA", corridor: "#FAFAFA", study: "#FFF8F0", storage: "#EEEEEE"

Return this exact JSON structure:
{
  "id": "uuid-here",
  "name": "House Plan",
  "totalArea": 0,
  "width": 0,
  "depth": 0,
  "rooms": [
    {
      "id": "uuid-here",
      "type": "roomType",
      "label": "Room Label",
      "x": 0,
      "y": 0,
      "width": 0,
      "height": 0,
      "color": "#hexcode",
      "connections": ["other-room-id"]
    }
  ],
  "walls": []
}

Note: Return empty walls array — walls will be auto-generated from room positions.`;

const REFINE_SYSTEM_PROMPT = `You are a floor plan editor for Blueprint AI.
The user wants to modify an existing floor plan. You receive the current plan JSON and an instruction.

IMPORTANT RULES:
1. Return ONLY the updated plan JSON — no markdown, no explanation, no code blocks
2. Modify ONLY what the user asked to change
3. Maintain room connectivity — all rooms must still be reachable
4. Rooms MUST NOT overlap after modification
5. Respect minimum room sizes (same as generation rules)
6. Keep all room IDs stable unless adding new rooms
7. New rooms get new UUIDs; removed rooms are omitted
8. Return the complete updated plan JSON (all rooms, not just changed ones)
9. Update totalArea, width, depth if rooms change
10. Return empty walls array — walls will be auto-generated

Keep x, y coordinates as numbers in meters. Do not use strings for coordinates.`;

// ============================================================
// Generate floor plan from natural language
// ============================================================

export async function generateFloorPlanFromText(
  userInput: string
): Promise<{ plan: FloorPlan; message: string }> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: GENERATE_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Generate a floor plan for: ${userInput}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  let rawJson = content.text.trim();

  // Strip markdown code blocks if Claude ignores instructions
  rawJson = rawJson
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let plan: FloorPlan;
  try {
    plan = JSON.parse(rawJson);
  } catch (e) {
    // Attempt to extract JSON object from response
    const match = rawJson.match(/\{[\s\S]*\}/);
    if (match) {
      plan = JSON.parse(match[0]);
    } else {
      throw new Error(`Failed to parse floor plan JSON: ${rawJson.slice(0, 200)}`);
    }
  }

  // Ensure required fields
  if (!plan.id) plan.id = uuidv4();
  plan.rooms = (plan.rooms || []).map((r) => ({
    ...r,
    id: r.id || uuidv4(),
    color: r.color || ROOM_COLORS[r.type as RoomType] || '#F5F5F5',
    connections: r.connections || [],
  }));

  // Auto-generate walls
  plan = recalculateWalls(plan);
  plan.createdAt = new Date().toISOString();
  plan.updatedAt = new Date().toISOString();

  const message = buildGenerateMessage(plan, userInput);
  return { plan, message };
}

// ============================================================
// Refine floor plan from instruction
// ============================================================

export async function refinePlan(
  currentPlan: FloorPlan,
  userInstruction: string,
  history: ChatMessage[]
): Promise<{ plan: FloorPlan; message: string }> {
  // Build conversation messages (last 6 to keep context manageable)
  const recentHistory = history.slice(-6);
  const messages: Anthropic.MessageParam[] = [];

  for (const msg of recentHistory) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      });
    }
  }

  // Add current instruction with plan context
  messages.push({
    role: 'user',
    content: `Current floor plan JSON:\n${JSON.stringify(currentPlan, null, 2)}\n\nUser instruction: ${userInstruction}`,
  });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: REFINE_SYSTEM_PROMPT,
    messages,
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  let rawJson = content.text.trim();
  rawJson = rawJson
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let updatedPlan: FloorPlan;
  try {
    updatedPlan = JSON.parse(rawJson);
  } catch (e) {
    const match = rawJson.match(/\{[\s\S]*\}/);
    if (match) {
      updatedPlan = JSON.parse(match[0]);
    } else {
      throw new Error(`Failed to parse refined plan JSON: ${rawJson.slice(0, 200)}`);
    }
  }

  // Preserve original ID
  updatedPlan.id = currentPlan.id;
  updatedPlan.rooms = (updatedPlan.rooms || []).map((r) => ({
    ...r,
    id: r.id || uuidv4(),
    color: r.color || ROOM_COLORS[r.type as RoomType] || '#F5F5F5',
    connections: r.connections || [],
  }));

  // Auto-generate walls
  updatedPlan = recalculateWalls(updatedPlan);
  updatedPlan.updatedAt = new Date().toISOString();

  const message = buildRefineMessage(updatedPlan, currentPlan, userInstruction);
  return { plan: updatedPlan, message };
}

// ============================================================
// Human-readable summary messages
// ============================================================

function buildGenerateMessage(plan: FloorPlan, input: string): string {
  const roomList = plan.rooms
    .filter((r) => r.type !== 'hallway' && r.type !== 'corridor')
    .map((r) => `• ${r.label} — ${r.width}×${r.height}m`)
    .join('\n');

  return `I've generated a floor plan based on your description.\n\n**Plan Summary:**\n${roomList}\n\n**Total Area:** ~${plan.totalArea}m²\n**Footprint:** ${plan.width}m × ${plan.depth}m\n\nYou can click any room to select it, drag to move it, or type refinements below.`;
}

function buildRefineMessage(
  updated: FloorPlan,
  original: FloorPlan,
  instruction: string
): string {
  const addedRooms = updated.rooms.filter(
    (r) => !original.rooms.find((o) => o.id === r.id)
  );
  const removedRooms = original.rooms.filter(
    (r) => !updated.rooms.find((u) => u.id === r.id)
  );

  let msg = `I've updated the floor plan based on your instruction.\n\n`;

  if (addedRooms.length > 0) {
    msg += `**Added:** ${addedRooms.map((r) => r.label).join(', ')}\n`;
  }
  if (removedRooms.length > 0) {
    msg += `**Removed:** ${removedRooms.map((r) => r.label).join(', ')}\n`;
  }

  msg += `\n**Updated Area:** ~${updated.totalArea}m²\n**Footprint:** ${updated.width}m × ${updated.depth}m`;
  return msg;
}
