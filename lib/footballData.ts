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

export interface FDMatch {
  id: number;
  utcDate: string;
  status: string; // SCHEDULED | TIMED | IN_PLAY | PAUSED | FINISHED ...
  stage: string; // GROUP_STAGE | ...
  group: string | null; // "GROUP_A" ...
  homeTeam: FDTeam;
  awayTeam: FDTeam;
  score: {
    fullTime: { home: number | null; away: number | null };
  };
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

/** "GROUP_A" → "A" */
export function groupLetter(fdGroup: string | null): string | null {
  if (!fdGroup) return null;
  const m = fdGroup.match(/GROUP_([A-L])/i);
  return m ? m[1].toUpperCase() : null;
}

/** Mapea el status de la API a nuestro enum interno. */
export function mapStatus(fd: string): "scheduled" | "live" | "finished" {
  if (fd === "FINISHED") return "finished";
  if (fd === "IN_PLAY" || fd === "PAUSED") return "live";
  return "scheduled";
}
