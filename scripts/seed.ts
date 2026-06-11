import "./_env";
import { createAdminClient } from "../lib/supabase";
import { SCRAPERS } from "../scrapers";
import {
  fetchGroupStageMatches,
  groupLetter,
  mapStatus,
} from "../lib/footballData";

/**
 * Puebla la base con la VERDAD OFICIAL del fixture:
 *   grupos (A..L), 48 selecciones, 72 partidos de fase de grupos.
 * Los datos salen de football-data.org, así NO inventamos nada.
 * Guarda el external_id de cada partido para cruzar el resultado real después.
 *
 * Correr:  npm run seed
 */
async function main() {
  const db = createAdminClient();

  // 1) Fuentes de pronóstico (a partir del registro de scrapers)
  console.log("→ Sembrando fuentes…");
  for (const s of SCRAPERS) {
    await db
      .from("sources")
      .upsert({ slug: s.slug, name: s.name, url: s.url }, { onConflict: "slug" });
  }

  // 2) Fixture oficial
  console.log("→ Bajando fixture de football-data.org…");
  const fdMatches = await fetchGroupStageMatches();
  if (fdMatches.length === 0) {
    console.warn(
      "⚠ No vino ningún partido de fase de grupos. Puede que el fixture aún no esté publicado " +
        "o que tu plan no incluya la competición. Revisá FOOTBALL_DATA_COMPETITION y tu key."
    );
    return;
  }
  console.log(`  ${fdMatches.length} partidos de fase de grupos.`);

  // 3) Grupos únicos
  const letters = [...new Set(fdMatches.map((m) => groupLetter(m.group)).filter(Boolean))] as string[];
  letters.sort();
  const groupIdByLetter: Record<string, number> = {};
  for (const letter of letters) {
    const { data, error } = await db
      .from("groups")
      .upsert({ name: letter }, { onConflict: "name" })
      .select("id")
      .single();
    if (error) abort("grupos", error);
    if (data) groupIdByLetter[letter] = data.id;
  }
  console.log(`  ${Object.keys(groupIdByLetter).length} grupos: ${letters.join(", ")}`);

  // 4) Equipos (con su grupo)
  const teamIdByFd: Record<number, number> = {};
  for (const m of fdMatches) {
    const letter = groupLetter(m.group)!;
    for (const t of [m.homeTeam, m.awayTeam]) {
      if (teamIdByFd[t.id]) continue;
      const { data, error } = await db
        .from("teams")
        .upsert(
          { name: t.name, code: t.tla, group_id: groupIdByLetter[letter] },
          { onConflict: "name" }
        )
        .select("id")
        .single();
      if (error) abort("equipos", error);
      if (data) teamIdByFd[t.id] = data.id;
    }
  }
  console.log(`  ${Object.keys(teamIdByFd).length} selecciones.`);

  // 5) Partidos (con external_id para cruzar resultados)
  let saved = 0;
  for (const m of fdMatches) {
    const letter = groupLetter(m.group)!;
    const { error } = await db.from("matches").upsert(
      {
        group_id: groupIdByLetter[letter],
        home_team_id: teamIdByFd[m.homeTeam.id],
        away_team_id: teamIdByFd[m.awayTeam.id],
        kickoff: m.utcDate,
        external_id: String(m.id),
        home_score: m.score.fullTime.home,
        away_score: m.score.fullTime.away,
        status: mapStatus(m.status),
      },
      { onConflict: "home_team_id,away_team_id" }
    );
    if (error) abort("partidos", error);
    saved++;
  }
  console.log(`  ${saved} partidos sembrados.`);
  console.log("✓ Seed completo.");
}

/** Frena el seed con un mensaje útil ante un error de Supabase. */
function abort(paso: string, error: { message: string }): never {
  console.error(`\n✗ Error guardando ${paso}: ${error.message}`);
  if (/schema cache|does not exist|find the table/i.test(error.message)) {
    console.error(
      "\n  → Las tablas no existen todavía. Corré el schema primero:\n" +
        "    Supabase → SQL Editor → New query → pegá supabase/schema.sql → Run\n"
    );
  }
  process.exit(1);
}

main().catch((e) => {
  console.error("✗ Seed falló:", e.message);
  process.exit(1);
});
