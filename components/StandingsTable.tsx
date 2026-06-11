import type { StandingRow } from "../lib/standings";
import { flagUrl, displayName } from "../lib/flags";

const POS_BAR: Record<StandingRow["qualifies"], string> = {
  winner: "border-l-emerald-400",
  runnerup: "border-l-emerald-400",
  third: "border-l-amber-400",
  out: "border-l-transparent",
};

export function StandingsTable({ rows }: { rows: StandingRow[] }) {
  if (rows.length === 0) return null;

  const played = rows.reduce((s, r) => s + r.pj, 0) / 2; // cada partido cuenta 2 veces

  return (
    <div className="mb-3">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          Tabla
        </span>
        <span className="text-[10px] text-neutral-600">
          {played === 0 ? "sin jugar aún" : `${played} jugado${played !== 1 ? "s" : ""} de 6`}
        </span>
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] uppercase text-neutral-600">
            <th className="w-5 pb-1 text-center font-medium">#</th>
            <th className="pb-1 text-left font-medium">Equipo</th>
            <th className="w-6 pb-1 text-center font-medium">PJ</th>
            <th className="w-12 pb-1 text-center font-medium">G-E-P</th>
            <th className="w-7 pb-1 text-center font-medium">DG</th>
            <th className="w-7 pb-1 text-center font-bold text-neutral-400">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const flag = flagUrl(r.code);
            return (
              <tr
                key={r.code ?? r.name}
                className={`border-l-2 ${POS_BAR[r.qualifies]} border-b border-neutral-800/60 last:border-b-0`}
              >
                <td className="py-1 text-center font-medium text-neutral-500">{r.pos}</td>
                <td className="py-1">
                  <div className="flex items-center gap-1.5">
                    {flag ? (
                      <img src={flag} alt="" width={18} height={13} loading="lazy" className="h-[13px] w-[18px] shrink-0 rounded-[2px] object-cover ring-1 ring-white/10" />
                    ) : (
                      <span className="h-[13px] w-[18px] shrink-0 rounded-[2px] bg-neutral-800" />
                    )}
                    <span className="truncate font-medium">{displayName(r.name, r.code)}</span>
                  </div>
                </td>
                <td className="py-1 text-center tabular-nums text-neutral-400">{r.pj}</td>
                <td className="py-1 text-center tabular-nums text-neutral-500">
                  {r.pg}-{r.pe}-{r.pp}
                </td>
                <td className="py-1 text-center tabular-nums text-neutral-400">
                  {r.dg > 0 ? `+${r.dg}` : r.dg}
                </td>
                <td className="py-1 text-center font-black tabular-nums text-white">{r.pts}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
