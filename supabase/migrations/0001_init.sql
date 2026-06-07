-- 大局観道場: スキーマと全テーブル
-- 共有 Supabase 内にプロジェクト専用スキーマ taikyokukan を切る（他スキーマには触れない）
create schema if not exists taikyokukan;

-- 生徒（かんたんログイン: なまえ + あいことばのハッシュ。一閃と同方式）
create table if not exists taikyokukan.students (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  pass_hash text not null, -- SHA256("taikyokukan:name:pass")
  created_at timestamptz not null default now()
);

-- 局面プール（エンジン生成の受け皿。当面は is_sample=true のかり局面）
create table if not exists taikyokukan.positions (
  id uuid primary key default gen_random_uuid(),
  sfen text not null,
  eval_cp integer not null, -- 先手から見た評価値(cp)。±2000にクランプ済み
  best_move_usi text, -- 最善手(USI形式 例 7g7f)
  pv text[], -- 読み筋(USIの配列)
  style_tag text not null check (style_tag in ('ibisha', 'furibisha', 'other')),
  phase_tag text not null check (phase_tag in ('opening', 'middle', 'endgame')),
  is_sample boolean not null default false, -- true=テスト用のかり局面（かりの評価値）
  source text, -- 'sample' | 'engine' | 'import' など
  comment text,
  created_at timestamptz not null default now()
);
create index if not exists positions_pick_idx
  on taikyokukan.positions (is_sample, style_tag, phase_tag);

-- セッション（1回の練習 = 10〜20問）。終了時に集計を確定保存する
create table if not exists taikyokukan.sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references taikyokukan.students (id) on delete cascade,
  mode text not null default 'winrate' check (mode in ('winrate', 'cp')),
  style_filter text not null default 'all' check (style_filter in ('all', 'ibisha', 'furibisha')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  n_positions integer not null default 0,
  mean_abs_error double precision, -- 平均誤差（勝率pt 0..1）
  weighted_score double precision, -- 加重スコア 0..100
  signed_bias double precision, -- 符号付き誤差平均（＋=先手を高く見るクセ）
  best_streak integer not null default 0
);
create index if not exists sessions_student_idx
  on taikyokukan.sessions (student_id, started_at);

-- 1問ごとの予測と採点（実際値はスナップショット保存＝局面を後で編集しても記録が動かない）
create table if not exists taikyokukan.guesses (
  id bigint generated always as identity primary key,
  session_id uuid not null references taikyokukan.sessions (id) on delete cascade,
  student_id uuid not null references taikyokukan.students (id) on delete cascade,
  position_id uuid not null references taikyokukan.positions (id),
  order_no integer not null, -- セッション内の出題順 0..n-1
  guess_winrate double precision not null, -- 予測（常に勝率0..1に正規化して保存）
  actual_cp integer not null, -- 出題時点の評価値（先手視点）
  actual_winrate double precision not null,
  abs_error double precision not null, -- |予測-実際|（勝率pt）
  signed_error double precision not null, -- 予測-実際（＋=先手を高く見た）
  weight double precision not null, -- 互角加重
  style_tag text not null, -- 集計を軽くするため出題時の値を持つ
  phase_tag text not null,
  created_at timestamptz not null default now()
);
create index if not exists guesses_session_idx on taikyokukan.guesses (session_id, order_no);
create index if not exists guesses_student_idx on taikyokukan.guesses (student_id, created_at);

-- RLS: 有効化のみ・ポリシー無し（anon からの直接アクセスを全部禁止）
-- 読み書きはサーバー側 API (service_role) だけが行う。一閃と同方式
alter table taikyokukan.students enable row level security;
alter table taikyokukan.positions enable row level security;
alter table taikyokukan.sessions enable row level security;
alter table taikyokukan.guesses enable row level security;

grant usage on schema taikyokukan to anon, authenticated, service_role;
grant all on all tables in schema taikyokukan to service_role;
grant usage, select on all sequences in schema taikyokukan to service_role;
alter default privileges in schema taikyokukan grant all on tables to service_role;
alter default privileges in schema taikyokukan grant usage, select on sequences to service_role;
