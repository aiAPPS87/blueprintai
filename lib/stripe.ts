import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export const PRICES = {
  /** One-time DXF+JPG download */
  DOWNLOAD_PACK: 'price_download_pack', // Replace with actual Stripe price ID
  /** Monthly Pro subscription */
  PRO_MONTHLY: 'price_pro_monthly',     // Replace with actual Stripe price ID
} as const;

export async function createCheckoutSession({
  userId,
  userEmail,
  priceId,
  successUrl,
  cancelUrl,
  planId,
}: {
  userId: string;
  userEmail: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  planId?: string;
}) {
  const session = await stripe.checkout.sessions.create({
    customer_email: userEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: priceId === PRICES.PRO_MONTHLY ? 'subscription' : 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      planId: planId || '',
    },
  });

  return session;
}
