import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { FloorPlan } from '@/types/plan';

// GET /api/plans — get user's saved plans
export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const authHeader = req.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ plans: data });
  } catch (error) {
    console.error('[GET /api/plans] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch plans';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/plans — save a plan
export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const authHeader = req.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { plan, thumbnail, planId } = body as {
      plan: FloorPlan;
      thumbnail?: string;
      planId?: string;
    };

    if (!plan) {
      return NextResponse.json({ error: 'Plan data is required' }, { status: 400 });
    }

    if (planId) {
      // Update existing plan
      const { data, error } = await supabase
        .from('plans')
        .update({
          name: plan.name,
          plan_data: plan,
          thumbnail,
          updated_at: new Date().toISOString(),
        })
        .eq('id', planId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ plan: data });
    } else {
      // Create new plan
      const { data, error } = await supabase
        .from('plans')
        .insert({
          user_id: user.id,
          name: plan.name,
          plan_data: plan,
          thumbnail,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ plan: data }, { status: 201 });
    }
  } catch (error) {
    console.error('[POST /api/plans] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to save plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/plans
export async function DELETE(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const authHeader = req.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const planId = searchParams.get('id');

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', planId)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/plans] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
