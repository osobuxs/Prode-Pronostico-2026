import type { StandingRow } from "./standings";

// ════════════════════════════════════════════════════════════════
//  Cuadro del Mundial 2026 — Dieciseisavos (Round of 32 / LAST_32).
//  Formato 48 equipos: pasan 1º y 2º de cada grupo (24) + los 8
//  mejores terceros (de 12). La distribución de cruces es el esquema
//  OFICIAL de FIFA (fuente: Wikipedia / FIFA).
// ════════════════════════════════════════════════════════════════

type SlotType = "winner" | "runnerup" | "third";

interface Slot {
  type: SlotType;
  group?: string; // winner/runnerup → grupo fijo
  thirdFrom?: string[]; // third → grupos posibles
}

interface R32Def {
  num: number; // 73..88
  home: Slot;
  away: Slot;
  advancesTo: number; // nº de partido de octavos
}

// Esquema oficial de los 16 cruces (match 73 a 88).
const R32: R32Def[] = [
  { num: 73, home: { type: "runnerup", group: "A" }, away: { type: "runnerup", group: "B" }, advancesTo: 90 },
  { num: 74, home: { type: "winner", group: "E" }, away: { type: "third", thirdFrom: ["A", "B", "C", "D", "F"] }, advancesTo: 89 },
  { num: 75, home: { type: "winner", group: "F" }, away: { type: "runnerup", group: "C" }, advancesTo: 90 },
  { num: 76, home: { type: "winner", group: "C" }, away: { type: "runnerup", group: "F" }, advancesTo: 91 },
  { num: 77, home: { type: "winner", group: "I" }, away: { type: "third", thirdFrom: ["C", "D", "F", "G", "H"] }, advancesTo: 89 },
  { num: 78, home: { type: "runnerup", group: "E" }, away: { type: "runnerup", group: "I" }, advancesTo: 91 },
  { num: 79, home: { type: "winner", group: "A" }, away: { type: "third", thirdFrom: ["C", "E", "F", "H", "I"] }, advancesTo: 92 },
  { num: 80, home: { type: "winner", group: "L" }, away: { type: "third", thirdFrom: ["E", "H", "I", "J", "K"] }, advancesTo: 92 },
  { num: 81, home: { type: "winner", group: "D" }, away: { type: "third", thirdFrom: ["B", "E", "F", "I", "J"] }, advancesTo: 94 },
  { num: 82, home: { type: "winner", group: "G" }, away: { type: "third", thirdFrom: ["A", "E", "H", "I", "J"] }, advancesTo: 94 },
  { num: 83, home: { type: "runnerup", group: "K" }, away: { type: "runnerup", group: "L" }, advancesTo: 93 },
  { num: 84, home: { type: "winner", group: "H" }, away: { type: "runnerup", group: "J" }, advancesTo: 93 },
  { num: 85, home: { type: "winner", group: "B" }, away: { type: "third", thirdFrom: ["E", "F", "G", "I", "J"] }, advancesTo: 96 },
  { num: 86, home: { type: "winner", group: "J" }, away: { type: "runnerup", group: "H" }, advancesTo: 95 },
  { num: 87, home: { type: "winner", group: "K" }, away: { type: "third", thirdFrom: ["D", "E", "I", "J", "L"] }, advancesTo: 96 },
  { num: 88, home: { type: "runnerup", group: "D" }, away: { type: "runnerup", group: "G" }, advancesTo: 95 },
];

/**
 * Índice de los slots FIJOS de los dieciseisavos: clave "winner:E" / "runnerup:B"
 * → nº de partido (73..88). Cada llave de R32 tiene al menos un slot
 * ganador/segundo de un grupo concreto, y cada (posición, grupo) es único en
 * todo el cuadro → sirve para ubicar un partido real en su nº sin ambigüedad.
 */
export function r32FixedSlotIndex(): Map<string, number> {
  const index = new Map<string, number>();
  for (const def of R32) {
    for (const slot of [def.home, def.away]) {
      if (slot.type === "winner" || slot.type === "runnerup") {
        index.set(`${slot.type}:${slot.group}`, def.num);
      }
    }
  }
  return index;
}

export interface BracketTeam {
  name: string;
  code: string | null;
}

export interface BracketSlot {
  label: string; // "Ganador A", "2º B", "3º (C/E/F/H/I)"
  team: BracketTeam | null; // null = TBD
  fromGroup?: string; // para terceros: grupo asignado
  provisional?: boolean; // true si el grupo aún no terminó (posición tentativa)
}

export interface BracketMatch {
  num: number;
  home: BracketSlot;
  away: BracketSlot;
  advancesTo: number;
}

export interface ThirdPlaceInfo {
  qualified: { group: string; row: StandingRow }[]; // 8 mejores terceros
  eliminated: { group: string; row: StandingRow }[]; // los 4 que quedan afuera
}

export interface ResolvedBracket {
  matches: BracketMatch[];
  thirds: ThirdPlaceInfo;
}

