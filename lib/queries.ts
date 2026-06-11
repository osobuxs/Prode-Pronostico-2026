import { createPublicClient } from "./supabase";
import { computeConsensus, gradePrediction } from "./consensus";
import { lookupVenue, type Venue } from "./venues";
import { groupVenue } from "./fixture";
import type { Consensus, MatchStatus } from "./types";

// ── Estructura que consume la vista ─────────────────────────────
export interface SourcePrediction {
  sourceName: string;
  predHome: number | null;
  predAway: number | null;
  grade: "exact" | "outcome" | "miss" | "pending";
}

export interface MatchView {
  id: number;
  home: TeamView;
  away: TeamView;
  kickoff: string | null;
  status: MatchStatus;
  realHome: number | null;
  realAway: number | null;
  predictions: SourcePrediction[]; // una por fuente (las variantes)
  consensus: Consensus;
  consensusGrade: "exact" | "outcome" | "miss" | "pending";
  venue: Venue | null; // sede resuelta (estadio + ciudad + país)
}

export interface TeamView {
  name: string;
  code: string | null;
  flag: string | null;
}

export interface GroupView {
  name: string; // "A"
  matches: MatchView[];
}

/**
 * Trae todo de Supabase (anon, solo lectura) y arma la estructura por
 * grupo. Son pocas filas (72 partidos), así que traemos cada tabla y
 * cruzamos en memoria: simple, predecible y sin joins frágiles.
 */
export async function getGroups(): Promise<GroupView[]> {
  const db = createPublicClient();

  const [{ data: groups }, { data: teams }, { data: matches }, { data: sources }, { data: predictions }] =
    await Promise.all([
      db.from("groups").select("id,name").order("name"),
      db.from("teams").select("id,name,code,flag,group_id"),
      db.from("matches").select("*").order("kickoff"),
      db.from("sources").select("id,slug,name,weight"),
      db.from("predictions").select("*"),
    ]);

  const teamById = new Map((teams ?? []).map((t) => [t.id, t]));
  const sourceById = new Map((sources ?? []).map((s) => [s.id, s]));
  const weightBySourceId = Object.fromEntries(
    (sources ?? []).map((s) => [s.id, s.weight])
  );

  return (groups ?? []).map((g) => {
    const groupMatches = (matches ?? []).filter((m) => m.group_id === g.id);

    const matchViews: MatchView[] = groupMatches.map((m) => {
      const preds = (predictions ?? []).filter((p) => p.match_id === m.id);
      const consensus = computeConsensus(preds, weightBySourceId);

      const home = teamById.get(m.home_team_id);
      const away = teamById.get(m.away_team_id);

      // sede: dataset fijo (oficial) primero; Forebet como respaldo
      const venue =
        (home && away ? groupVenue(home.name, away.name) : null) ??
        lookupVenue(m.venue);

      const sourcePreds: SourcePrediction[] = preds.map((p) => ({
        sourceName: sourceById.get(p.source_id)?.name ?? "?",
        predHome: p.pred_home,
        predAway: p.pred_away,
        grade: gradePrediction(p.pred_home, p.pred_away, m.home_score, m.away_score),
      }));

      return {
        id: m.id,
        home: viewTeam(home),
        away: viewTeam(away),
        kickoff: m.kickoff,
        status: m.status,
        realHome: m.home_score,
        realAway: m.away_score,
        predictions: sourcePreds,
        consensus,
        consensusGrade: gradePrediction(
          consensus.predHome,
          consensus.predAway,
          m.home_score,
          m.away_score
        ),
        venue,
      };
    });

    return { name: g.name, matches: matchViews };
  });
}

function viewTeam(t: any): TeamView {
  if (!t) return { name: "?", code: null, flag: null };
  return { name: t.name, code: t.code, flag: t.flag };
}
