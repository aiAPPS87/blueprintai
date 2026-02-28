import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('[/api/webhook] Signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (!userId) break;

        if (session.mode === 'payment') {
          // One-time download purchase
          await supabase.from('subscriptions').upsert(
            {
              user_id: userId,
              tier: 'download',
              stripe_customer_id: session.customer as string,
            },
            { onConflict: 'user_id' }
          );
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Look up user by customer ID
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (sub?.user_id) {
          await supabase.from('subscriptions').upsert(
            {
              user_id: sub.user_id,
              tier: subscription.status === 'active' ? 'pro' : 'free',
              stripe_subscription_id: subscription.id,
              stripe_customer_id: customerId,
              current_period_end: new Date(
                subscription.current_period_end * 1000
              ).toISOString(),
            },
            { onConflict: 'user_id' }
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (sub?.user_id) {
          await supabase.from('subscriptions').upsert(
            {
              user_id: sub.user_id,
              tier: 'free',
            },
            { onConflict: 'user_id' }
          );
        }
        break;
      }
    }
  } catch (error) {
    console.error('[/api/webhook] Event handling error:', error);
    return NextResponse.json({ error: 'Event handling failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
