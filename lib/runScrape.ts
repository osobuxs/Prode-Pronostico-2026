import type { Scraper } from "../scrapers/base";
import { createAdminClient } from "./supabase";
import { canonicalTeam, matchKey } from "./normalize";
import { isIngestionDisabled } from "./ingestionGate";

export interface ScrapeSourceResult {
  source: string;
  parsed: number;
  matched: number;
  saved: number;
  error?: string;
}

/**
 * Corre los scrapers que se le pasen, cruza cada pronóstico con el partido
 * de la DB y hace upsert en predictions. Recibe la lista de scrapers por
 * parámetro para no acoplar Playwright: el endpoint de Vercel le pasa solo
 * los que NO usan navegador.
 *
 * @param scrapers  lista de fuentes a correr
 * @param opts.dry  si true, no escribe (solo informa lo que cruzaría)
 */
export async function runScrape(
  scrapers: Scraper[],
  opts: { dry?: boolean } = {}
): Promise<ScrapeSourceResult[]> {
  const dry = opts.dry ?? false;
  if (isIngestionDisabled()) return [];
  const db = createAdminClient();

  const { data: teams } = await db.from("teams").select("id,name");
  const { data: matches } = await db.from("matches").select("id,home_team_id,away_team_id");
  const { data: sources } = await db.from("sources").select("id,slug");
  if (!teams || !matches || !sources) {
    throw new Error("La DB está vacía. Corré `npm run seed` primero.");
  }

  const teamNameById = new Map<number, string>(
    teams.map((t) => [t.id, canonicalTeam(t.name)])
  );
  const matchIdByKey = new Map<string, number>();
  for (const m of matches) {
    const home = teamNameById.get(m.home_team_id!);
    const away = teamNameById.get(m.away_team_id!);
    if (home && away) matchIdByKey.set(`${home}__vs__${away}`, m.id);
  }
  const sourceIdBySlug = new Map<string, number>(sources.map((s) => [s.slug, s.id]));

  const results: ScrapeSourceResult[] = [];

  for (const scraper of scrapers) {
    let rows;
    try {
      rows = await scraper.scrape();
    } catch (e: any) {
      results.push({ source: scraper.name, parsed: 0, matched: 0, saved: 0, error: e.message });
      continue;
    }

    let matched = 0;
    let saved = 0;
    const sourceId = sourceIdBySlug.get(scraper.slug);

    for (const r of rows) {
      const direct = matchKey(r.homeTeam, r.awayTeam);
      const swapped = matchKey(r.awayTeam, r.homeTeam);
      let matchId = matchIdByKey.get(direct);
      let predHome = r.predHome;
      let predAway = r.predAway;
      let probHome = r.probHome;
      let probAway = r.probAway;

      if (!matchId && matchIdByKey.has(swapped)) {
        matchId = matchIdByKey.get(swapped);
        [predHome, predAway] = [predAway, predHome];
        [probHome, probAway] = [probAway ?? null, probHome ?? null];
      }

      if (!matchId) continue;
      matched++;
      if (dry || sourceId === undefined) continue;

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

    results.push({ source: scraper.name, parsed: rows.length, matched, saved });
  }

  return results;
}
