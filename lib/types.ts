export type EventSource = 'connpass' | 'doorkeeper' | 'techplay' | 'ical_calendar'

export type Event = {
  id: string
  title: string
  description: string | null
  start_at: string
  end_at: string | null
  url: string
  source: EventSource
  external_id: string
  location: string | null
  is_online: boolean
  is_free: boolean | null
  price: number | null
  tags: string[] | null
  region: string | null
  created_at: string
  updated_at: string
}

export type EventInsert = Omit<Event, 'id' | 'created_at' | 'updated_at'>

export type FilterParams = {
  year: number
  month: number
  tags?: string[]
  is_online?: boolean
  is_free?: boolean
  region?: string
}
