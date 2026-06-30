// Cliente mínimo de football-data.org (v4) para la fase de grupos del Mundial.
// Free tier: registrate en https://www.football-data.org/client/register

const BASE = "https://api.football-data.org/v4";

function competition(): string {
  return process.env.FOOTBALL_DATA_COMPETITION ?? "WC";
}

function authHeaders(): Record<string, string> {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) {
    throw new Error(
      "Falta FOOTBALL_DATA_API_KEY. Registrate gratis en football-data.org y poné la key en .env.local."
    );
  }
  return { "X-Auth-Token": key };
}

export interface FDTeam {
  id: number;
  name: string;
  tla: string | null; // "ARG"
  crest: string | null;
}

interface FDPartial {
  home: number | null;
  away: number | null;
}

export interface FDMatch {
  id: number;
  utcDate: string;
  status: string; // SCHEDULED | TIMED | IN_PLAY | PAUSED | FINISHED ...
  stage: string; // GROUP_STAGE | LAST_32 | LAST_16 | QUARTER_FINALS | ...
  group: string | null; // "GROUP_A" ...
  homeTeam: FDTeam;
  awayTeam: FDTeam;
  // En un partido por penales, football-data SUMA los penales adentro de
  // `fullTime` (queda no-empatado), y aparte trae `regularTime`/`extraTime`
  // (el marcador antes de la tanda) y `penalties` (la tanda). `winner` viene
  // NULL en shootouts, así que no se usa para decidir.
  score: {
    winner: string | null; // HOME_TEAM | AWAY_TEAM | DRAW | null
    duration?: string; // REGULAR | EXTRA_TIME | PENALTY_SHOOTOUT
    fullTime: FDPartial;
    halfTime?: FDPartial;
    regularTime?: FDPartial;
    extraTime?: FDPartial;
    penalties?: FDPartial;
  };
}

/** Marcador "limpio" de un partido + la tanda de penales si la hubo. */
export interface ResolvedScore {
  home: number | null; // reglamentario + alargue (SIN penales)
  away: number | null;
  penHome: number | null; // tanda de penales (null si no hubo)
  penAway: number | null;
}

/**
 * Separa el marcador del partido de la tanda de penales.
 * - REGULAR / EXTRA_TIME → el marcador es `fullTime` (ya incluye el alargue).
 * - PENALTY_SHOOTOUT → el marcador es `regularTime + extraTime` (antes de la
 *   tanda). Para la TANDA usamos `penalties` solo si es DECISIVO; si vino
 *   ausente o empatado (el feed a veces lo manda inconsistente, ej. 4-4),
 *   caemos a `fullTime`, que en un partido terminado siempre define al ganador.
 */
export function resolveScore(score: FDMatch["score"]): ResolvedScore {
  const isPen = score.duration === "PENALTY_SHOOTOUT";
  if (!isPen) {
    return { home: score.fullTime.home, away: score.fullTime.away, penHome: null, penAway: null };
  }

  // Marcador antes de la tanda (90' + alargue). Sin desglose, cae a fullTime.
  const reg = score.regularTime ?? score.fullTime;
  const et = score.extraTime ?? { home: 0, away: 0 };
  const home = (reg.home ?? 0) + (et.home ?? 0);
  const away = (reg.away ?? 0) + (et.away ?? 0);

  // Tanda: penalties si es decisivo; si no, fullTime (decisivo por definición).
  const p = score.penalties;
  const penDecisive = p && p.home != null && p.away != null && p.home !== p.away;
  const penHome = penDecisive ? p!.home : score.fullTime.home;
  const penAway = penDecisive ? p!.away : score.fullTime.away;

  return { home, away, penHome, penAway };
}

/** Trae TODOS los partidos de la competición (incluye fase de grupos). */
export async function fetchMatches(): Promise<FDMatch[]> {
  const res = await fetch(`${BASE}/competitions/${competition()}/matches`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(
      `football-data.org respondió ${res.status}. ¿La key es válida y tu plan incluye la competición ${competition()}?`
    );
  }
  const data = (await res.json()) as { matches: FDMatch[] };
  return data.matches ?? [];
}

/** Solo los partidos de fase de grupos (los 6 por grupo que querés mostrar). */
export async function fetchGroupStageMatches(): Promise<FDMatch[]> {
  const all = await fetchMatches();
  return all.filter((m) => m.stage === "GROUP_STAGE" && m.group);
}

/**
 * Partidos de fase ELIMINATORIA con AMBOS equipos ya confirmados.
 * Genérico: hoy devuelve los 16 de LAST_32 (16avos); a medida que se juega
 * el torneo va sumando LAST_16, QUARTER_FINALS, etc. (cuando dejan de ser TBD).
 * football-data deja homeTeam/awayTeam en null hasta que se define el cruce.
 */
export async function fetchKnockoutMatches(): Promise<FDMatch[]> {
  const all = await fetchMatches();
  return all.filter(
    (m) =>
      m.stage !== "GROUP_STAGE" &&
      m.homeTeam?.id != null &&
      m.awayTeam?.id != null
  );
}

/** "GROUP_A" → "A" */
export function groupLetter(fdGroup: string | null): string | null {
  if (!fdGroup) return null;
  const m = fdGroup.match(/GROUP_([A-L])/i);
  return m ? m[1].toUpperCase() : null;
}

/** Mapea el status de la API a nuestro enum interno. */
export function mapStatus(fd: string): "scheduled" | "live" | "finished" {
  const s = (fd ?? "").toUpperCase();
  if (s === "FINISHED" || s === "AWARDED") return "finished";
  // football-data usa varios valores para "en juego": IN_PLAY/PAUSED (v4) y
  // LIVE (estado grueso que devuelve el endpoint /matches). Sin LIVE el partido
  // se queda en "scheduled" y nunca muestra el cartel "en vivo".
  if (s === "IN_PLAY" || s === "PAUSED" || s === "LIVE") return "live";
  return "scheduled";
}
