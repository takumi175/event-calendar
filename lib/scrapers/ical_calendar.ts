import axios from 'axios'
import type { EventInsert } from '../types'

// IT勉強会カレンダー (Google Calendar 公開ICS)
const ICS_URL =
  'https://calendar.google.com/calendar/ical/fvijvohm91uifvd9hratehf65k%40group.calendar.google.com/public/basic.ics'

function unfoldLines(content: string): string {
  // ICS の折り返し行（スペース/タブ始まり）を結合
  return content.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '')
}

function parseICSDate(value: string, tzid?: string): string | null {
  // DATE-TIME UTC:  20260326T090000Z
  // DATE-TIME with TZID:  20260326T180000
  // DATE only:  20260326
  const utcMatch = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/)
  if (utcMatch) {
    const [, y, mo, d, h, m, s] = utcMatch
    return new Date(`${y}-${mo}-${d}T${h}:${m}:${s}Z`).toISOString()
  }
  const localMatch = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/)
  if (localMatch) {
    const [, y, mo, d, h, m, s] = localMatch
    // TZID が Asia/Tokyo の場合は +09:00 として扱う
    const offset = tzid?.includes('Tokyo') ? '+09:00' : '+09:00'
    return new Date(`${y}-${mo}-${d}T${h}:${m}:${s}${offset}`).toISOString()
  }
  const dateMatch = value.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (dateMatch) {
    const [, y, mo, d] = dateMatch
    return new Date(`${y}-${mo}-${d}T00:00:00+09:00`).toISOString()
  }
  return null
}

function detectRegion(text: string): string | null {
  // SUMMARY に [東京] 形式でタグが入ることが多い
  const bracketMatch = text.match(/[[\[［]([^\]］]+)[]\]］]/)
  if (bracketMatch) {
    const tag = bracketMatch[1]
    const prefectures: Record<string, string> = {
      東京: '東京', 大阪: '大阪', 神奈川: '神奈川', 愛知: '愛知',
      福岡: '福岡', 北海道: '北海道', 宮城: '宮城', 広島: '広島',
      京都: '京都', 埼玉: '埼玉', 千葉: '千葉', 名古屋: '愛知',
      オンライン: 'オンライン', online: 'オンライン',
    }
    for (const [key, value] of Object.entries(prefectures)) {
      if (tag.toLowerCase().includes(key.toLowerCase())) return value
    }
  }
  return null
}

export async function fetchICalCalendarEvents(): Promise<EventInsert[]> {
  const res = await axios.get<string>(ICS_URL, {
    timeout: 55000,
    responseType: 'text',
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EventCalendarBot/1.0)' },
  })

  const content = unfoldLines(res.data)
  const events: EventInsert[] = []
  const now = new Date()
  const threeMonthsLater = new Date()
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3)

  // VEVENT ブロックを抽出
  const blocks = content.split('BEGIN:VEVENT')
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split('END:VEVENT')[0]
    const props: Record<string, string> = {}

    for (const line of block.split(/\r?\n/)) {
      const sep = line.indexOf(':')
      if (sep === -1) continue
      const key = line.substring(0, sep).toUpperCase()
      const val = line.substring(sep + 1).trim()
      props[key] = val
    }

    const uid = props['UID'] ?? ''
    const summary = props['SUMMARY'] ?? ''
    const description = props['DESCRIPTION'] ?? ''
    const location = props['LOCATION'] ?? ''

    // DTSTART のキーは DTSTART または DTSTART;TZID=Asia/Tokyo 形式
    const dtStartKey = Object.keys(props).find(k => k.startsWith('DTSTART')) ?? ''
    const dtEndKey = Object.keys(props).find(k => k.startsWith('DTEND')) ?? ''
    const tzid = dtStartKey.includes('TZID=') ? dtStartKey.split('TZID=')[1] : undefined

    const startAt = parseICSDate(props[dtStartKey] ?? '', tzid)
    const endAt = parseICSDate(props[dtEndKey] ?? '', tzid)

    if (!startAt || !uid || !summary) continue

    const startDate = new Date(startAt)
    if (startDate < now || startDate > threeMonthsLater) continue

    const isOnline = location.includes('オンライン') || location.toLowerCase().includes('online') || !location
    const region = detectRegion(summary) ?? detectRegion(location) ?? (isOnline ? 'オンライン' : null)

    // URL は DESCRIPTION の最初の URL を使う
    const urlMatch = description.match(/https?:\/\/[^\s\\]+/)
    const url = urlMatch ? urlMatch[0] : ''
    if (!url) continue

    events.push({
      title: summary.replace(/^[[\[［][^\]］]*[]\]］]\s*/, '').trim() || summary,
      description: null,
      start_at: startAt,
      end_at: endAt,
      url,
      source: 'ical_calendar',
      external_id: uid,
      location: location || (isOnline ? 'オンライン' : null),
      is_online: isOnline,
      is_free: null,
      price: null,
      tags: null,
      region,
    })
  }

  return events
}
