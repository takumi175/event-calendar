-- eventsテーブル作成
CREATE TABLE events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  description  TEXT,
  start_at     TIMESTAMPTZ NOT NULL,
  end_at       TIMESTAMPTZ,
  url          TEXT NOT NULL,
  source       TEXT NOT NULL,       -- 'connpass' | 'doorkeeper' | 'techplay'
  external_id  TEXT NOT NULL,       -- ソース側のID（重複取込防止）
  location     TEXT,                -- オフライン会場名 or 'オンライン'
  is_online    BOOLEAN DEFAULT false,
  is_free      BOOLEAN,
  price        INTEGER,             -- 円、nullは不明
  tags         TEXT[],              -- ['React', 'インフラ', 'AI'] など
  region       TEXT,                -- '東京' | '大阪' | 'オンライン' など
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (source, external_id)
);

-- tagsカラムへのGINインデックス（配列検索の高速化）
CREATE INDEX idx_events_tags ON events USING GIN (tags);

-- start_atカラムへのインデックス（月別絞り込みの高速化）
CREATE INDEX idx_events_start_at ON events (start_at);

-- updated_atを自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
