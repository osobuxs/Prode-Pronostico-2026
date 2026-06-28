import type { ResolvedBracket, RoundSection, BracketNode, BracketSlot } from "../lib/bracket";
import type { MatchView } from "../lib/queries";
import { flagUrl, displayName } from "../lib/flags";
import { knockoutFixture } from "../lib/fixture";

const GRADE_STYLE: Record<string, string> = {
  exact: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  outcome: "text-amber-400 border-amber-500/40 bg-amber-500/10",
  miss: "text-rose-400 border-rose-500/30 bg-rose-500/5",
  pending: "text-neutral-400 border-neutral-700 bg-neutral-800/40",
};

export function Bracket({
  bracket,
  rounds,
  realByNum,
}: {
  bracket: ResolvedBracket;
  rounds: RoundSection[];
  realByNum: Map<number, MatchView>;
}) {
  return (
    <div className="mt-10">
      <ThirdsSummary bracket={bracket} />

      {rounds.map((round) => (
        <section key={round.id} id={round.id} className="mb-8 scroll-mt-16">
          <h2 className="mb-3 text-xl font-black tracking-tight">{round.label}</h2>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {round.matches.map((m) => (
              <MatchCard key={m.num} node={m} real={realByNum.get(m.num)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function MatchCard({ node, real }: { node: BracketNode; real?: MatchView }) {
  const fx = knockoutFixture(node.num);
  const flag = fx?.venue ? flagUrl(fx.venue.countryCode) : null;
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-600">
          Partido {node.num}
        </span>
        {fx && (
          <span className="text-[10px] font-semibold text-neutral-400">
            {fx.date} · {fx.time}
          </span>
        )}
      </div>
      {real ? (
        <RealMatch match={real} />
      ) : (
        <>
          <SlotRow slot={node.top} />
          <div className="my-1 text-center text-[9px] font-bold text-neutral-700">VS</div>
          <SlotRow slot={node.bottom} />
        </>
      )}
      {fx?.venue && (
        <div className="mt-2 flex items-center gap-1.5 border-t border-neutral-800 pt-1.5 text-[10px] text-neutral-500">
          {flag && (
            <img
              src={flag}
              alt=""
              width={14}
              height={10}
              loading="lazy"
              className="h-[10px] w-[14px] rounded-[1px] object-cover ring-1 ring-white/15"
            />
          )}
          <span className="truncate">
            {fx.venue.stadium} · {fx.venue.city}
          </span>
        </div>
      )}
    </div>
  );
}

/** Llave de 16avos YA confirmada: equipos reales + marcador + consenso. */
function RealMatch({ match }: { match: MatchView }) {
  const live = match.status === "live";
  const finished = match.status === "finished";
  const hasScore = match.realHome !== null || match.realAway !== null;
  const showScore = (live || finished) && hasScore;

  return (
    <>
      <TeamLine team={match.home} />
      <div className="my-1 flex items-center justify-center gap-2 text-[9px] font-bold text-neutral-700">
        {showScore ? (
          <span
            className={`rounded px-2 py-0.5 text-sm font-black tabular-nums ${
              live ? "bg-rose-600 text-white" : "bg-neutral-800 text-white"
            }`}
          >
            {match.realHome ?? 0}–{match.realAway ?? 0}
          </span>
        ) : (
          "VS"
        )}
        {live && (
          <span className="flex items-center gap-1 text-[8px] uppercase text-rose-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
            vivo
          </span>
        )}
      </div>
      <TeamLine team={match.away} />

      {/* Consenso de las fuentes */}
      <div className="mt-2 flex items-center justify-center gap-1.5 border-t border-neutral-800 pt-1.5">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-neutral-500">
          Consenso
        </span>
        {match.consensus.sampleSize > 0 ? (
          <>
            <span
              className={`rounded border px-1.5 py-0.5 text-[11px] font-black tabular-nums ${GRADE_STYLE[match.consensusGrade]}`}
            >
              {fmt(match.consensus.predHome)}–{fmt(match.consensus.predAway)}
            </span>
            <span className="text-[9px] text-neutral-600">
              {match.consensus.sampleSize} fuentes
            </span>
          </>
        ) : (
          <span className="text-[10px] text-neutral-600">sin pronósticos aún</span>
        )}
      </div>

      {match.predictions.length > 0 && (
        <div className="mt-1.5 flex flex-wrap justify-center gap-1">
          {match.predictions.map((p, i) => (
            <span
              key={i}
              className={`rounded border px-1 py-0.5 text-[9px] font-medium ${GRADE_STYLE[p.grade]}`}
            >
              <span className="opacity-70">{p.sourceName}</span>{" "}
              <span className="tabular-nums">
                {fmt(p.predHome)}–{fmt(p.predAway)}
              </span>
            </span>
          ))}
        </div>
      )}
    </>
  );
}

function TeamLine({ team }: { team: { name: string; code: string | null } }) {
  const flag = flagUrl(team.code);
  return (
    <div className="flex items-center gap-2">
      {flag ? (
        <img
          src={flag}
          alt=""
          width={22}
          height={16}
          loading="lazy"
          className="h-4 w-[22px] shrink-0 rounded-[2px] object-cover ring-1 ring-white/10"
        />
      ) : (
        <span className="grid h-4 w-[22px] shrink-0 place-items-center rounded-[2px] bg-neutral-800 text-[7px] text-neutral-500">
          ?
        </span>
      )}
      <span className="truncate text-sm font-semibold">
        {displayName(team.name, team.code)}
      </span>
    </div>
  );
}

function fmt(n: number | null): string {
  return n === null ? "?" : String(n);
}

function SlotRow({ slot }: { slot: BracketSlot }) {
  const flag = slot.team ? flagUrl(slot.team.code) : null;
  return (
    <div className="flex items-center gap-2">
      {flag ? (
        <img
          src={flag}
          alt=""
          width={22}
          height={16}
          loading="lazy"
          className="h-4 w-[22px] shrink-0 rounded-[2px] object-cover ring-1 ring-white/10"
        />
      ) : (
        <span className="grid h-4 w-[22px] shrink-0 place-items-center rounded-[2px] bg-neutral-800 text-[7px] text-neutral-500">
          ?
        </span>
      )}
      {slot.team ? (
        <span
          className={`truncate text-sm font-semibold ${
            slot.provisional ? "italic text-amber-200/90" : ""
          }`}
        >
          {displayName(slot.team.name, slot.team.code)}
        </span>
      ) : (
        <span className="truncate text-xs italic text-neutral-500">{slot.label}</span>
      )}
    </div>
  );
}

function ThirdsSummary({ bracket }: { bracket: ResolvedBracket }) {
  const { qualified, eliminated } = bracket.thirds;
  if (qualified.length === 0) return null;
  return (
    <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-400">
        Mejores terceros — clasifican 8 de 12
      </p>
      <div className="flex flex-wrap gap-1.5">
        {qualified.map((t, i) => (
          <span
            key={t.group}
            className="flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[11px]"
            title={`${t.row.pts} pts · DG ${t.row.dg}`}
          >
            <span className="text-neutral-500">{i + 1}.</span>
            <FlagMini code={t.row.code} />
            <span className="font-medium">{displayName(t.row.name, t.row.code)}</span>
            <span className="text-neutral-500">({t.group})</span>
          </span>
        ))}
        {eliminated.map((t) => (
          <span
            key={t.group}
            className="flex items-center gap-1 rounded-md border border-neutral-800 px-1.5 py-0.5 text-[11px] text-neutral-500 line-through"
            title={`${t.row.pts} pts · DG ${t.row.dg}`}
          >
            <FlagMini code={t.row.code} />
            {displayName(t.row.name, t.row.code)} ({t.group})
          </span>
        ))}
      </div>
    </div>
  );
}

function FlagMini({ code }: { code: string | null }) {
  const flag = flagUrl(code);
  if (!flag) return <span className="h-3 w-[16px] rounded-[2px] bg-neutral-800" />;
  return (
    <img
      src={flag}
      alt=""
      width={16}
      height={11}
      loading="lazy"
      className="h-[11px] w-[16px] rounded-[1px] object-cover ring-1 ring-white/10"
    />
  );
}
