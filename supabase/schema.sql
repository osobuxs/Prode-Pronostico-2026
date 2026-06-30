-- ════════════════════════════════════════════════════════════════
--  PRODE MUNDIAL 2026 ─ Schema de Supabase (Postgres)
--  Pegá este archivo en: Supabase > SQL Editor > New query > Run
-- ════════════════════════════════════════════════════════════════

-- ── GRUPOS (12 grupos: A..L) ────────────────────────────────────
create table if not exists groups (
  id    smallint generated always as identity primary key,
  name  text not null unique          -- "A", "B", ... "L"
);

-- ── SELECCIONES (48) ────────────────────────────────────────────
create table if not exists teams (
  id          smallint generated always as identity primary key,
  name        text not null,          -- "Argentina"
  code        text,                   -- "ARG" (FIFA, opcional)
  flag        text,                   -- emoji bandera (opcional)
  group_id    smallint references groups(id) on delete cascade,
  unique (name)
);

-- ── PARTIDOS (6 por grupo = 72 de fase de grupos) ───────────────
create table if not exists matches (
  id            integer generated always as identity primary key,
  group_id      smallint references groups(id) on delete cascade,
  home_team_id  smallint references teams(id),
  away_team_id  smallint references teams(id),
  kickoff       timestamptz,           -- fecha/hora del partido
  external_id   text,                  -- id en football-data.org (para cruzar resultado real)
  -- resultado REAL (se actualiza por el cron de resultados):
  home_score    smallint,              -- reglamentario + alargue (SIN penales)
  away_score    smallint,
  pen_home      smallint,              -- tanda de penales (NULL si no hubo)
  pen_away      smallint,
  status        text not null default 'scheduled', -- scheduled | live | finished
  stage         text,                  -- ronda eliminatoria: LAST_32 | LAST_16 | QUARTER_FINALS | SEMI_FINALS | THIRD_PLACE | FINAL (NULL en fase de grupos)
  venue         text,                  -- nombre crudo del estadio (lo trae Forebet)
  updated_at    timestamptz not null default now(),
  unique (home_team_id, away_team_id)
);

-- ── FUENTES de pronóstico (Forebet, Vitibet, ...) ───────────────
create table if not exists sources (
  id      smallint generated always as identity primary key,
  slug    text not null unique,        -- "forebet", "vitibet"
  name    text not null,               -- "Forebet"
  url     text,
  weight  real not null default 1.0    -- peso en el consenso (por si una fuente vale más)
);

-- ── PRONÓSTICOS scrapeados (1 por partido × fuente) ─────────────
create table if not exists predictions (
  id          integer generated always as identity primary key,
  match_id    integer not null references matches(id) on delete cascade,
  source_id   smallint not null references sources(id) on delete cascade,
  pred_home   smallint,                -- goles pronosticados local
  pred_away   smallint,                -- goles pronosticados visitante
  prob_home   real,                    -- probabilidad % (opcional)
  prob_draw   real,
  prob_away   real,
  scraped_at  timestamptz not null default now(),
  unique (match_id, source_id)         -- upsert: una predicción vigente por fuente
);

-- ── Índices útiles ──────────────────────────────────────────────
create index if not exists idx_matches_group on matches(group_id);
create index if not exists idx_pred_match    on predictions(match_id);

-- ── Trigger: mantener matches.updated_at ────────────────────────
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_matches_touch on matches;
create trigger trg_matches_touch
  before update on matches
  for each row execute function touch_updated_at();

-- ════════════════════════════════════════════════════════════════
--  RLS (Row Level Security)
--  Lectura pública (la web usa la anon key, solo lee).
--  Escritura solo con service_role (los scripts/cron del servidor).
-- ════════════════════════════════════════════════════════════════
alter table groups      enable row level security;
alter table teams       enable row level security;
alter table matches     enable row level security;
alter table sources     enable row level security;
alter table predictions enable row level security;

-- Políticas de SOLO LECTURA para el rol anónimo (la web pública).
create policy "public read groups"      on groups      for select using (true);
create policy "public read teams"       on teams       for select using (true);
create policy "public read matches"     on matches     for select using (true);
create policy "public read sources"     on sources     for select using (true);
create policy "public read predictions" on predictions for select using (true);
-- Nota: el service_role saltea RLS, así que los scripts pueden escribir sin políticas extra.
