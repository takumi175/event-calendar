'use client'

import { useState, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import EventCard from './EventCard'
import type { Event } from '@/lib/types'

type Props = {
  events: Event[]
  year: number
  month: number
}

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']
const MAX_EVENTS_PER_CELL = 3

type CalendarEvent = Omit<Event, 'created_at' | 'updated_at' | 'external_id' | 'source'> & Partial<Event>

export default function Calendar({ events, year, month }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  const navigateMonth = useCallback(
    (delta: number) => {
      const d = new Date(year, month - 1 + delta, 1)
      const params = new URLSearchParams(searchParams.toString())
      params.set('year', String(d.getFullYear()))
      params.set('month', String(d.getMonth() + 1))
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [year, month, router, pathname, searchParams],
  )

  // カレンダーグリッドの日付を生成
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate()

  const cells: { date: number; currentMonth: boolean }[] = []
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    cells.push({ date: daysInPrevMonth - i, currentMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: d, currentMonth: true })
  }
  const remaining = 7 - (cells.length % 7)
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      cells.push({ date: d, currentMonth: false })
    }
  }

  // 日付 → イベント のマップ
  const eventsByDay: Record<number, Event[]> = {}
  for (const event of events) {
    const d = new Date(event.start_at).getDate()
    if (!eventsByDay[d]) eventsByDay[d] = []
    eventsByDay[d].push(event)
  }

  const today = new Date()
  const isToday = (day: number) =>
    today.getFullYear() === year &&
    today.getMonth() + 1 === month &&
    today.getDate() === day

  const monthLabel = `${year}年${month}月`

  return (
    <>
      {/* ヘッダー */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => navigateMonth(-1)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          ← 前月
        </button>
        <h2 className="text-lg font-bold text-gray-900">{monthLabel}</h2>
        <button
          onClick={() => navigateMonth(1)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          翌月 →
        </button>
      </div>

      {/* イベント件数 */}
      <p className="mb-3 text-sm text-gray-500">{events.length} 件のイベント</p>

      {/* カレンダーグリッド */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {DAY_LABELS.map((label, i) => (
            <div
              key={label}
              className={`py-2 text-center text-xs font-semibold ${
                i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        {/* 日付セル */}
        <div className="grid grid-cols-7">
          {cells.map((cell, idx) => {
            const dayEvents = cell.currentMonth ? (eventsByDay[cell.date] ?? []) : []
            const overflowCount = dayEvents.length - MAX_EVENTS_PER_CELL
            const colIndex = idx % 7

            return (
              <div
                key={idx}
                className={`min-h-[90px] border-b border-r border-gray-100 p-1 ${
                  !cell.currentMonth ? 'bg-gray-50' : ''
                } ${colIndex === 6 ? 'border-r-0' : ''}`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    !cell.currentMonth
                      ? 'text-gray-300'
                      : isToday(cell.date)
                      ? 'bg-indigo-600 text-white'
                      : colIndex === 0
                      ? 'text-red-500'
                      : colIndex === 6
                      ? 'text-blue-500'
                      : 'text-gray-700'
                  }`}
                >
                  {cell.date}
                </span>

                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, MAX_EVENTS_PER_CELL).map((event) => (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="w-full truncate rounded bg-indigo-50 px-1 py-0.5 text-left text-xs text-indigo-700 hover:bg-indigo-100 transition-colors"
                    >
                      {event.title}
                    </button>
                  ))}
                  {overflowCount > 0 && (
                    <p className="pl-1 text-xs text-gray-400">+{overflowCount} 件</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* モーダル */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                {selectedEvent.source}
              </span>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label="閉じる"
              >
                ✕
              </button>
            </div>
            <EventCard event={selectedEvent} />
          </div>
        </div>
      )}
    </>
  )
}
