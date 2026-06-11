import type { MatchView } from "../lib/queries";
import { flagUrl, flagUrl2x, displayName } from "../lib/flags";

const GRADE_STYLE: Record<string, string> = {
  exact: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  outcome: "text-amber-400 border-amber-500/40 bg-amber-500/10",
  miss: "text-rose-400 border-rose-500/30 bg-rose-500/5",
  pending: "text-neutral-400 border-neutral-700 bg-neutral-800/40",
};

export function MatchRow({ match }: { match: MatchView }) {
  const finished = match.status === "finished";
  const live = match.status === "live";
  const decided = finished || live;

  return (
    <div className="rounded-xl border border-neutral-800 bg-gradient-to-b from-neutral-900 to-neutral-900/40 p-3 transition-colors hover:border-neutral-700">
      {/* Línea principal: local · marcador · visitante */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TeamSide team={match.home} align="right" />

        <div className="flex min-w-[72px] flex-col items-center">
          {decided ? (
            <span
              className={`rounded-lg px-3 py-1 text-lg font-black tabular-nums ${
                live ? "bg-rose-600 text-white" : "bg-neutral-800 text-white"
              }`}
            >
              {match.realHome ?? 0}–{match.realAway ?? 0}
            </span>
          ) : (
            <>
              <span className="text-sm font-bold text-neutral-300">
                {formatTime(match.kickoff)}
              </span>
              <span className="text-[10px] text-neutral-500">
                {formatDate(match.kickoff)}
              </span>
            </>
          )}
          {live && (
            <span className="mt-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-rose-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
              en vivo
            </span>
          )}
        </div>

        <TeamSide team={match.away} align="left" />
      </div>

      {/* Consenso */}
      <div className="mt-3 flex items-center justify-center gap-2 border-t border-neutral-800 pt-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          Consenso
        </span>
        {match.consensus.sampleSize > 0 ? (
          <>
            <span
              className={`rounded-md border px-2 py-0.5 text-sm font-black tabular-nums ${GRADE_STYLE[match.consensusGrade]}`}
            >
              {fmt(match.consensus.predHome)}–{fmt(match.consensus.predAway)}
            </span>
            <span className="text-[10px] text-neutral-600">
              avg {match.consensus.avgHome}–{match.consensus.avgAway} · {match.consensus.sampleSize} fuentes
            </span>
          </>
        ) : (
          <span className="text-xs text-neutral-600">sin pronósticos aún</span>
        )}
      </div>

      {/* Variantes por fuente */}
      {match.predictions.length > 0 && (
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          {match.predictions.map((p, i) => (
            <span
              key={i}
              className={`rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${GRADE_STYLE[p.grade]}`}
            >
              <span className="opacity-70">{p.sourceName}</span>{" "}
              <span className="tabular-nums">
                {fmt(p.predHome)}–{fmt(p.predAway)}
              </span>
            </span>
          ))}
        </div>
      )}

      {match.venue && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 border-t border-neutral-800 pt-2 text-[10px] text-neutral-500">
          {flagUrl(match.venue.countryCode) && (
            <img
              src={flagUrl(match.venue.countryCode)!}
              alt=""
              width={14}
              height={10}
              loading="lazy"
              className="h-[10px] w-[14px] rounded-[1px] object-cover ring-1 ring-white/10"
            />
          )}
          <span className="font-medium text-neutral-400">📍 {match.venue.stadium}</span>
          <span>·</span>
          <span>
            {match.venue.city}, {match.venue.country}
          </span>
        </div>
      )}
    </div>
  );
}

function TeamSide({
  team,
  align,
}: {
  team: { name: string; code: string | null };
  align: "left" | "right";
}) {
  const name = displayName(team.name, team.code);
  const src = flagUrl(team.code);
  const src2x = flagUrl2x(team.code);
  const flag = src ? (
    <img
      src={src}
      srcSet={src2x ? `${src2x} 2x` : undefined}
      alt={name}
      width={28}
      height={20}
      loading="lazy"
      className="h-5 w-7 shrink-0 rounded-sm object-cover ring-1 ring-white/10"
    />
  ) : (
    <span className="grid h-5 w-7 shrink-0 place-items-center rounded-sm bg-neutral-800 text-[8px] font-bold text-neutral-400">
      {team.code ?? "?"}
    </span>
  );

  return (
    <div
      className={`flex items-center gap-2 ${
        align === "right" ? "flex-row-reverse text-right" : "text-left"
      }`}
    >
      {flag}
      <span className="truncate text-sm font-semibold">{name}</span>
    </div>
  );
}

function fmt(n: number | null): string {
  return n === null ? "?" : String(n);
}

const TZ = "America/Argentina/Buenos_Aires";

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  });
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso)
    .toLocaleDateString("es-AR", { day: "2-digit", month: "short", timeZone: TZ })
    .replace(/[.\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
