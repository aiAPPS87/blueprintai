// ============================================================
// Blueprint AI — Core Type Definitions
// ============================================================

export type RoomType =
  | 'bedroom'
  | 'master_bedroom'
  | 'bathroom'
  | 'ensuite'
  | 'kitchen'
  | 'living'
  | 'dining'
  | 'garage'
  | 'laundry'
  | 'hallway'
  | 'corridor'
  | 'study'
  | 'storage';

export const ROOM_COLORS: Record<RoomType, string> = {
  bedroom: '#E8F4FD',
  master_bedroom: '#DBEAFE',
  bathroom: '#E0F4F1',
  ensuite: '#CCFBF1',
  kitchen: '#FEF3E2',
  living: '#E8F5E9',
  dining: '#FFFDE7',
  garage: '#F5F5F5',
  laundry: '#F3E5F5',
  hallway: '#FAFAFA',
  corridor: '#FAFAFA',
  study: '#FFF8F0',
  storage: '#EEEEEE',
};

export const ROOM_MIN_SIZES: Record<RoomType, { width: number; height: number }> = {
  bedroom: { width: 3.0, height: 3.0 },
  master_bedroom: { width: 4.0, height: 3.5 },
  bathroom: { width: 1.8, height: 2.4 },
  ensuite: { width: 1.5, height: 2.0 },
  kitchen: { width: 3.0, height: 3.5 },
  living: { width: 4.0, height: 4.0 },
  dining: { width: 3.0, height: 3.5 },
  garage: { width: 3.0, height: 5.5 },
  laundry: { width: 1.8, height: 2.0 },
  hallway: { width: 1.2, height: 1.2 },
  corridor: { width: 1.2, height: 1.2 },
  study: { width: 2.5, height: 2.5 },
  storage: { width: 1.2, height: 1.5 },
};

export interface Room {
  id: string;
  type: RoomType;
  label: string;
  /** X position in meters from bottom-left */
  x: number;
  /** Y position in meters from bottom-left */
  y: number;
  /** Width in meters */
  width: number;
  /** Height/depth in meters */
  height: number;
  color: string;
  connections: string[];
  /** Optional metadata */
  notes?: string;
}

export type WallType = 'exterior' | 'interior';

export interface Wall {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Thickness in meters (0.2 for exterior, 0.1 for interior) */
  thickness: number;
  type: WallType;
}

export interface FloorPlan {
  id: string;
  name: string;
  /** Total habitable floor area in m² */
  totalArea: number;
  /** Overall house width in meters */
  width: number;
  /** Overall house depth in meters */
  depth: number;
  rooms: Room[];
  walls: Wall[];
  /** Metadata */
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================
// User / Auth types
// ============================================================

export interface UserPlan {
  id: string;
  userId: string;
  name: string;
  plan: FloorPlan;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Chat / Conversation types
// ============================================================

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
}

// ============================================================
// API Request/Response types
// ============================================================

export interface GenerateRequest {
  userInput: string;
}

export interface GenerateResponse {
  plan: FloorPlan;
  message: string;
}

export interface RefineRequest {
  currentPlan: FloorPlan;
  userInstruction: string;
  conversationHistory: ChatMessage[];
}

export interface RefineResponse {
  plan: FloorPlan;
  message: string;
}

export interface ExportDxfRequest {
  plan: FloorPlan;
  projectName?: string;
}

export interface ExportJpgRequest {
  plan: FloorPlan;
  projectName?: string;
  watermark?: boolean;
}

// ============================================================
// Stripe / Payments
// ============================================================

export type PlanTier = 'free' | 'download' | 'pro';

export interface UserSubscription {
  userId: string;
  tier: PlanTier;
  downloadsRemaining?: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string;
}

// ============================================================
// Editor state
// ============================================================

export interface EditorState {
  plan: FloorPlan | null;
  selectedRoomId: string | null;
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  history: FloorPlan[];
  historyIndex: number;
}
