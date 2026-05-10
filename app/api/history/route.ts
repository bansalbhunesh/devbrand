import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUser, getOutputHistory } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.githubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getUser(session.user.githubId)
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const history = await getOutputHistory(user.id, 20)

    return NextResponse.json({
      history,
      plan: user.plan,
      generations_this_month: user.generations_this_month,
    })
  } catch (err) {
    console.error('[history]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