/**
 * Resuelve los dieciseisavos a partir de las tablas de cada grupo.
 * @param standingsByGroup  Map "A".."L" → tabla ordenada del grupo.
 *
 * Los terceros se asignan con un emparejamiento (backtracking) que
 * respeta los grupos permitidos de cada llave. Es una PROYECCIÓN: la
 * asignación oficial de FIFA depende de la tabla de combinaciones, pero
 * cualquier asignación válida sirve para ir viendo cómo se arma el cuadro.
 */
export function resolveBracket(
  standingsByGroup: Map<string, StandingRow[]>
): ResolvedBracket {
  // Estado de cada grupo:
  //   "empty"       → 0 partidos jugados → cuadro en TBD
  //   "provisional" → algunos jugados    → equipos TENTATIVOS (cambian)
  //   "decided"     → los 6 jugados      → posiciones firmes
  const status = new Map<string, "empty" | "provisional" | "decided">();
  for (const [group, rows] of standingsByGroup) {
    const played = rows.reduce((s, r) => s + r.pj, 0) / 2;
    status.set(group, played === 0 ? "empty" : played >= 6 ? "decided" : "provisional");
  }
  const started = (g: string) => status.get(g) !== "empty";
  const isProvisional = (g: string) => status.get(g) === "provisional";

  // 1) Ranking de los terceros de grupos ya empezados → 8 mejores clasifican
  const thirdsAll = [...standingsByGroup.entries()]
    .filter(([group]) => started(group))
    .map(([group, rows]) => ({ group, row: rows[2] }))
    .filter((t) => t.row)
    .sort((a, b) => rankThird(b.row) - rankThird(a.row));

  const qualified = thirdsAll.slice(0, 8);
  const eliminated = thirdsAll.slice(8);
  const qualifiedGroups = new Set(qualified.map((t) => t.group));

  // 2) Asignar los terceros clasificados a las llaves que esperan tercero
  const thirdMatches = R32.filter((m) => m.away.type === "third");
  const assignment = assignThirds(
    thirdMatches.map((m) => m.away.thirdFrom!.filter((g) => qualifiedGroups.has(g))),
    qualified.map((t) => t.group)
  );
  // assignment[i] = grupo asignado a la i-ésima llave de tercero (o null)
  const thirdGroupByMatch = new Map<number, string | null>();
  thirdMatches.forEach((m, i) => thirdGroupByMatch.set(m.num, assignment[i] ?? null));

  // 3) Construir los 16 cruces resueltos
  const resolveSlot = (slot: Slot, assignedThirdGroup?: string | null): BracketSlot => {
    if (slot.type === "winner" || slot.type === "runnerup") {
      const g = slot.group!;
      const idx = slot.type === "winner" ? 0 : 1;
      const row = started(g) ? standingsByGroup.get(g)?.[idx] : null;
      return {
        label: `${slot.type === "winner" ? "Ganador" : "2º"} ${g}`,
        team: row ? { name: row.name, code: row.code } : null,
        provisional: row ? isProvisional(g) : false,
      };
    }
    // tercero
    const label = `3º (${slot.thirdFrom!.join("/")})`;
    if (!assignedThirdGroup) return { label, team: null };
    const row = standingsByGroup.get(assignedThirdGroup)?.[2];
    return {
      label,
      fromGroup: assignedThirdGroup,
      team: row ? { name: row.name, code: row.code } : null,
      provisional: row ? isProvisional(assignedThirdGroup) : false,
    };
  };

  const matches: BracketMatch[] = R32.map((def) => ({
    num: def.num,
    advancesTo: def.advancesTo,
    home: resolveSlot(def.home, thirdGroupByMatch.get(def.num)),
    away: resolveSlot(def.away, thirdGroupByMatch.get(def.num)),
  }));

  return { matches, thirds: { qualified, eliminated } };
}

// ════════════════════════════════════════════════════════════════
//  Árbol completo para el CUADRO visual (R32 → R16 → QF → SF → Final).
//  Estructura oficial (Wikipedia). Las rondas posteriores a R32 quedan
//  como "Ganador P{n}" (TBD) hasta que se jueguen.
// ════════════════════════════════════════════════════════════════

export type Round = "R32" | "R16" | "QF" | "SF" | "F";

export interface BracketNode {
  num: number;
  round: Round;
  top: BracketSlot;
  bottom: BracketSlot;
}

export interface VisualBracket {
  left: { R32: BracketNode[]; R16: BracketNode[]; QF: BracketNode[]; SF: BracketNode[] };
  right: { R32: BracketNode[]; R16: BracketNode[]; QF: BracketNode[]; SF: BracketNode[] };
  final: BracketNode;
  thirdPlace: BracketNode; // partido por el 3er puesto (perdedores de semis)
}

// Qué partidos alimentan cada llave (ganador de A vs ganador de B).
export const FEEDERS: Record<number, [number, number]> = {
  // Octavos
  89: [74, 77], 90: [73, 75], 91: [76, 78], 92: [79, 80],
  93: [83, 84], 94: [81, 82], 95: [86, 88], 96: [85, 87],
  // Cuartos
  97: [89, 90], 98: [93, 94], 99: [91, 92], 100: [95, 96],
  // Semis
  101: [97, 98], 102: [99, 100],
  // Final
  104: [101, 102],
};

