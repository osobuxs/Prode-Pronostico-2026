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
}

/**
 * Partidos del Mundial con su estado ACTUAL (incluye los en vivo).
 * Usa eventsseason: en el free tier devuelve ~15 eventos alrededor de "ahora"
 * (recién jugados + en curso + próximos), justo lo que hay que actualizar.
 * El cron corre seguido, así que no se acumulan partidos sin capturar.
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
