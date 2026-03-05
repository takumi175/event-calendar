import axios from 'axios'
import * as cheerio from 'cheerio'
import type { EventInsert } from '../types'

const BASE_URL = 'https://techplay.jp/event/search'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function detectRegion(location: string): string | null {
  if (location.includes('オンライン') || location.toLowerCase().includes('online')) return 'オンライン'
  const prefectures: Record<string, string> = {
    東京: '東京', 大阪: '大阪', 神奈川: '神奈川', 愛知: '愛知',
    福岡: '福岡', 北海道: '北海道', 宮城: '宮城', 広島: '広島',
    京都: '京都', 埼玉: '埼玉', 千葉: '千葉',
  }
  for (const [key, value] of Object.entries(prefectures)) {
    if (location.includes(key)) return value
  }
  return null
}

export async function fetchTechPlayEvents(): Promise<EventInsert[]> {
  const events: EventInsert[] = []
  const threeMonthsLater = new Date()
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3)

  let page = 1
  while (true) {
    const res = await axios.get<string>(BASE_URL, {
      params: { page, sort: 3 },
      timeout: 15000,
      headers: { 'User-Agent': UA },
    })

    const $ = cheerio.load(res.data)
    const cards = $('.eventlist-card')
    if (cards.length === 0) break

    let reachedLimit = false
    cards.each((_, el) => {
      const $el = $(el)

      // タイトルとURL: itemprop="url" を持つ <a> タグ
      const $link = $el.find('a[itemprop="url"]')
      const title = $link.find('[itemprop="name"]').text().trim() || $link.text().trim()
      const url = $link.attr('href') ?? ''
      if (!title || !url) return

      // external_id: URLの末尾の数字
      const idMatch = url.match(/\/events?\/(\d+)/)
      const externalId = idMatch ? idMatch[1] : ''
      if (!externalId) return

      // 開始日時: itemprop="startDate" の content 属性 (ISO形式)
      const startAt = $el.find('[itemprop="startDate"]').attr('content') ?? ''
      if (!startAt) return
      if (new Date(startAt) > threeMonthsLater) {
        reachedLimit = true
        return
      }

      const endAt = $el.find('[itemprop="endDate"]').attr('content') ?? null

      // 開催場所
      const locationText = $el.find('.eventlist-card-area').text().trim()
      const isOnline = locationText.includes('オンライン') || locationText.toLowerCase().includes('online')
      const region = detectRegion(locationText)

      events.push({
        title,
        description: null,
        start_at: startAt,
        end_at: endAt || null,
        url,
        source: 'techplay',
        external_id: externalId,
        location: locationText || (isOnline ? 'オンライン' : null),
        is_online: isOnline,
        is_free: null,
        price: null,
        tags: null,
        region,
      })
    })

    if (reachedLimit || cards.length < 20) break
    page++
  }

  return events
}
