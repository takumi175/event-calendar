import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()), 10)
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1), 10)

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 })
  }

  const startOf = new Date(year, month - 1, 1).toISOString()
  const endOf = new Date(year, month, 1).toISOString()

  let query = supabase
    .from('events')
    .select('id, title, description, start_at, end_at, url, source, location, is_online, is_free, price, tags, region')
    .gte('start_at', startOf)
    .lt('start_at', endOf)
    .order('start_at', { ascending: true })

  const tagsParam = searchParams.get('tags')
  if (tagsParam) {
    const tags = tagsParam.split(',').map((t) => t.trim()).filter(Boolean)
    if (tags.length > 0) {
      query = query.overlaps('tags', tags)
    }
  }

  const isOnlineParam = searchParams.get('is_online')
  if (isOnlineParam !== null) {
    query = query.eq('is_online', isOnlineParam === 'true')
  }

  const isFreeParam = searchParams.get('is_free')
  if (isFreeParam !== null) {
    query = query.eq('is_free', isFreeParam === 'true')
  }

  const region = searchParams.get('region')
  if (region) {
    query = query.eq('region', region)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ events: data })
}
