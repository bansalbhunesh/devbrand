import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

export const PRICE_ID = process.env.STRIPE_PRO_PRICE_ID! // create in Stripe dashboard: $15/mo recurring

export async function createCheckoutSession(userId: string, githubLogin: string, email?: string) {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: PRICE_ID, quantity: 1 }],
    customer_email: email,
    metadata: { github_login: githubLogin, user_id: userId },
    success_url: `${process.env.NEXTAUTH_URL}/dashboard?upgraded=1`,
    cancel_url: `${process.env.NEXTAUTH_URL}/dashboard`,
  })
  return session
}

export async function createPortalSession(stripeCustomerId: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${process.env.NEXTAUTH_URL}/dashboard`,
  })
  return session
}
