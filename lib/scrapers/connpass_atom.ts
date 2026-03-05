import axios from 'axios'
import * as cheerio from 'cheerio'
import type { EventInsert } from '../types'

const BASE_URL = 'https://connpass.com/explore/ja.atom'
const UA = 'Mozilla/5.0 (compatible; EventCalendarBot/1.0)'

// 取得するキーワード（空文字 = 全件フィード）
const KEYWORDS = ['', 'ハッカソン', 'AI', 'セキュリティ', 'インフラ', '就活']

function detectRegion(text: string): string | null {
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

function parseSummary(html: string): { startAt: string | null; endAt: string | null; location: string | null } {
  // サマリー例: "開催日時: 2026/03/26 18:00 ～ 21:00<br />開催場所: 東京都渋谷区..."
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

  const dateMatch = text.match(/開催日時[:：]\s*(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})(?:\s*[～〜]\s*(\d{1,2}):(\d{2}))?/)
  let startAt: string | null = null
  let endAt: string | null = null
  if (dateMatch) {
    const [, y, mo, d, h, m, eh, em] = dateMatch
    const pad = (n: string) => n.padStart(2, '0')
    startAt = `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${m}:00+09:00`
    if (eh && em) {
      endAt = `${y}-${pad(mo)}-${pad(d)}T${pad(eh)}:${em}:00+09:00`
    }
  }

  const locationMatch = text.match(/開催場所[:：]\s*(.+?)(?:\n|$|\s{2,})/)
  const location = locationMatch ? locationMatch[1].trim() : null

  return { startAt, endAt, location }
}

export async function fetchConnpassAtomEvents(): Promise<EventInsert[]> {
  const seen = new Set<string>()
  const events: EventInsert[] = []
  const now = new Date()

  for (const keyword of KEYWORDS) {
    try {
      const res = await axios.get<string>(BASE_URL, {
        params: keyword ? { keyword } : {},
        timeout: 10000,
        headers: { 'User-Agent': UA },
        responseType: 'text',
      })

      const $ = cheerio.load(res.data, { xmlMode: true })

      $('entry').each((_, el) => {
        const title = $(el).find('title').text().trim()
        const rawUrl = $(el).find('link').attr('href') ?? ''
        // UTMパラメータを除去してクリーンなURLを取得
        const url = rawUrl.split('?')[0].replace(/\/$/, '')
        const summaryHtml = $(el).find('summary').text()

        const idMatch = url.match(/\/event\/(\d+)/)
        const externalId = idMatch ? idMatch[1] : ''
        if (!title || !externalId || seen.has(externalId)) return
        seen.add(externalId)

        const { startAt, endAt, location } = parseSummary(summaryHtml)
        if (!startAt) return
        if (new Date(startAt) < now) return

        const isOnline = !location || location.includes('オンライン') || location.toLowerCase().includes('online')
        const region = isOnline ? 'オンライン' : detectRegion(location ?? '')

        events.push({
          title,
          description: null,
          start_at: startAt,
          end_at: endAt,
          url: `${url}/`,
          source: 'connpass',
          external_id: externalId,
          location: location ?? (isOnline ? 'オンライン' : null),
          is_online: isOnline,
          is_free: null,
          price: null,
          tags: keyword ? [keyword] : null,
          region,
        })
      })
    } catch (err) {
      console.warn(`[connpass_atom] keyword="${keyword}" failed:`, err instanceof Error ? err.message : err)
    }
  }

  return events
}
