import { NextRequest, NextResponse } from 'next/server';
import { generateDXF } from '@/lib/dxfGenerator';
import { FloorPlan } from '@/types/plan';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plan, projectName } = body as { plan: FloorPlan; projectName?: string };

    if (!plan || !plan.rooms) {
      return NextResponse.json({ error: 'Plan data is required' }, { status: 400 });
    }

    const dxfContent = generateDXF(plan, projectName);
    const filename = `${(projectName || plan.name || 'floor-plan').replace(/\s+/g, '-')}.dxf`;

    return new NextResponse(dxfContent, {
      headers: {
        'Content-Type': 'application/dxf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[/api/export/dxf] Error:', error);
    const message = error instanceof Error ? error.message : 'DXF generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
