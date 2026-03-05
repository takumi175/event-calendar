import axios from 'axios'
import type { EventInsert } from '../types'

const BASE_URL = 'https://connpass.com/api/v1/event/'

type ConnpassEvent = {
  event_id: number
  title: string
  catch: string
  description: string
  event_url: string
  started_at: string
  ended_at: string | null
  place: string | null
  address: string | null
  limit: number | null
  accepted: number
  waiting: number
  updated_at: string
}

type ConnpassResponse = {
  results_returned: number
  results_available: number
  results_start: number
  events: ConnpassEvent[]
}

function detectRegion(place: string | null, address: string | null): string | null {
  const text = `${place ?? ''} ${address ?? ''}`
  if (!text.trim()) return null
  const prefectures: Record<string, string> = {
    東京: '東京', 大阪: '大阪', 神奈川: '神奈川', 愛知: '愛知',
    福岡: '福岡', 北海道: '北海道', 宮城: '宮城', 広島: '広島',
    京都: '京都', 埼玉: '埼玉', 千葉: '千葉',
  }
  for (const [key, value] of Object.entries(prefectures)) {
    if (text.includes(key)) return value
  }
  return null
}

function mapToEventInsert(e: ConnpassEvent): EventInsert {
  const isOnline = !e.place && !e.address
  const region = isOnline ? 'オンライン' : detectRegion(e.place, e.address)

  return {
    title: e.title,
    description: e.catch || null,
    start_at: e.started_at,
    end_at: e.ended_at ?? null,
    url: e.event_url,
    source: 'connpass',
    external_id: String(e.event_id),
    location: e.place ?? (isOnline ? 'オンライン' : null),
    is_online: isOnline,
    is_free: null,
    price: null,
    tags: null,
    region,
  }
}

export async function fetchConnpassEvents(): Promise<EventInsert[]> {
  const events: EventInsert[] = []
  const now = new Date()

  // 今月から3ヶ月分を取得
  const months: string[] = []
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
    months.push(ym)
  }

  for (const ym of months) {
    let start = 1
    while (true) {
      let res
      try {
        res = await axios.get<ConnpassResponse>(BASE_URL, {
          params: { ym, count: 100, start, order: 2 },
          timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EventCalendarBot/1.0)' },
        })
      } catch (err) {
        // connpass API v1 は CloudFront WAF によりサーバーサイドからブロックされる場合がある
        console.warn(`[connpass] ym=${ym} failed:`, err instanceof Error ? err.message : err)
        break
      }
      const { events: items, results_available, results_returned } = res.data
      events.push(...items.map(mapToEventInsert))

      if (start + results_returned - 1 >= results_available) break
      start += results_returned
    }
  }

  return events
}
