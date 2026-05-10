import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { pool } from '@/lib/db'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const githubLogin = session.metadata?.github_login
    const customerId = session.customer

    if (githubLogin) {
      // Mark user as pro, store Stripe customer ID
      const { Pool } = await import('pg')
      const pg = new (Pool as any)({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
      await pg.query(`
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
    const sub = event.data.object as any
    const customerId = sub.customer
    const { Pool } = await import('pg')
    const pg = new (Pool as any)({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
    await pg.query(`
      UPDATE users SET plan = 'free', plan_expires_at = null, updated_at = now()
      WHERE stripe_customer_id = $1
    `, [customerId])
  }

  return NextResponse.json({ received: true })
}
