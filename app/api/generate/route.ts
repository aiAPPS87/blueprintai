import { NextRequest, NextResponse } from 'next/server';
import { generateFloorPlanFromText } from '@/lib/claude';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userInput } = body;

    if (!userInput || typeof userInput !== 'string' || userInput.trim().length < 5) {
      return NextResponse.json(
        { error: 'Please provide a description of at least 5 characters.' },
        { status: 400 }
      );
    }

    const { plan, message } = await generateFloorPlanFromText(userInput.trim());

    return NextResponse.json({ plan, message });
  } catch (error) {
    console.error('[/api/generate] Error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to generate floor plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
