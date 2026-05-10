import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUser, toggleOutputVisibility } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.githubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getUser(session.user.githubId)
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { id, is_public } = await req.json()
    if (!id || typeof is_public !== 'boolean') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    await toggleOutputVisibility(id, user.id, is_public)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[visibility]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
