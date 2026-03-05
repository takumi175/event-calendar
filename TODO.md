# 実装TODO

## Phase 1: プロジェクトセットアップ

- [x] Next.js 14プロジェクトを作成する (`npx create-next-app@latest`)
  - TypeScript / Tailwind CSS / App Router を有効化
- [x] 依存パッケージをインストールする
  - `@supabase/supabase-js`
  - `cheerio`
  - `axios`
- [x] `.env.local` ファイルを作成し、環境変数のテンプレートを記載する
- [x] `vercel.json` を作成してCronスケジュールを設定する

## Phase 2: Supabaseセットアップ

- [ ] Supabaseプロジェクトを作成する（無料プラン）
- [x] `events` テーブルをCLAUDE.mdのスキーマに従って作成する
- [x] `tags` カラムにGINインデックスを作成する（配列検索の高速化）
- [x] `start_at` カラムにインデックスを作成する（月別絞り込みの高速化）
- [x] `lib/supabase.ts` にクライアントを実装する（サーバー用・クライアント用）

## Phase 3: データ収集（スクレイパー）

- [x] `lib/scrapers/connpass.ts` を実装する
  - connpass APIから今日〜3ヶ月先のイベントを取得
  - レスポンスを `events` テーブルの型にマッピング
- [x] `lib/scrapers/doorkeeper.ts` を実装する
  - Doorkeeper APIから同様に取得・マッピング
- [x] `lib/scrapers/techplay.ts` を実装する
  - cheerioでHTMLをスクレイピング・パース
- [x] `app/api/cron/route.ts` を実装する
  - 全スクレイパーを呼び出してSupabaseにupsertする
  - `CRON_SECRET` による認証ガードを追加する

## Phase 4: バックエンドAPI

- [x] `lib/types.ts` に共通型定義を記載する (`Event`, `FilterParams` など)
- [x] `app/api/events/route.ts` を実装する
  - クエリパラメータ（year, month, tags, is_online, is_free, region）を受け取る
  - Supabaseで該当月のイベントをフィルタリングして返す

## Phase 5: フロントエンド

- [x] `components/FilterPanel.tsx` を実装する
  - タグ・開催形式・地域・参加費のフィルターUI
  - 状態はURLクエリパラメータで管理する
- [x] `components/EventCard.tsx` を実装する
  - タイトル・日時・場所・タグ・元サイトリンクを表示
- [x] `components/Calendar.tsx` を実装する
  - 月表示グリッド
  - 前月・翌月への移動
  - 各日付セルにイベントをリスト表示
  - イベントクリックで詳細モーダルを開く
- [x] `app/page.tsx` を実装する
  - FilterPanel + Calendar を配置
  - `/api/events` からデータを取得する
- [x] `app/events/[id]/page.tsx` を実装する
  - イベント詳細ページ（タイトル・説明・日時・場所・参加費・タグ・外部リンク）

## Phase 6: デプロイ

- [x] GitHubリポジトリを作成してプッシュする
- [x] Vercelプロジェクトを作成してGitHubと連携する
- [x] Vercelに環境変数を設定する
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CRON_SECRET`
- [x] 本番デプロイして動作確認する
- [ ] Cron Jobが正しく動作するか確認する（Vercelダッシュボードのログで確認）

## Phase 7: 動作確認・調整

- [ ] 各スクレイパーで実データが正しく取得・保存されるか確認する
- [ ] フィルターの組み合わせが正しく動作するか確認する
- [ ] モバイル表示のレイアウトを確認・調整する
- [ ] Supabaseの無料枠（500MB / 月50万リクエスト）の使用量を確認する
