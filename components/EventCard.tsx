import type { Event } from '@/lib/types'

type Props = {
  event: Omit<Event, 'created_at' | 'updated_at' | 'external_id' | 'source'> & Partial<Event>
  compact?: boolean
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getMonth() + 1}月${d.getDate()}日(${days[d.getDay()]}) ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function EventCard({ event, compact = false }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className={`font-bold text-gray-900 leading-snug ${compact ? 'text-base' : 'text-xl'}`}>
        {event.title}
      </h2>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
        <span>🗓 {formatDate(event.start_at)}</span>
        {event.end_at && <span>〜 {formatDate(event.end_at)}</span>}
        {event.location && <span>📍 {event.location}</span>}
        {event.is_online && (
          <span className="text-blue-600 font-medium">オンライン</span>
        )}
        {event.is_free === true && (
          <span className="text-green-600 font-medium">無料</span>
        )}
        {event.is_free === false && event.price != null && (
          <span className="text-gray-600">¥{event.price.toLocaleString()}</span>
        )}
      </div>

      {event.tags && event.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {event.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {!compact && event.description && (
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line line-clamp-5">
          {event.description.replace(/<[^>]+>/g, '')}
        </p>
      )}

      <a
        href={event.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-fit items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
      >
        詳細・申込はこちら →
      </a>
    </div>
  )
}
