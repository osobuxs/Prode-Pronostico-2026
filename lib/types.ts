// Tipos compartidos entre el front, los scrapers y los scripts.

export type MatchStatus = "scheduled" | "live" | "finished";

export interface Group {
  id: number;
  name: string; // "A".."L"
}

export interface Team {
  id: number;
  name: string;
  code: string | null;
  flag: string | null;
  group_id: number | null;
}

export interface Source {
  id: number;
  slug: string; // "forebet"
  name: string; // "Forebet"
  url: string | null;
  weight: number;
}

export interface Prediction {
  id: number;
  match_id: number;
  source_id: number;
  pred_home: number | null;
  pred_away: number | null;
  prob_home: number | null;
  prob_draw: number | null;
  prob_away: number | null;
  scraped_at: string;
}

export interface Match {
  id: number;
  group_id: number | null;
  home_team_id: number | null;
  away_team_id: number | null;
  kickoff: string | null;
  external_id: string | null;
  home_score: number | null;
  away_score: number | null;
  status: MatchStatus;
  venue: string | null; // nombre crudo del estadio
  updated_at: string;
}

// ── Lo que un scraper devuelve por cada partido ─────────────────
export interface ScrapedPrediction {
  homeTeam: string; // nombre del equipo local tal cual lo ve el scraper
  awayTeam: string;
  predHome: number | null;
  predAway: number | null;
  probHome?: number | null;
  probDraw?: number | null;
  probAway?: number | null;
  kickoff?: string | null;
  venue?: string | null; // nombre crudo del estadio (lo trae Forebet)
}

// ── Resultado del cálculo de consenso para un partido ───────────
export interface Consensus {
  predHome: number | null; // goles de consenso (redondeado)
  predAway: number | null;
  avgHome: number | null; // promedio crudo (sin redondear)
  avgAway: number | null;
  outcome: "1" | "X" | "2" | null; // tendencia mayoritaria
  sampleSize: number; // cuántas fuentes aportaron
}
