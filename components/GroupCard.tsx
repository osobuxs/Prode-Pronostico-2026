import type { GroupView } from "../lib/queries";
import { computeStandings } from "../lib/standings";
import { MatchRow } from "./MatchRow";
import { StandingsTable } from "./StandingsTable";

export function GroupCard({ group }: { group: GroupView }) {
  const withPreds = group.matches.filter((m) => m.predictions.length > 0).length;
  const standings = computeStandings(group.matches);

  return (
    <section
      id={`g-${group.name}`}
      className="scroll-mt-16 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40"
    >
      <header className="flex items-center gap-3 border-b border-neutral-800 bg-gradient-to-r from-pitch/20 to-transparent px-4 py-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-pitch to-pitch-dark text-base font-black text-white shadow-lg shadow-pitch/20">
          {group.name}
        </span>
        <h2 className="text-base font-bold">Grupo {group.name}</h2>
        <span className="ml-auto text-xs text-neutral-500">
          {withPreds}/{group.matches.length} con pronóstico
        </span>
      </header>

      <div className="p-3">
        {standings.length > 0 && <StandingsTable rows={standings} />}

        <div className="space-y-2">
          {group.matches.length === 0 ? (
            <p className="py-4 text-center text-sm text-neutral-600">
              Sin partidos cargados.
            </p>
          ) : (
            group.matches.map((m) => <MatchRow key={m.id} match={m} />)
          )}
        </div>
      </div>
    </section>
  );
}