// Orden vertical de cada columna (para que las líneas conecten bien).
const LAYOUT = {
  left: {
    R32: [89, 90, 93, 94], // cada R16 aporta sus 2 feeders de R32, en orden
    R16: [89, 90, 93, 94],
    QF: [97, 98],
    SF: [101],
  },
  right: {
    R32: [91, 92, 95, 96],
    R16: [91, 92, 95, 96],
    QF: [99, 100],
    SF: [102],
  },
};

/**
 * Slot que referencia al ganador de un partido. Si ya se conoce (el feeder
 * terminó), trae el equipo real; si no, queda "Ganador P{n}" (TBD).
 */
function winnerSlot(matchNum: number, team?: BracketTeam | null): BracketSlot {
  return { label: `Ganador P${matchNum}`, team: team ?? null };
}

/**
 * Arma el árbol visual completo. Las llaves de R32 vienen resueltas
 * (equipos o labels de grupo); el resto se llena con el ganador real de
 * cada feeder TERMINADO (`winnerByNum`) y queda "Ganador P{n}" hasta entonces.
 */
export function buildVisualBracket(
  resolved: ResolvedBracket,
  winnerByNum: Map<number, BracketTeam> = new Map()
): VisualBracket {
  const r32ByNum = new Map(resolved.matches.map((m) => [m.num, m]));

  const r32Node = (num: number): BracketNode => {
    const m = r32ByNum.get(num)!;
    return { num, round: "R32", top: m.home, bottom: m.away };
  };
  const feederNode = (num: number, round: Round): BracketNode => {
    const [a, b] = FEEDERS[num];
    return {
      num,
      round,
      top: winnerSlot(a, winnerByNum.get(a)),
      bottom: winnerSlot(b, winnerByNum.get(b)),
    };
  };

  const side = (s: "left" | "right") => {
    const L = LAYOUT[s];
    // R32: por cada R16 de la columna, sus 2 feeders en orden
    const r32: BracketNode[] = [];
    for (const r16num of L.R16) {
      const [a, b] = FEEDERS[r16num];
      r32.push(r32Node(a), r32Node(b));
    }
    return {
      R32: r32,
      R16: L.R16.map((n) => feederNode(n, "R16")),
      QF: L.QF.map((n) => feederNode(n, "QF")),
      SF: L.SF.map((n) => feederNode(n, "SF")),
    };
  };

  // 3er puesto: lo juegan los PERDEDORES de las semis (101 y 102)
  const thirdPlace: BracketNode = {
    num: 103,
    round: "F",
    top: { label: "Perdedor P101", team: null },
    bottom: { label: "Perdedor P102", team: null },
  };

  return {
    left: side("left"),
    right: side("right"),
    final: feederNode(104, "F"),
    thirdPlace,
  };
}

export interface RoundSection {
  id: string;
  label: string;
  matches: BracketNode[];
}

/** Agrupa todas las rondas del cuadro en secciones (para las cards). */
export function bracketRounds(v: VisualBracket): RoundSection[] {
  const byNum = (a: BracketNode, b: BracketNode) => a.num - b.num;
  return [
    { id: "r32", label: "🏆 Dieciseisavos", matches: [...v.left.R32, ...v.right.R32].sort(byNum) },
    { id: "r16", label: "Octavos de final", matches: [...v.left.R16, ...v.right.R16].sort(byNum) },
    { id: "qf", label: "Cuartos de final", matches: [...v.left.QF, ...v.right.QF].sort(byNum) },
    { id: "sf", label: "Semifinales", matches: [...v.left.SF, ...v.right.SF].sort(byNum) },
    { id: "third", label: "🥉 Tercer puesto", matches: [v.thirdPlace] },
    { id: "final", label: "🏆 Final", matches: [v.final] },
  ];
}

/** Ranking de un tercero: pts → diferencia de gol → goles a favor. */
function rankThird(r: StandingRow): number {
  return r.pts * 1000 + (r.dg + 50) * 10 + r.gf;
}

/**
 * Empareja grupos-tercero a llaves respetando los grupos permitidos.
 * Backtracking: encuentra una asignación válida (cada llave un grupo
 * distinto, dentro de sus permitidos). Devuelve array paralelo a las
 * llaves; null si una llave no pudo asignarse.
 */
function assignThirds(allowedPerSlot: string[][], available: string[]): (string | null)[] {
  const result: (string | null)[] = new Array(allowedPerSlot.length).fill(null);
  const used = new Set<string>();

  // ordenar llaves por menos opciones primero (heurística MRV)
  const order = allowedPerSlot
    .map((_, i) => i)
    .sort((a, b) => allowedPerSlot[a].length - allowedPerSlot[b].length);

  const backtrack = (k: number): boolean => {
    if (k === order.length) return true;
    const slot = order[k];
    for (const g of allowedPerSlot[slot]) {
      if (used.has(g) || !available.includes(g)) continue;
      used.add(g);
      result[slot] = g;
      if (backtrack(k + 1)) return true;
      used.delete(g);
      result[slot] = null;
    }
    return false;
  };

  backtrack(0);
  return result;
}
