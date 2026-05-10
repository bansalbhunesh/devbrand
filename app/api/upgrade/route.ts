import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUser } from '@/lib/db'
import { createCheckoutSession, createPortalSession } from '@/lib/stripe'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.githubId || !session?.user?.githubLogin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getUser(session.user.githubId)
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // If already Pro with a Stripe customer ID, send to billing portal
    if (user.plan === 'pro' && user.stripe_customer_id) {
      const portalSession = await createPortalSession(user.stripe_customer_id)
      return NextResponse.json({ url: portalSession.url })
    }

    // Otherwise, create checkout session
    const checkoutSession = await createCheckoutSession(
      user.id,
      session.user.githubLogin,
      session.user.email ?? undefined
    )

    return NextResponse.json({ url: checkoutSession.url })
  } catch (err) {
    console.error('[upgrade]', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
