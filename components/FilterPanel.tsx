'use client'

import { useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

const TAGS = [
  'フロントエンド', 'バックエンド', 'インフラ', 'AI/ML',
  'セキュリティ', 'ハッカソン', '就活', 'React',
  'TypeScript', 'Python', 'Go', 'Rust',
]

const REGIONS = ['東京', '大阪', '神奈川', '愛知', '福岡', '北海道', '宮城', '広島', '京都', '埼玉', '千葉', 'オンライン']

export default function FilterPanel() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const update = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === null || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      // フィルター変更時は月をリセットしない
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  const toggleTag = useCallback(
    (tag: string) => {
      const current = searchParams.get('tags')?.split(',').filter(Boolean) ?? []
      const next = current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag]
      update('tags', next.length > 0 ? next.join(',') : null)
    },
    [searchParams, update],
  )

  const selectedTags = searchParams.get('tags')?.split(',').filter(Boolean) ?? []
  const isOnline = searchParams.get('is_online')
  const isFree = searchParams.get('is_free')
  const region = searchParams.get('region') ?? ''

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
      {/* タグ */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">ジャンル</p>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                selectedTags.includes(tag)
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-indigo-400 hover:text-indigo-600'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        {/* 開催形式 */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">開催形式</p>
          <div className="flex gap-2">
            {[
              { label: 'すべて', value: null },
              { label: 'オンライン', value: 'true' },
              { label: 'オフライン', value: 'false' },
            ].map(({ label, value }) => (
              <button
                key={label}
                onClick={() => update('is_online', value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  isOnline === value
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-indigo-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 参加費 */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">参加費</p>
          <div className="flex gap-2">
            {[
              { label: 'すべて', value: null },
              { label: '無料のみ', value: 'true' },
            ].map(({ label, value }) => (
              <button
                key={label}
                onClick={() => update('is_free', value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  isFree === value
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-indigo-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 地域 */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">地域</p>
          <select
            value={region}
            onChange={(e) => update('region', e.target.value || null)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">すべて</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
