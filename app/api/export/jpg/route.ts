import { NextRequest, NextResponse } from 'next/server';
import { FloorPlan } from '@/types/plan';

// JPG export is handled client-side via canvas
// This route returns plan metadata for the client to render
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plan, watermark = false } = body as { plan: FloorPlan; watermark?: boolean };

    if (!plan || !plan.rooms) {
      return NextResponse.json({ error: 'Plan data is required' }, { status: 400 });
    }

    // Return plan data + render instructions for client-side rendering
    return NextResponse.json({
      plan,
      watermark,
      renderInstructions: {
        ppm: 80,
        padding: 120,
        titleHeight: 160,
      },
    });
  } catch (error) {
    console.error('[/api/export/jpg] Error:', error);
    const message = error instanceof Error ? error.message : 'JPG export preparation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
