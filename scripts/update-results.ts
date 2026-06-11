import "./_env";
import { createAdminClient } from "../lib/supabase";
import { fetchGroupStageMatches, mapStatus } from "../lib/footballData";

/**
 * Actualiza el RESULTADO REAL de los partidos.
 * Baja el fixture de football-data.org y, cruzando por external_id,
 * escribe marcador y estado (scheduled/live/finished) en la DB.
 *
 * Este es el script que el CRON corre seguido (cada hora / durante partidos).
 *
 * Correr:  npm run update-results
 */
async function main() {
  const db = createAdminClient();

  console.log("→ Bajando resultados de football-data.org…");
  const fdMatches = await fetchGroupStageMatches();
  let updated = 0;

  for (const m of fdMatches) {
    const { error, count } = await db
      .from("matches")
      .update(
        {
          home_score: m.score.fullTime.home,
          away_score: m.score.fullTime.away,
          status: mapStatus(m.status),
          kickoff: m.utcDate,
        },
        { count: "exact" }
      )
      .eq("external_id", String(m.id));

    if (error) {
      console.warn(`  ⚠ ${m.homeTeam.name} vs ${m.awayTeam.name}: ${error.message}`);
      continue;
    }
    if (count && count > 0) updated++;
  }

  console.log(`✓ ${updated} partidos actualizados.`);
}

main().catch((e) => {
  console.error("✗ update-results falló:", e.message);
  process.exit(1);
});
