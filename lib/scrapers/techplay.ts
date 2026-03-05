import axios from 'axios'
import * as cheerio from 'cheerio'
import type { EventInsert } from '../types'

const BASE_URL = 'https://techplay.jp/event/search'

function parsePrice(text: string): { is_free: boolean; price: number | null } {
  const normalized = text.replace(/[,，、\s]/g, '')
  if (normalized.includes('無料') || normalized.includes('free') || normalized === '0円') {
    return { is_free: true, price: 0 }
  }
  const match = normalized.match(/(\d+)円/)
  if (match) {
    return { is_free: false, price: parseInt(match[1], 10) }
  }
  return { is_free: false, price: null }
}

function detectRegion(location: string): string | null {
  const prefectures: Record<string, string> = {
    東京: '東京', 大阪: '大阪', 神奈川: '神奈川', 愛知: '愛知',
    福岡: '福岡', 北海道: '北海道', 宮城: '宮城', 広島: '広島',
    京都: '京都', 埼玉: '埼玉', 千葉: '千葉',
  }
  for (const [key, value] of Object.entries(prefectures)) {
    if (location.includes(key)) return value
  }
  if (location.includes('オンライン') || location.toLowerCase().includes('online')) {
    return 'オンライン'
  }
  return null
}

export async function fetchTechPlayEvents(): Promise<EventInsert[]> {
  const events: EventInsert[] = []
  let page = 1
  const now = new Date()
  const threeMonthsLater = new Date(now.getFullYear(), now.getMonth() + 3, 0)

  while (true) {
    const res = await axios.get<string>(BASE_URL, {
      params: { page, sort: 3 },
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EventCalendarBot/1.0)' },
    })

    const $ = cheerio.load(res.data)
    const cards = $('.event-list-item, .eventCard, [class*="event-item"]')

    if (cards.length === 0) break

    let reachedLimit = false
    cards.each((_, el) => {
      const $el = $(el)

      const title = $el.find('[class*="title"], h3, h2').first().text().trim()
      const href = $el.find('a').first().attr('href') ?? ''
      const url = href.startsWith('http') ? href : `https://techplay.jp${href}`
      const externalId = href.replace(/\/$/, '').split('/').pop() ?? ''

      const dateText = $el.find('[class*="date"], time, [class*="time"]').first().text().trim()
      const startAt = parseDateText(dateText)
      if (!startAt) return

      if (new Date(startAt) > threeMonthsLater) {
        reachedLimit = true
        return
      }

      const locationText = $el.find('[class*="place"], [class*="venue"], [class*="location"]').first().text().trim()
      const isOnline = locationText.includes('オンライン') || locationText.toLowerCase().includes('online')
      const region = detectRegion(locationText) ?? (isOnline ? 'オンライン' : null)

      const priceText = $el.find('[class*="price"], [class*="fee"]').first().text().trim()
      const { is_free, price } = priceText ? parsePrice(priceText) : { is_free: null, price: null }

      if (!title || !externalId) return

      events.push({
        title,
        description: null,
        start_at: startAt,
        end_at: null,
        url,
        source: 'techplay',
        external_id: externalId,
        location: locationText || (isOnline ? 'オンライン' : null),
        is_online: isOnline,
        is_free,
        price,
        tags: null,
        region,
      })
    })

    if (reachedLimit || cards.length < 20) break
    page++
  }

  return events
}

function parseDateText(text: string): string | null {
  // "2026/03/15 19:00" や "2026年3月15日 19:00" 形式を想定
  const slashMatch = text.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})[^\d]*(\d{1,2}):(\d{2})/)
  if (slashMatch) {
    const [, y, mo, d, h, m] = slashMatch
    return new Date(`${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T${h.padStart(2, '0')}:${m}:00+09:00`).toISOString()
  }
  const jpMatch = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日[^\d]*(\d{1,2}):(\d{2})/)
  if (jpMatch) {
    const [, y, mo, d, h, m] = jpMatch
    return new Date(`${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T${h.padStart(2, '0')}:${m}:00+09:00`).toISOString()
  }
  return null
}
