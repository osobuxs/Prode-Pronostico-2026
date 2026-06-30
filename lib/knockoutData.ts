import type { MatchView } from "./queries";
import type { StandingRow } from "./standings";
import { r32FixedSlotIndex, FEEDERS, type BracketTeam } from "./bracket";
import { canonicalTeam } from "./normalize";

/**
 * Resuelve la fase eliminatoria a partir de los partidos REALES:
 *   - `realByNum`   nº de llave (73..104) → partido real (consenso/resultado).
 *   - `winnerByNum` nº de llave → ganador del cruce (solo si TERMINÓ).
 *
 * Los dieciseisavos (73-88) se ubican por la POSICIÓN de grupo del equipo fijo
 * de cada llave. Las rondas siguientes se ubican por el PAR de rivales esperado
 * (los ganadores de sus feeders), cascadeando R32→R16→QF→SF→F. Así el cuadro de
 * octavos en adelante se llena con los ganadores reales a medida que se juega.
 */
export interface KnockoutResolution {
  realByNum: Map<number, MatchView>;
  winnerByNum: Map<number, BracketTeam>;
}

/**
 * Lado ganador de un partido TERMINADO: por marcador (reglamentario + alargue);
 * si quedó empatado, por la tanda de penales. null si no terminó o si no se
 * puede decidir (empate sin penales decisivos).
 */
export function winnerSide(m: MatchView): "home" | "away" | null {
  if (m.status !== "finished") return null;
  if (m.realHome == null || m.realAway == null) return null;
  if (m.realHome > m.realAway) return "home";
  if (m.realAway > m.realHome) return "away";
  if (m.penHome != null && m.penAway != null && m.penHome !== m.penAway)
    return m.penHome > m.penAway ? "home" : "away";
  return null;
}

const teamOf = (m: MatchView, side: "home" | "away"): BracketTeam => {
  const t = side === "home" ? m.home : m.away;
  return { name: t.name, code: t.code };
};

// Llaves de cada ronda posterior a los 16avos, en orden de dependencia.
const LATER_ROUND_NUMS = [89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 104];

export function resolveKnockout(
  realMatches: MatchView[],
  standingsByGroup: Map<string, StandingRow[]>
): KnockoutResolution {
  const realByNum = new Map<number, MatchView>();
  const winnerByNum = new Map<number, BracketTeam>();

  const setWinner = (num: number) => {
    const m = realByNum.get(num);
    if (!m) return;
    const side = winnerSide(m);
    if (side) winnerByNum.set(num, teamOf(m, side));
  };

  // ── R32 (73-88): por posición de grupo del equipo fijo de la llave ──
  const fixedKeyByTeam = new Map<string, string>();
  for (const [group, rows] of standingsByGroup) {
    if (rows[0]) fixedKeyByTeam.set(canonicalTeam(rows[0].name), `winner:${group}`);
    if (rows[1]) fixedKeyByTeam.set(canonicalTeam(rows[1].name), `runnerup:${group}`);
  }
  const numByFixedSlot = r32FixedSlotIndex();

  // `stage` distingue la ronda; los datos viejos (sin stage) se asumen 16avos.
  const isR32 = (m: MatchView) => m.stage == null || m.stage === "LAST_32";
  for (const m of realMatches) {
    if (!isR32(m)) continue;
    for (const team of [m.home, m.away]) {
      const fixedKey = fixedKeyByTeam.get(canonicalTeam(team.name));
      const num = fixedKey ? numByFixedSlot.get(fixedKey) : undefined;
      if (num !== undefined && !realByNum.has(num)) {
        realByNum.set(num, m);
        break;
      }
    }
  }
  for (let n = 73; n <= 88; n++) setWinner(n);

  // ── Rondas siguientes: por par de rivales esperado (ganadores de feeders) ──
  const byPair = new Map<string, MatchView>();
  const pairKey = (a: string, b: string) => [a, b].sort().join("__");
  for (const m of realMatches) {
    byPair.set(pairKey(canonicalTeam(m.home.name), canonicalTeam(m.away.name)), m);
  }
  for (const num of LATER_ROUND_NUMS) {
    const [fa, fb] = FEEDERS[num];
    const wa = winnerByNum.get(fa);
    const wb = winnerByNum.get(fb);
    if (!wa || !wb) continue; // todavía no se conocen ambos rivales
    const real = byPair.get(pairKey(canonicalTeam(wa.name), canonicalTeam(wb.name)));
    if (real) realByNum.set(num, real);
    setWinner(num);
  }

  return { realByNum, winnerByNum };
}
