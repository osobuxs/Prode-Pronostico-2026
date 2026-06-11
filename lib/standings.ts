import type { MatchView } from "./queries";

// ════════════════════════════════════════════════════════════════
//  Tabla de posiciones por grupo.
//  SOLO suma resultados OFICIALES (partidos terminados, de football-data).
//  El consenso de los pronósticos NO suma: la tabla refleja la realidad,
//  no proyecciones. Se va llenando a medida que se juega.
// ════════════════════════════════════════════════════════════════

export interface StandingRow {
  pos: number;
  name: string;
  code: string | null;
  pj: number; // jugados (real + proyectado)
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number; // diferencia de gol
  pts: number;
  qualifies: "winner" | "runnerup" | "third" | "out"; // 1º / 2º / 3º / 4º
}

interface Acc {
  name: string;
  code: string | null;
  pj: number; pg: number; pe: number; pp: number;
  gf: number; gc: number; pts: number;
}

/**
 * Calcula la tabla de un grupo a partir de sus partidos (MatchView).
 * SOLO cuenta partidos terminados con resultado oficial. Las 4 selecciones
 * aparecen igual (sembradas desde los partidos), aunque no hayan jugado.
 *
 * Desempate (aproximación a las reglas FIFA): puntos → diferencia de
 * gol → goles a favor. (FIFA agrega head-to-head y fair-play, que acá
 * no aplicamos para mantenerlo simple y predecible.)
 */
export function computeStandings(matches: MatchView[]): StandingRow[] {
  const table = new Map<string, Acc>();

  const ensure = (name: string, code: string | null): Acc => {
    const key = code ?? name;
    let row = table.get(key);
    if (!row) {
      row = { name, code, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 };
      table.set(key, row);
    }
    return row;
  };

  // sembrar las 4 selecciones del grupo (aparecen aunque no hayan jugado)
  for (const m of matches) {
    ensure(m.home.name, m.home.code);
    ensure(m.away.name, m.away.code);
  }

  for (const m of matches) {
    const isReal = m.status === "finished" && m.realHome !== null && m.realAway !== null;
    if (!isReal) continue; // SOLO resultados oficiales suman a la tabla
    const h = m.realHome as number;
    const a = m.realAway as number;

    const home = ensure(m.home.name, m.home.code);
    const away = ensure(m.away.name, m.away.code);

    home.pj++; away.pj++;
    home.gf += h; home.gc += a;
    away.gf += a; away.gc += h;

    if (h > a) { home.pg++; home.pts += 3; away.pp++; }
    else if (h < a) { away.pg++; away.pts += 3; home.pp++; }
    else { home.pe++; away.pe++; home.pts++; away.pts++; }
  }

  const rows = [...table.values()].sort(cmp);

  return rows.map((r, i) => ({
    pos: i + 1,
    name: r.name,
    code: r.code,
    pj: r.pj, pg: r.pg, pe: r.pe, pp: r.pp,
    gf: r.gf, gc: r.gc, dg: r.gf - r.gc, pts: r.pts,
    qualifies: i === 0 ? "winner" : i === 1 ? "runnerup" : i === 2 ? "third" : "out",
  }));
}

function cmp(a: Acc, b: Acc): number {
  if (b.pts !== a.pts) return b.pts - a.pts;
  const dgA = a.gf - a.gc, dgB = b.gf - b.gc;
  if (dgB !== dgA) return dgB - dgA;
  if (b.gf !== a.gf) return b.gf - a.gf;
  return a.name.localeCompare(b.name);
}
