import axios from 'axios'
import type { EventInsert } from '../types'

const BASE_URL = 'https://api.doorkeeper.jp/events'

type DoorkeeperTicketType = {
  price: number
  name: string
}

type DoorkeeperEventItem = {
  event: {
    id: number
    title: string
    description: string | null
    starts_at: string
    ends_at: string | null
    venue_name: string | null
    address: string | null
    public_url: string
    ticket_limit: number | null
    ticket_types: DoorkeeperTicketType[]
    group: { name: string } | null
  }
}

function detectRegion(venue: string | null, address: string | null): string | null {
  const text = `${venue ?? ''} ${address ?? ''}`
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

function mapToEventInsert(item: DoorkeeperEventItem): EventInsert {
  const e = item.event
  const isOnline = !e.venue_name && !e.address
  const region = isOnline ? 'オンライン' : detectRegion(e.venue_name, e.address)

  const minPrice = e.ticket_types.length > 0
    ? Math.min(...e.ticket_types.map((t) => t.price))
    : null
  const isFree = minPrice !== null ? minPrice === 0 : null

  return {
    title: e.title,
    description: e.description ?? null,
    start_at: e.starts_at,
    end_at: e.ends_at ?? null,
    url: e.public_url,
    source: 'doorkeeper',
    external_id: String(e.id),
    location: e.venue_name ?? (isOnline ? 'オンライン' : null),
    is_online: isOnline,
    is_free: isFree,
    price: minPrice,
    tags: null,
    region,
  }
}

export async function fetchDoorkeeperEvents(): Promise<EventInsert[]> {
  const events: EventInsert[] = []
  const now = new Date()
  const since = now.toISOString().split('T')[0]
  const until = new Date(now.getFullYear(), now.getMonth() + 3, 0)
    .toISOString()
    .split('T')[0]

  let page = 1
  while (true) {
    const res = await axios.get<DoorkeeperEventItem[]>(BASE_URL, {
      params: { since, until, per_page: 100, page, locale: 'ja' },
      timeout: 10000,
    })
    if (res.data.length === 0) break
    events.push(...res.data.map(mapToEventInsert))
    if (res.data.length < 100) break
    page++
  }

  return events
}
