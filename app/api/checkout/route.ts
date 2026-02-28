import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession, PRICES } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase';

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
    const { type, planId } = body as { type: 'download' | 'pro'; planId?: string };

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const priceId = type === 'pro' ? PRICES.PRO_MONTHLY : PRICES.DOWNLOAD_PACK;

    const session = await createCheckoutSession({
      userId: user.id,
      userEmail: user.email!,
      priceId,
      successUrl: `${appUrl}/app?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/app?canceled=true`,
      planId,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[/api/checkout] Error:', error);
    const message = error instanceof Error ? error.message : 'Checkout failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
