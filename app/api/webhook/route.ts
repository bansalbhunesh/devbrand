import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { pool } from '@/lib/db'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const githubLogin = session.metadata?.github_login
      const customerId = session.customer as string

      if (githubLogin) {
        await pool.query(`
          UPDATE users SET
            plan = 'pro',
            stripe_customer_id = $2,
            plan_expires_at = now() + interval '1 month',
            updated_at = now()
          WHERE github_login = $1
        `, [githubLogin, customerId])
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object
      const customerId = sub.customer as string

      await pool.query(`
        UPDATE users SET plan = 'free', plan_expires_at = null, updated_at = now()
        WHERE stripe_customer_id = $1
      `, [customerId])
    }

    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object
      const customerId = invoice.customer as string

      // Extend plan on successful renewal
      await pool.query(`
        UPDATE users SET
          plan_expires_at = now() + interval '1 month',
          updated_at = now()
        WHERE stripe_customer_id = $1
      `, [customerId])
    }
  } catch (err) {
    console.error('[webhook] Error processing event:', err)
    // Still return 200 to prevent Stripe retries on our DB errors
  }

  return NextResponse.json({ received: true })
}
