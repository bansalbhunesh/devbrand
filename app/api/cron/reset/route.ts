import { NextRequest, NextResponse } from 'next/server'
import { resetAllMonthlyGenerations } from '@/lib/db'

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await resetAllMonthlyGenerations()
    return NextResponse.json({ success: true, message: 'Monthly generations reset' })
  } catch (err) {
    console.error('[cron/reset]', err)
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 })
  }
}
