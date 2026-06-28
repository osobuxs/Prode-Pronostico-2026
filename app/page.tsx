import { getGroups, getKnockoutMatches } from "../lib/queries";
import { computeStandings } from "../lib/standings";
import { resolveBracket, buildVisualBracket, bracketRounds } from "../lib/bracket";
import { mapRealMatchesToBracket } from "../lib/knockoutData";
import { GroupCard } from "../components/GroupCard";
import { Bracket } from "../components/Bracket";
import { BracketTree } from "../components/BracketTree";
import { NavBar } from "../components/NavBar";

// Lee la base en cada carga (sin cache), así un F5 muestra el resultado
// más reciente — clave para los partidos en vivo.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  let groups: Awaited<ReturnType<typeof getGroups>> = [];
  let knockout: Awaited<ReturnType<typeof getKnockoutMatches>> = [];
  let error: string | null = null;

  try {
    [groups, knockout] = await Promise.all([getGroups(), getKnockoutMatches()]);
  } catch (e: any) {
    error = e.message;
  }

  const hasData = groups.some((g) => g.matches.length > 0);

  // Tablas de cada grupo → cuadro de dieciseisavos (proyección)
  const standingsByGroup = new Map(
    groups.map((g) => [g.name, computeStandings(g.matches)])
  );
  const bracket = hasData ? resolveBracket(standingsByGroup) : null;
  const visual = bracket ? buildVisualBracket(bracket) : null;
  // Partidos REALES de 16avos (ya confirmados) ubicados en su nº de llave:
  // sus pronósticos/consenso/resultado pisan la proyección.
  const realByNum = mapRealMatchesToBracket(knockout, standingsByGroup);

  return (
    <>
      {hasData && <NavBar groups={groups.map((g) => g.name)} />}
      <main id="top" className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-8 overflow-hidden rounded-2xl border border-neutral-800 bg-gradient-to-br from-pitch/30 via-neutral-900 to-neutral-950 p-6">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
          ⚽ Prode Mundial 2026
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-300">
          Pronósticos de <strong className="text-white">4 fuentes</strong>{" "}
          (Forebet · Vitibet · PredictZ · WinDrawWin), su{" "}
          <strong className="text-white">consenso</strong> y el resultado real.
          Se actualiza solo.
        </p>
        <Legend />
      </header>

      {error && (
        <div className="rounded-lg border border-rose-900 bg-rose-950/40 p-4 text-sm text-rose-200">
          <p className="font-semibold">No se pudo leer la base.</p>
          <p className="mt-1 text-rose-300/80">{error}</p>
          <p className="mt-2 text-rose-300/60">
            ¿Configuraste <code>.env.local</code> y corriste el schema en Supabase?
          </p>
        </div>
      )}

      {!error && !hasData && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-6 text-sm text-neutral-400">
          <p className="font-semibold text-neutral-200">Todavía no hay datos.</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Corré el schema (<code>supabase/schema.sql</code>) en Supabase.</li>
            <li><code>npm run seed</code> → trae grupos, equipos y partidos.</li>
            <li><code>npm run scrape</code> → baja los pronósticos.</li>
            <li><code>npm run update-results</code> → trae los resultados reales.</li>
          </ol>
        </div>
      )}

      {!error && hasData && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((g) => (
              <GroupCard key={g.name} group={g} />
            ))}
          </div>

          {bracket && visual && (
            <Bracket
              bracket={bracket}
              rounds={bracketRounds(visual)}
              realByNum={realByNum}
            />
          )}
        </>
      )}
      </main>

      {/* El cuadro va a TODO el ancho (fuera del contenedor centrado) */}
      {!error && hasData && visual && (
        <BracketTree bracket={visual} realByNum={realByNum} />
      )}
    </>
  );
}

function Legend() {
  const items = [
    ["bg-emerald-400", "marcador exacto"],
    ["bg-amber-400", "acertó 1X2"],
    ["bg-rose-400", "erró"],
    ["bg-neutral-500", "pendiente"],
  ] as const;
  return (
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-neutral-400">
      {items.map(([dot, label]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          {label}
        </span>
      ))}
    </div>
  );
}
