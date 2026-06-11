import "./_env";
import { createAdminClient } from "../lib/supabase";
import { SCRAPERS } from "../scrapers";
import { canonicalTeam, matchKey } from "../lib/normalize";

/**
 * Corre TODOS los scrapers, cruza cada pronóstico con el partido real
 * de la DB y hace upsert en predictions (una predicción vigente por
 * fuente y partido).
 *
 * Modo prueba (no escribe nada, solo imprime lo que encontró):
 *   npm run scrape -- --dry
 *
 * Usalo para AFINAR los selectores de cada scraper sin tocar la base.
 */
const DRY = process.argv.includes("--dry");

async function main() {
  const db = createAdminClient();

  // ── Índices para cruzar nombres → ids ─────────────────────────
  const { data: teams } = await db.from("teams").select("id,name");
  const { data: matches } = await db
    .from("matches")
    .select("id,home_team_id,away_team_id");
  const { data: sources } = await db.from("sources").select("id,slug");

  if (!DRY && (!teams || !matches || !sources)) {
    throw new Error("La DB está vacía. Corré `npm run seed` primero.");
  }

  const teamNameById = new Map<number, string>(
    (teams ?? []).map((t) => [t.id, canonicalTeam(t.name)])
  );
  // matchKey canónico (local__vs__visitante) → match_id
  const matchIdByKey = new Map<string, number>();
  for (const m of matches ?? []) {
    const home = teamNameById.get(m.home_team_id!);
    const away = teamNameById.get(m.away_team_id!);
    if (home && away) matchIdByKey.set(`${home}__vs__${away}`, m.id);
  }
  const sourceIdBySlug = new Map<string, number>(
    (sources ?? []).map((s) => [s.slug, s.id])
  );

  // ── Correr cada scraper ───────────────────────────────────────
  for (const scraper of SCRAPERS) {
    console.log(`\n→ ${scraper.name} (${scraper.url})`);
    let rows;
    try {
      rows = await scraper.scrape();
    } catch (e: any) {
      console.error(`  ✗ Falló: ${e.message}`);
      continue;
    }
    console.log(`  ${rows.length} pronósticos parseados.`);

    let matched = 0;
    let saved = 0;
    const sourceId = sourceIdBySlug.get(scraper.slug);

    for (const r of rows) {
      // probar orden directo y, si no, invertido (la fuente puede tener
      // local/visitante al revés que el fixture oficial)
      const direct = matchKey(r.homeTeam, r.awayTeam);
      const swapped = matchKey(r.awayTeam, r.homeTeam);
      let matchId = matchIdByKey.get(direct);
      let predHome = r.predHome;
      let predAway = r.predAway;
      let probHome = r.probHome;
      let probAway = r.probAway;

      if (!matchId && matchIdByKey.has(swapped)) {
        matchId = matchIdByKey.get(swapped);
        // invertir el marcador y las probabilidades
        [predHome, predAway] = [predAway, predHome];
        [probHome, probAway] = [probAway ?? null, probHome ?? null];
      }

      if (DRY) {
        const tag = matchId ? "✓" : "·";
        console.log(
          `  ${tag} ${r.homeTeam} ${predHome ?? "?"}-${predAway ?? "?"} ${r.awayTeam}`
        );
        if (matchId) matched++;
        continue;
      }

      if (!matchId || sourceId === undefined) continue;
      matched++;

      // si la fuente trae el estadio, lo guardamos en el partido
      if (r.venue) {
        await db.from("matches").update({ venue: r.venue }).eq("id", matchId);
      }

      const { error } = await db.from("predictions").upsert(
        {
          match_id: matchId,
          source_id: sourceId,
          pred_home: predHome,
          pred_away: predAway,
          prob_home: probHome ?? null,
          prob_draw: r.probDraw ?? null,
          prob_away: probAway ?? null,
          scraped_at: new Date().toISOString(),
        },
        { onConflict: "match_id,source_id" }
      );
      if (!error) saved++;
    }

    console.log(
      DRY
        ? `  ${matched}/${rows.length} cruzaron con un partido de la DB.`
        : `  ${matched} cruzados, ${saved} guardados.`
    );
  }

  console.log(DRY ? "\n(dry-run: no se escribió nada)" : "\n✓ Scrape completo.");
}

main().catch((e) => {
  console.error("✗ scrape falló:", e.message);
  process.exit(1);
});
