import * as cheerio from "cheerio";
import type { Scraper } from "./base";
import { parseScore } from "./base";
import { fetchRenderedHtml } from "./render";
import type { ScrapedPrediction } from "../lib/types";

const PREDICTZ_URL =
  process.env.PREDICTZ_URL ??
  "https://www.predictz.com/predictions/international/world-cup-2026-finals/";

/**
 * Scraper de PredictZ (vía Playwright — bloquea el fetch simple con 403).
 *
 * Estructura verificada contra el HTML vivo (jun 2026):
 *  cada partido es una `<tr>` que contiene:
 *   - `td.fixt a`     → "Mexico vs South Africa"  (split por " vs ")
 *   - `.predboxsml`   → "Home 1-0" / "Draw 1-1"   (tendencia + marcador; tomamos el d-d)
 *  Las filas de fecha también usan class `pzcnth`, por eso filtramos por `td.fixt`.
 */
export const predictzScraper: Scraper = {
  slug: "predictz",
  name: "PredictZ",
  url: PREDICTZ_URL,

  async scrape(): Promise<ScrapedPrediction[]> {
    const html = await fetchRenderedHtml(PREDICTZ_URL, { waitFor: "td.fixt" });
    const $ = cheerio.load(html);
    const out: ScrapedPrediction[] = [];

    $("tr")
      .filter((_, el) => $(el).find("td.fixt").length > 0)
      .each((_, el) => {
        const row = $(el);
        const fixture = clean(row.find("td.fixt a").first().text()); // "Mexico vs South Africa"
        const [homeTeam, awayTeam] = fixture.split(/\s+vs?\s+/i);
        if (!homeTeam || !awayTeam) return;

        // "Home 1-0" → marcador 1-0
        const predText = clean(row.find(".predboxsml").first().text());
        const [predHome, predAway] = parseScore(predText);

        out.push({ homeTeam, awayTeam, predHome, predAway });
      });

    return out;
  },
};

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}
