import "./_env";
import { createAdminClient } from "../lib/supabase";
import { fetchSeasonEvents, mapSdbStatus, toScore } from "../lib/sportsdb";
import { canonicalTeam } from "../lib/normalize";

/**
 * Actualiza el RESULTADO REAL de los partidos desde TheSportsDB
 * (football-data free no da los marcadores). Cruza por los equipos
 * (nombre canónico), manejando el orden local/visitante.
 *
 * Trae los partidos de hoy y los 2 días previos (UTC) — suficiente para
 * capturar lo recién jugado en cada corrida del cron.
 *
 * Correr:  npm run update-results
 */
async function main() {
  const db = createAdminClient();

  // índices: equipo canónico → id, y matchKey → match
  const { data: teams } = await db.from("teams").select("id,name");
  const { data: matches } = await db.from("matches").select("id,home_team_id,away_team_id");
  if (!teams || !matches) throw new Error("DB vacía. Corré `npm run seed` primero.");

  const canonById = new Map(teams.map((t) => [t.id, canonicalTeam(t.name)]));
  // key "home__away" canónico → { id, invertido:false }
  const matchByKey = new Map<string, { id: number; swap: boolean }>();
  for (const m of matches) {
    const h = canonById.get(m.home_team_id!);
    const a = canonById.get(m.away_team_id!);
    if (!h || !a) continue;
    matchByKey.set(`${h}__${a}`, { id: m.id, swap: false });
    matchByKey.set(`${a}__${h}`, { id: m.id, swap: true }); // por si la fuente invierte
  }

  const events = await fetchSeasonEvents();
  let updated = 0;
  let live = 0;
  for (const ev of events) {
    const home = canonicalTeam(ev.strHomeTeam);
    const away = canonicalTeam(ev.strAwayTeam);
    const found = matchByKey.get(`${home}__${away}`);
    if (!found) continue;

    let hs = toScore(ev.intHomeScore);
    let as = toScore(ev.intAwayScore);
    if (found.swap) [hs, as] = [as, hs]; // alinear con el orden de la DB

    const status = mapSdbStatus(ev.strStatus);
    // no pisar con un partido aún sin empezar y sin datos
    if (status === "scheduled" && hs === null && as === null) continue;
    if (status === "live") live++;

    const { error } = await db
      .from("matches")
      .update({ home_score: hs, away_score: as, status })
      .eq("id", found.id);
    if (!error) updated++;
  }

  console.log(`✓ ${updated} partidos actualizados (${live} en vivo) — TheSportsDB.`);
}

main().catch((e) => {
  console.error("✗ update-results falló:", e.message);
  process.exit(1);
});
