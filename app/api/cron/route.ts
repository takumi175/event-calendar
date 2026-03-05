import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { fetchConnpassEvents } from '@/lib/scrapers/connpass'
import { fetchConnpassAtomEvents } from '@/lib/scrapers/connpass_atom'
import { fetchDoorkeeperEvents } from '@/lib/scrapers/doorkeeper'
import { fetchTechPlayEvents } from '@/lib/scrapers/techplay'
import { fetchICalCalendarEvents } from '@/lib/scrapers/ical_calendar'
import type { EventInsert } from '@/lib/types'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, { inserted: number; error: string | null }> = {}

  const sources: Array<{ name: string; fetch: () => Promise<EventInsert[]> }> = [
    { name: 'connpass_api', fetch: fetchConnpassEvents },
    { name: 'connpass_atom', fetch: fetchConnpassAtomEvents },
    { name: 'doorkeeper', fetch: fetchDoorkeeperEvents },
    { name: 'techplay', fetch: fetchTechPlayEvents },
    { name: 'ical_calendar', fetch: fetchICalCalendarEvents },
  ]

  const supabase = createServerClient()

  for (const source of sources) {
    try {
      const events = await source.fetch()

      const { error } = await supabase
        .from('events')
        .upsert(events, { onConflict: 'source,external_id', ignoreDuplicates: false })

      results[source.name] = {
        inserted: error ? 0 : events.length,
        error: error?.message ?? null,
      }
    } catch (err) {
      results[source.name] = {
        inserted: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      }
    }
  }

  return NextResponse.json({ ok: true, results })
}
