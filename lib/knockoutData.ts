import type { MatchView } from "./queries";
import type { StandingRow } from "./standings";
import { r32FixedSlotIndex } from "./bracket";
import { canonicalTeam } from "./normalize";

/**
 * Ubica cada partido REAL de dieciseisavos (los que ya existen en la base,
 * con equipos confirmados) en su nº de llave del cuadro (73..88).
 *
 * En vez de confiar en la proyección heurística de terceros de `resolveBracket`,
 * usa la realidad: la POSICIÓN de cada equipo en su grupo (ganador/segundo) más
 * el índice de slots fijos del cuadro. Cada llave de R32 tiene al menos un slot
 * ganador/segundo de un grupo concreto, así que con identificar a ESE equipo
 * alcanza para ubicar el partido — el otro puede ser un tercero.
 *
 * @returns Map nº de partido (73..88) → MatchView real (con consenso/resultado)
 */
export function mapRealMatchesToBracket(
  realMatches: MatchView[],
  standingsByGroup: Map<string, StandingRow[]>
): Map<number, MatchView> {
  // canónico del equipo → "winner:E" / "runnerup:B"
  const fixedKeyByTeam = new Map<string, string>();
  for (const [group, rows] of standingsByGroup) {
    if (rows[0]) fixedKeyByTeam.set(canonicalTeam(rows[0].name), `winner:${group}`);
    if (rows[1]) fixedKeyByTeam.set(canonicalTeam(rows[1].name), `runnerup:${group}`);
  }

  const numByFixedSlot = r32FixedSlotIndex();
  const byNum = new Map<number, MatchView>();

  for (const match of realMatches) {
    // basta con que UNO de los dos sea ganador/segundo de su grupo
    for (const team of [match.home, match.away]) {
      const fixedKey = fixedKeyByTeam.get(canonicalTeam(team.name));
      const num = fixedKey ? numByFixedSlot.get(fixedKey) : undefined;
      if (num !== undefined) {
        byNum.set(num, match);
        break;
      }
    }
  }

  return byNum;
}
