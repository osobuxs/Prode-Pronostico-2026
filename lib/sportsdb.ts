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

export interface SDBEvent {
  strHomeTeam: string;
  strAwayTeam: string;
  intHomeScore: string | null;
  intAwayScore: string | null;
  strStatus: string | null;
  strLeague: string | null;
  dateEvent: string;
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
