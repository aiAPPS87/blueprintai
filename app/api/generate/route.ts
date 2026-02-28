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
    // Surface a clear message when the API key is missing
    const raw = error instanceof Error ? error.message : String(error);
    const message = raw.includes('apiKey') || raw.includes('API key') || raw.includes('authentication')
      ? 'Anthropic API key is not configured. Add ANTHROPIC_API_KEY to your Vercel environment variables.'
      : raw;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
