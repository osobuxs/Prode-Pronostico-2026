import type { VisualBracket, BracketNode, BracketSlot, Round } from "../lib/bracket";
import { flagUrl, displayName } from "../lib/flags";
import { knockoutFixture } from "../lib/fixture";
import { WorldCupTrophy } from "./WorldCupTrophy";

const ROUND_LABEL: Record<Round, string> = {
  R32: "Dieciseisavos",
  R16: "Octavos",
  QF: "Cuartos",
  SF: "Semis",
  F: "Final",
};

export function BracketTree({ bracket }: { bracket: VisualBracket }) {
  const leftCols: Round[] = ["R32", "R16", "QF", "SF"];
  const rightCols: Round[] = ["SF", "QF", "R16", "R32"];

  return (
    <section id="cuadro" className="mt-12 scroll-mt-16 px-3 sm:px-6">
      <header className="mb-4 text-center">
        <h2 className="text-2xl font-black tracking-tight">🗺️ Camino a la final</h2>
        <p className="mx-auto mt-1 max-w-2xl text-sm text-neutral-400">
          El cuadro completo. Las llaves se van llenando a medida que se juega —
          los equipos en <em className="not-italic text-amber-400">cursiva</em> son
          posiciones tentativas (el grupo todavía no terminó).
        </p>
      </header>

      {/* full-width en PC; en móvil scroll horizontal */}
      <div className="overflow-x-auto pb-4">
        <div className="flex w-full min-w-[1180px] items-stretch" style={{ minHeight: 700 }}>
          {leftCols.map((r, i) => (
            <Column
              key={`l-${r}`}
              round={r}
              nodes={bracket.left[r as "R32" | "R16" | "QF" | "SF"]}
              dir="left"
              isLast={i === leftCols.length - 1}
            />
          ))}

          <CenterFinal node={bracket.final} thirdPlace={bracket.thirdPlace} />

          {rightCols.map((r, i) => (
            <Column
              key={`r-${r}`}
              round={r}
              nodes={bracket.right[r as "R32" | "R16" | "QF" | "SF"]}
              dir="right"
              isLast={i === 0}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Column({
  round,
  nodes,
  dir,
  isLast,
}: {
  round: Round;
  nodes: BracketNode[];
  dir: "left" | "right";
  isLast: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div
        className={`mb-2 text-[10px] font-bold uppercase tracking-wide text-neutral-500 ${
          dir === "left" ? "text-left" : "text-right"
        }`}
      >
        {ROUND_LABEL[round]}
      </div>
      <div className="flex flex-1 flex-col justify-around">
        {nodes.map((node, idx) => {
          const connectorSide = dir === "left" ? "border-r-2" : "border-l-2";
          const pairBorder = !isLast ? (idx % 2 === 0 ? "border-b-2" : "border-t-2") : "";
          return (
            <div
              key={node.num}
              className={`flex flex-1 items-center ${!isLast ? connectorSide : ""} ${pairBorder} border-neutral-700 ${
                dir === "left" ? "pr-3" : "pl-3"
              }`}
            >
              <MatchBox node={node} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CenterFinal({ node, thirdPlace }: { node: BracketNode; thirdPlace: BracketNode }) {
  return (
    <div className="flex shrink-0 flex-col items-center justify-center px-3" style={{ width: 188 }}>
      <div className="mb-2 text-xs font-black uppercase tracking-widest text-amber-400">
        Final
      </div>
      <WorldCupTrophy size={84} />
      <div className="mt-3 w-full rounded-xl border border-amber-500/40 bg-gradient-to-b from-amber-500/15 to-transparent p-2">
        <SlotLine slot={node.top} />
        <div className="my-1 text-center text-[9px] font-bold text-amber-600/70">VS</div>
        <SlotLine slot={node.bottom} />
        <FixtureLine num={node.num} />
      </div>
      <div className="mt-1.5 text-[9px] text-neutral-600">Partido {node.num}</div>

      {/* Tercer puesto, debajo de la final */}
      <div className="mt-5 w-full">
        <div className="mb-1 text-center text-[10px] font-bold uppercase tracking-wide text-orange-300/80">
          🥉 Tercer puesto
        </div>
        <div className="w-full rounded-lg border border-orange-700/40 bg-orange-950/20 p-2">
          <SlotLine slot={thirdPlace.top} />
          <div className="my-0.5 h-px bg-neutral-800" />
          <SlotLine slot={thirdPlace.bottom} />
          <FixtureLine num={thirdPlace.num} />
        </div>
      </div>
    </div>
  );
}

function MatchBox({ node }: { node: BracketNode }) {
  // Siempre mostramos los dos slots (con label si aún no hay equipo),
  // igual en TODAS las rondas — así se ve "Ganador P74 vs Ganador P77".
  return (
    <div className="w-full rounded-lg border border-neutral-800 bg-neutral-900/70 px-2 py-1.5">
      <div className="mb-1 text-center text-[8px] font-bold uppercase tracking-wide text-neutral-600">
        Partido {node.num}
      </div>
      <SlotLine slot={node.top} />
      <div className="my-0.5 h-px bg-neutral-800" />
      <SlotLine slot={node.bottom} />
      <FixtureLine num={node.num} />
    </div>
  );
}

/** Fecha + sede fija del partido del cuadro (no depende de los equipos). */
function FixtureLine({ num }: { num: number }) {
  const fx = knockoutFixture(num);
  if (!fx || !fx.venue) return null;
  const flag = flagUrl(fx.venue.countryCode);
  return (
    <div className="mt-1 border-t border-neutral-800 pt-1 text-center">
      <div className="flex items-center justify-center gap-1 text-[9px] text-neutral-400">
        <span className="font-semibold">{fx.date}</span>
        <span className="text-neutral-500">{fx.time}</span>
        <span className="text-neutral-600">·</span>
        {flag && (
          <img
            src={flag}
            alt={fx.venue.country}
            width={15}
            height={11}
            loading="lazy"
            className="h-[11px] w-[15px] rounded-[1px] object-cover ring-1 ring-white/20"
          />
        )}
        <span className="truncate">{fx.venue.city}</span>
      </div>
      <div className="truncate text-[8.5px] text-neutral-600">{fx.venue.stadium}</div>
    </div>
  );
}

function SlotLine({ slot }: { slot: BracketSlot }) {
  const flag = slot.team ? flagUrl(slot.team.code) : null;
  return (
    <div className="flex items-center gap-1.5">
      {flag ? (
        <img
          src={flag}
          alt=""
          width={18}
          height={13}
          loading="lazy"
          className="h-[13px] w-[18px] shrink-0 rounded-[2px] object-cover ring-1 ring-white/10"
        />
      ) : (
        <span className="h-[13px] w-[18px] shrink-0 rounded-[2px] bg-neutral-800/60" />
      )}
      {slot.team ? (
        <span
          className={`truncate text-[11px] font-semibold ${
            slot.provisional ? "italic text-amber-200/90" : ""
          }`}
        >
          {displayName(slot.team.name, slot.team.code)}
        </span>
      ) : (
        <span className="truncate text-[10px] italic text-neutral-500">{slot.label}</span>
      )}
    </div>
  );
}
