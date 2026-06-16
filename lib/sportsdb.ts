// Cliente de TheSportsDB para los RESULTADOS reales del Mundial.
// football-data (free) marca los partidos FINISHED pero NO da el marcador,
// así que los resultados los tomamos de acá.
//
// Key: la de prueba pública funciona, pero para producción conviene sacar
// una gratis en https://www.thesportsdb.com/ (env SPORTSDB_API_KEY).

const BASE = "https://www.thesportsdb.com/api/v1/json";

function key(): string {
  return process.env.SPORTSDB_API_KEY ?? "123";
}

// FIFA World Cup en TheSportsDB
const LEAGUE_ID = process.env.SPORTSDB_LEAGUE_ID ?? "4429";
const SEASON = process.env.SPORTSDB_SEASON ?? "2026";

export interface SDBEvent {
  strHomeTeam: string;
  strAwayTeam: string;
  intHomeScore: string | null;
  intAwayScore: string | null;
  strStatus: string | null;
  strLeague: string | null;
  dateEvent: string;
  strTime: string | null; // hora UTC de inicio "HH:MM:SS"
}

/**
 * eventsseason: ~15 eventos del free tier. OJO: no siempre incluye los de
 * HOY (su ventana se queda en días previos), así que lo combinamos con
 * eventsday() para no perder los partidos en vivo de la fecha actual.
 */
export async function fetchSeasonEvents(): Promise<SDBEvent[]> {
  const res = await fetch(
    `${BASE}/${key()}/eventsseason.php?id=${LEAGUE_ID}&s=${SEASON}`,
    { headers: { "User-Agent": "prode-mundial-2026" } }
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { events: SDBEvent[] | null };
  return data.events ?? [];
}

/** Partidos de soccer de una fecha (YYYY-MM-DD), filtrados al Mundial. */
export async function fetchEventsByDate(date: string): Promise<SDBEvent[]> {
  const res = await fetch(`${BASE}/${key()}/eventsday.php?d=${date}&s=Soccer`, {
    headers: { "User-Agent": "prode-mundial-2026" },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { events: SDBEvent[] | null };
  return (data.events ?? []).filter((e) => /world cup/i.test(e.strLeague ?? ""));
}

/**
 * Todos los partidos relevantes a actualizar: combina la temporada
 * (históricos) + hoy y ayer (en vivo / recién jugados). Dedup por
 * equipos+fecha; los de hoy pisan (estado más fresco).
 */
export async function fetchAllRelevantEvents(): Promise<SDBEvent[]> {
  const today = new Date().toISOString().slice(0, 10);
  const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const [season, dYest, dToday] = await Promise.all([
    fetchSeasonEvents(),
    fetchEventsByDate(yest),
    fetchEventsByDate(today),
  ]);
  const keyOf = (e: SDBEvent) => `${e.strHomeTeam}|${e.strAwayTeam}|${e.dateEvent}`;
  const byKey = new Map<string, SDBEvent>();
  for (const e of season) byKey.set(keyOf(e), e);
  for (const e of dYest) byKey.set(keyOf(e), e);
  for (const e of dToday) byKey.set(keyOf(e), e); // hoy = más fresco, pisa
  return [...byKey.values()];
}

/** Mapea el estado de TheSportsDB a nuestro enum interno. */
export function mapSdbStatus(s: string | null): "scheduled" | "live" | "finished" {
  const u = (s ?? "").toUpperCase().trim();
  if (["FT", "AET", "PEN", "AP", "MATCH FINISHED", "FINISHED"].includes(u)) return "finished";
  if (["", "NS", "TBD", "POSTP", "PPD", "CANC", "NOT STARTED", "SCHEDULED"].includes(u))
    return "scheduled";
  return "live"; // 1H, 2H, HT, ET, P, LIVE, etc.
}

/** Convierte el score (string|null) a número o null. */
export function toScore(v: string | null): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
