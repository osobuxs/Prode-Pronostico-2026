import type { Prediction, Consensus } from "./types";

/**
 * Calcula el "resultado promedio" entre varias fuentes para un partido.
 *
 * La idea (esto es lo que pediste):
 *  - cada fuente (Forebet, Vitibet, ...) tira su marcador pronosticado
 *  - promediamos los goles de local y de visitante por separado
 *  - el marcador de consenso es ese promedio redondeado
 *  - además calculamos la TENDENCIA mayoritaria (1 / X / 2) por si los
 *    marcadores promedio empatan pero la mayoría ve un ganador claro
 *
 * Soporta pesos por fuente (sources.weight): una fuente más confiable
 * puede pesar más en el promedio. Por defecto todas valen 1.
 */
export function computeConsensus(
  predictions: Prediction[],
  weightBySourceId: Record<number, number> = {}
): Consensus {
  const usable = predictions.filter(
    (p) => p.pred_home !== null && p.pred_away !== null
  );

  if (usable.length === 0) {
    return {
      predHome: null,
      predAway: null,
      avgHome: null,
      avgAway: null,
      outcome: null,
      sampleSize: 0,
    };
  }

  let sumHome = 0;
  let sumAway = 0;
  let sumWeight = 0;
  const outcomeVotes: Record<"1" | "X" | "2", number> = { "1": 0, X: 0, "2": 0 };

  for (const p of usable) {
    const w = weightBySourceId[p.source_id] ?? 1;
    sumHome += (p.pred_home as number) * w;
    sumAway += (p.pred_away as number) * w;
    sumWeight += w;

    const h = p.pred_home as number;
    const a = p.pred_away as number;
    if (h > a) outcomeVotes["1"] += w;
    else if (h < a) outcomeVotes["2"] += w;
    else outcomeVotes["X"] += w;
  }

  const avgHome = sumHome / sumWeight;
  const avgAway = sumAway / sumWeight;

  // tendencia mayoritaria por votos ponderados
  const outcome = (Object.entries(outcomeVotes).sort(
    (a, b) => b[1] - a[1]
  )[0][0] as "1" | "X" | "2");

  return {
    predHome: Math.round(avgHome),
    predAway: Math.round(avgAway),
    avgHome: round2(avgHome),
    avgAway: round2(avgAway),
    outcome,
    sampleSize: usable.length,
  };
}

/** Convierte un marcador en su signo 1/X/2. */
export function outcomeOf(home: number, away: number): "1" | "X" | "2" {
  if (home > away) return "1";
  if (home < away) return "2";
  return "X";
}

/**
 * ¿La fuente le pegó al resultado real?
 *  - "exact"   : acertó el marcador exacto
 *  - "outcome" : acertó solo quién ganó/empató (1X2)
 *  - "miss"    : erró
 */
export function gradePrediction(
  predHome: number | null,
  predAway: number | null,
  realHome: number | null,
  realAway: number | null
): "exact" | "outcome" | "miss" | "pending" {
  if (
    predHome === null ||
    predAway === null ||
    realHome === null ||
    realAway === null
  ) {
    return "pending";
  }
  if (predHome === realHome && predAway === realAway) return "exact";
  if (outcomeOf(predHome, predAway) === outcomeOf(realHome, realAway))
    return "outcome";
  return "miss";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
