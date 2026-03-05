# Event Calendar - エンジニアイベントカレンダー

大学生を含む誰でも参加できるエンジニア向けイベントを一覧できるカレンダーアプリ。

## プロジェクト概要

外部サービス（connpass / Doorkeeper など）からイベント情報を自動収集し、月表示カレンダーで見やすく提示する。ログイン不要で誰でも閲覧・検索できる。

## 技術スタック

| 役割 | 技術 |
|------|------|
| フロントエンド | Next.js 14 (App Router) |
| スタイリング | Tailwind CSS |
| データベース | Supabase (PostgreSQL) |
| デプロイ | Vercel |
| スクレイピング/取得 | Vercel Cron Jobs + connpass API + Doorkeeper API + cheerio |

## ディレクトリ構成

```
event-calendar/
├── app/
│   ├── page.tsx              # カレンダートップ
│   ├── events/[id]/page.tsx  # イベント詳細
│   └── api/
│       ├── events/route.ts   # イベント一覧取得API
│       └── cron/route.ts     # 日次スクレイピングCron
├── components/
│   ├── Calendar.tsx          # 月表示カレンダー
│   ├── EventCard.tsx         # イベントカード
│   └── FilterPanel.tsx       # フィルターUI
├── lib/
│   ├── supabase.ts           # Supabaseクライアント
│   ├── scrapers/
│   │   ├── connpass.ts       # connpass API連携
│   │   ├── doorkeeper.ts     # Doorkeeper API連携
│   │   └── techplay.ts       # TECH PLAYスクレイピング
│   └── types.ts              # 型定義
├── vercel.json               # Cronスケジュール設定
└── CLAUDE.md
```

## データモデル

### events テーブル (Supabase)

```sql
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
```

## 機能仕様

### 1. カレンダー表示

- 月表示（前月・翌月への移動ボタンあり）
- 各日付セルにその日のイベント件数 or タイトルを表示
- イベントをクリックで詳細モーダル or 詳細ページへ遷移

### 2. フィルタリング

以下の条件でフィルタリングできる（複数組み合わせ可）:

- **ジャンル / タグ**: フロントエンド、バックエンド、インフラ、AI/ML、セキュリティ、ハッカソン、就活 など
- **開催形式**: オンライン / オフライン
- **地域**: 東京、大阪、名古屋、福岡、オンライン など
- **参加費**: 無料のみ / 有料含む

### 3. イベント詳細

- タイトル、日時、場所、参加費、説明文
- 元サイトへのリンク（外部リンク）
- タグ一覧

### 4. データ収集（日次バッチ）

- Vercel Cron Jobs で毎日 JST 03:00 に実行
- connpass API、Doorkeeper API、必要に応じてcheerioでスクレイピング
- `(source, external_id)` のユニーク制約で重複を防ぐ
- 取得対象: 今日から3ヶ月先までのイベント

## API仕様

### GET /api/events

イベント一覧を返す。

**クエリパラメータ:**

| パラメータ | 型 | 説明 |
|---|---|---|
| year | number | 年（例: 2026） |
| month | number | 月（例: 3） |
| tags | string | カンマ区切りタグ（例: React,AI） |
| is_online | boolean | オンラインのみ |
| is_free | boolean | 無料のみ |
| region | string | 地域名 |

**レスポンス:**

```json
{
  "events": [
    {
      "id": "uuid",
      "title": "React勉強会 vol.12",
      "start_at": "2026-03-15T19:00:00+09:00",
      "location": "オンライン",
      "is_online": true,
      "is_free": true,
      "tags": ["React", "フロントエンド"],
      "url": "https://connpass.com/event/..."
    }
  ]
}
```

### POST /api/cron (Vercel Cron専用)

外部サービスからイベントを取得してDBに保存する。
`Authorization: Bearer {CRON_SECRET}` ヘッダーで保護。

## 環境変数

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
```

## Vercel Cron設定 (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 18 * * *"
    }
  ]
}
```

※ VercelのcronスケジュールはUTC。JST 03:00 = UTC 18:00（前日）。

## 開発コマンド

```bash
npm install
npm run dev       # 開発サーバー起動 (localhost:3000)
npm run build     # 本番ビルド
npm run lint      # ESLint
```

## コーディング規約

- TypeScript strict mode を使用
- コンポーネントはsrc/components配下にまとめる
- Supabaseへのアクセスはlib/supabase.tsを通じて行う
- スクレイパーは各ソースごとにlib/scrapers/に分離する
- APIレスポンスは必ずエラーハンドリングを含める
