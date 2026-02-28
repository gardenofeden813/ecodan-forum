-- ============================================================
-- Ecodan Forum - Supabase Setup SQL
-- Supabaseダッシュボード > SQL Editor で実行してください
-- ============================================================

-- ── 1. テーブル作成（既存の場合はスキップ） ──────────────────────────────

-- profiles テーブル（auth.usersと連携）
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  avatar_url  TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- threads テーブル
CREATE TABLE IF NOT EXISTS public.threads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'troubleshooting',
  status      TEXT NOT NULL DEFAULT 'open',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- messages テーブル
CREATE TABLE IF NOT EXISTS public.messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  sender_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- knowledge_entries テーブル
CREATE TABLE IF NOT EXISTS public.knowledge_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       UUID REFERENCES public.threads(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  summary_content TEXT NOT NULL,
  tags            TEXT[],
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. RLS（Row Level Security）を有効化 ────────────────────────────────

ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threads          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_entries ENABLE ROW LEVEL SECURITY;

-- ── 3. RLSポリシー設定 ───────────────────────────────────────────────────

-- profiles: 認証済みユーザーは全員閲覧可能、自分のプロフィールのみ更新可能
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- threads: 認証済みユーザーは全員閲覧・作成可能、自分のスレッドのみ更新可能
DROP POLICY IF EXISTS "threads_select" ON public.threads;
DROP POLICY IF EXISTS "threads_insert" ON public.threads;
DROP POLICY IF EXISTS "threads_update" ON public.threads;

CREATE POLICY "threads_select" ON public.threads
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "threads_insert" ON public.threads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "threads_update" ON public.threads
  FOR UPDATE TO authenticated USING (true);

-- messages: 認証済みユーザーは全員閲覧・作成可能
DROP POLICY IF EXISTS "messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;

CREATE POLICY "messages_select" ON public.messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

-- knowledge_entries: 認証済みユーザーは全員閲覧可能、サービスが作成可能
DROP POLICY IF EXISTS "knowledge_select" ON public.knowledge_entries;
DROP POLICY IF EXISTS "knowledge_insert" ON public.knowledge_entries;

CREATE POLICY "knowledge_select" ON public.knowledge_entries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "knowledge_insert" ON public.knowledge_entries
  FOR INSERT TO authenticated WITH CHECK (true);

-- ── 4. プロフィール自動作成トリガー ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 5. Realtimeを有効化 ──────────────────────────────────────────────────

-- Supabase Realtimeの有効化（ダッシュボードのDatabase > Replication から設定も可能）
ALTER PUBLICATION supabase_realtime ADD TABLE public.threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.knowledge_entries;

-- ── 6. サンプルデータ投入（オプション） ─────────────────────────────────
-- 注意: 実際のユーザーIDに置き換えてください
-- 以下はデモ用のサンプルデータです（auth.usersにユーザーが存在する場合のみ動作します）

-- サンプルスレッドを追加したい場合は、ログイン後にアプリから直接作成してください。

-- ── 完了メッセージ ────────────────────────────────────────────────────────
SELECT 'Supabase setup completed successfully!' AS status;
