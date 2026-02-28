import { NextRequest, NextResponse } from 'next/server';
import { refinePlan } from '@/lib/claude';
import { FloorPlan, ChatMessage } from '@/types/plan';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      currentPlan,
      userInstruction,
      conversationHistory = [],
    } = body as {
      currentPlan: FloorPlan;
      userInstruction: string;
      conversationHistory: ChatMessage[];
    };

    if (!currentPlan || !userInstruction) {
      return NextResponse.json(
        { error: 'currentPlan and userInstruction are required' },
        { status: 400 }
      );
    }

    const { plan, message } = await refinePlan(
      currentPlan,
      userInstruction,
      conversationHistory
    );

    return NextResponse.json({ plan, message });
  } catch (error) {
    console.error('[/api/refine] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to refine floor plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
