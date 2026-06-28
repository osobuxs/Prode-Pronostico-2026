import "./_env";
import { createAdminClient } from "../lib/supabase";
import { fetchKnockoutMatches, mapStatus } from "../lib/footballData";
import { canonicalTeam } from "../lib/normalize";

/**
 * Persiste los partidos de fase ELIMINATORIA cuyos equipos ya están
 * confirmados (16avos, después octavos, etc.). Sin esto, los pronósticos
 * de esos partidos no tienen contra qué cruzar y el scrape los descarta.
 *
 * Los equipos ya existen en `teams` (los sembró `npm run seed` con la fase
 * de grupos), así que acá solo resolvemos su id por nombre canónico e
 * insertamos las filas con group_id NULL (= fase eliminatoria).
 *
 * Es IDEMPOTENTE (onConflict por par de equipos) y se puede re-correr cada
 * vez que se confirma una ronda nueva.
 *
 *   npm run seed:knockout
 */
async function main() {
  const db = createAdminClient();

  console.log("→ Bajando partidos de eliminatoria de football-data.org…");
  const fdMatches = await fetchKnockoutMatches();
  if (fdMatches.length === 0) {
    console.warn(
      "⚠ Ningún partido de eliminatoria con ambos equipos confirmados todavía."
    );
    return;
  }
  console.log(`  ${fdMatches.length} partidos con ambos equipos confirmados.`);

  const { data: teams } = await db.from("teams").select("id,name");
  if (!teams || teams.length === 0) {
    throw new Error("No hay equipos en la DB. Corré `npm run seed` primero.");
  }
  const teamIdByCanon = new Map(teams.map((t) => [canonicalTeam(t.name), t.id]));

  let saved = 0;
  const missing: string[] = [];

  for (const m of fdMatches) {
    const homeId = teamIdByCanon.get(canonicalTeam(m.homeTeam.name));
    const awayId = teamIdByCanon.get(canonicalTeam(m.awayTeam.name));
    if (!homeId || !awayId) {
      missing.push(`${m.homeTeam.name} vs ${m.awayTeam.name}`);
      continue;
    }

    const { error } = await db.from("matches").upsert(
      {
        group_id: null, // fase eliminatoria
        home_team_id: homeId,
        away_team_id: awayId,
        kickoff: m.utcDate,
        external_id: String(m.id),
        home_score: m.score.fullTime.home,
        away_score: m.score.fullTime.away,
        status: mapStatus(m.status),
      },
      { onConflict: "home_team_id,away_team_id" }
    );
    if (error) {
      console.error(`✗ ${m.homeTeam.name} vs ${m.awayTeam.name}: ${error.message}`);
      continue;
    }
    saved++;
  }

  if (missing.length > 0) {
    console.warn(
      `⚠ ${missing.length} partido(s) sin equipo en la DB (revisá los alias en lib/normalize.ts):\n  ` +
        missing.join("\n  ")
    );
  }
  console.log(`✓ ${saved} partidos de eliminatoria sembrados.`);
}

main().catch((e) => {
  console.error("✗ seed-knockout falló:", e.message);
  process.exit(1);
});
