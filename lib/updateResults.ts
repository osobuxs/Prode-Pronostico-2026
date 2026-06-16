import { createAdminClient } from "./supabase";
import { fetchAllRelevantEvents, mapSdbStatus, toScore } from "./sportsdb";
import { canonicalTeam } from "./normalize";

/**
 * Actualiza el RESULTADO REAL de los partidos desde TheSportsDB
 * (football-data free no da los marcadores). Cruza por los equipos
 * (nombre canónico), manejando el orden local/visitante.
 *
 * Lo usan tanto el script CLI (npm run update-results) como el endpoint
 * /api/update-results (que dispara un cron externo, más confiable que
 * el cron de GitHub Actions para los partidos en vivo).
 */
export async function runUpdateResults(): Promise<{ updated: number; live: number }> {
  const db = createAdminClient();

  const { data: teams } = await db.from("teams").select("id,name");
  const { data: matches } = await db
    .from("matches")
    .select("id,home_team_id,away_team_id,group_id");
  if (!teams || !matches) throw new Error("DB vacía. Corré `npm run seed` primero.");

  const canonById = new Map(teams.map((t) => [t.id, canonicalTeam(t.name)]));
  const matchByKey = new Map<string, { id: number; swap: boolean; isGroup: boolean }>();
  for (const m of matches) {
    const h = canonById.get(m.home_team_id!);
    const a = canonById.get(m.away_team_id!);
    if (!h || !a) continue;
    const isGroup = m.group_id != null;
    matchByKey.set(`${h}__${a}`, { id: m.id, swap: false, isGroup });
    matchByKey.set(`${a}__${h}`, { id: m.id, swap: true, isGroup });
  }

  const events = await fetchAllRelevantEvents();
  let updated = 0;
  let live = 0;
  for (const ev of events) {
    const home = canonicalTeam(ev.strHomeTeam);
    const away = canonicalTeam(ev.strAwayTeam);
    const found = matchByKey.get(`${home}__${away}`);
    if (!found) continue;

    let hs = toScore(ev.intHomeScore);
    let as = toScore(ev.intAwayScore);
    if (found.swap) [hs, as] = [as, hs];

    let status = mapSdbStatus(ev.strStatus);

    // Red de seguridad: TheSportsDB a veces deja el partido en "en vivo"
    // mucho después de terminado (delay en marcar FT). Si pasó el tiempo
    // razonable y sigue "live", lo damos por terminado.
    //   - grupos: 2.5h (no hay alargue ni penales)
    //   - eliminatorias: 4h (puede ir a alargue + penales ~3h)
    if (status === "live" && ev.dateEvent && ev.strTime) {
      const start = Date.parse(`${ev.dateEvent}T${ev.strTime}Z`);
      const limitMin = found.isGroup ? 150 : 240;
      if (Number.isFinite(start) && Date.now() - start > limitMin * 60 * 1000) {
        status = "finished";
      }
    }

    if (status === "scheduled" && hs === null && as === null) continue;
    if (status === "live") live++;

    const { error } = await db
      .from("matches")
      .update({ home_score: hs, away_score: as, status })
      .eq("id", found.id);
    if (!error) updated++;
  }

  return { updated, live };
}
