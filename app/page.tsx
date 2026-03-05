import { Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import Calendar from '@/components/Calendar'
import FilterPanel from '@/components/FilterPanel'
import type { Event } from '@/lib/types'

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams
  const now = new Date()
  const year = parseInt(String(params.year ?? now.getFullYear()), 10)
  const month = parseInt(String(params.month ?? (now.getMonth() + 1)), 10)

  const startOf = new Date(year, month - 1, 1).toISOString()
  const endOf = new Date(year, month, 1).toISOString()

  let query = supabase
    .from('events')
    .select('id, title, description, start_at, end_at, url, source, location, is_online, is_free, price, tags, region')
    .gte('start_at', startOf)
    .lt('start_at', endOf)
    .order('start_at', { ascending: true })

  const tags = params.tags ? String(params.tags).split(',').filter(Boolean) : []
  if (tags.length > 0) {
    query = query.overlaps('tags', tags)
  }
  if (params.is_online !== undefined) {
    query = query.eq('is_online', params.is_online === 'true')
  }
  if (params.is_free !== undefined) {
    query = query.eq('is_free', params.is_free === 'true')
  }
  if (params.region) {
    query = query.eq('region', String(params.region))
  }

  const { data } = await query
  const events = (data ?? []) as unknown as Event[]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-xl font-bold text-gray-900">エンジニアイベントカレンダー</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            大学生から参加できるエンジニア向けイベントを毎日自動収集
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <Suspense>
          <FilterPanel />
        </Suspense>
        <Suspense>
          <Calendar events={events} year={year} month={month} />
        </Suspense>
      </div>
    </div>
  )
}
