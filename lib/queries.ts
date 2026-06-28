import { createPublicClient } from "./supabase";
import { computeConsensus, gradePrediction } from "./consensus";
import { lookupVenue, type Venue } from "./venues";
import { groupVenue } from "./fixture";
import type { Consensus, MatchStatus, Prediction } from "./types";

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

    const matchViews = groupMatches.map((m) =>
      buildMatchView(m, predictions ?? [], {
        teamById,
        sourceById,
        weightBySourceId,
        // sede de grupo: dataset fijo (oficial) primero; Forebet como respaldo
        resolveVenue: (home, away, raw) =>
          (home && away ? groupVenue(home.name, away.name) : null) ??
          lookupVenue(raw.venue),
      })
    );

    return { name: g.name, matches: matchViews };
  });
}

/**
 * Partidos de fase ELIMINATORIA (group_id NULL). Mismo armado que los de
 * grupo, pero la sede sale solo de lo que trae Forebet (la fecha/sede fija
 * del cuadro la pone el componente vía knockoutFixture, por nº de partido).
 */
export async function getKnockoutMatches(): Promise<MatchView[]> {
  const db = createPublicClient();

  const [{ data: teams }, { data: matches }, { data: sources }, { data: predictions }] =
    await Promise.all([
      db.from("teams").select("id,name,code,flag,group_id"),
      db.from("matches").select("*").is("group_id", null).order("kickoff"),
      db.from("sources").select("id,slug,name,weight"),
      db.from("predictions").select("*"),
    ]);

  const teamById = new Map((teams ?? []).map((t) => [t.id, t]));
  const sourceById = new Map((sources ?? []).map((s) => [s.id, s]));
  const weightBySourceId = Object.fromEntries(
    (sources ?? []).map((s) => [s.id, s.weight])
  );

  return (matches ?? []).map((m) =>
    buildMatchView(m, predictions ?? [], {
      teamById,
      sourceById,
      weightBySourceId,
      resolveVenue: (_h, _a, raw) => lookupVenue(raw.venue),
    })
  );
}

interface BuildCtx {
  teamById: Map<number, any>;
  sourceById: Map<number, any>;
  weightBySourceId: Record<number, number>;
  resolveVenue: (home: any, away: any, raw: any) => Venue | null;
}

/** Arma un MatchView a partir de la fila de partido y sus predicciones. */
function buildMatchView(m: any, predictions: Prediction[], ctx: BuildCtx): MatchView {
  const preds = predictions.filter((p) => p.match_id === m.id);
  const consensus = computeConsensus(preds, ctx.weightBySourceId);

  const home = ctx.teamById.get(m.home_team_id);
  const away = ctx.teamById.get(m.away_team_id);

  const sourcePreds: SourcePrediction[] = preds.map((p) => ({
    sourceName: ctx.sourceById.get(p.source_id)?.name ?? "?",
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
    venue: ctx.resolveVenue(home, away, m),
  };
}

function viewTeam(t: any): TeamView {
  if (!t) return { name: "?", code: null, flag: null };
  return { name: t.name, code: t.code, flag: t.flag };
}
