import { db } from '@kitchencloud/database';
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const info = await db.$queryRawUnsafe<{ db: string; host: string | null }[]>(
      `SELECT current_database() AS db, inet_server_addr()::text AS host;`
    )
    // Tiny no-op select to prove connection works
    const now = await db.$queryRawUnsafe<{ now: string }[]>(`SELECT NOW()::text as now`)

    return NextResponse.json({ ok: true, info, now })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
