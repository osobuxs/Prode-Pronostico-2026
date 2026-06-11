import type { ResolvedBracket, RoundSection, BracketNode, BracketSlot } from "../lib/bracket";
import { flagUrl, displayName } from "../lib/flags";
import { knockoutFixture } from "../lib/fixture";

export function Bracket({
  bracket,
  rounds,
}: {
  bracket: ResolvedBracket;
  rounds: RoundSection[];
}) {
  return (
    <div className="mt-10">
      <ThirdsSummary bracket={bracket} />

      {rounds.map((round) => (
        <section key={round.id} id={round.id} className="mb-8 scroll-mt-16">
          <h2 className="mb-3 text-xl font-black tracking-tight">{round.label}</h2>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {round.matches.map((m) => (
              <MatchCard key={m.num} node={m} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function MatchCard({ node }: { node: BracketNode }) {
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
      <SlotRow slot={node.top} />
      <div className="my-1 text-center text-[9px] font-bold text-neutral-700">VS</div>
      <SlotRow slot={node.bottom} />
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
