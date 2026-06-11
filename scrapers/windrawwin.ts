import * as cheerio from "cheerio";
import type { Scraper } from "./base";
import { parseScore } from "./base";
import { fetchRenderedHtml } from "./render";
import type { ScrapedPrediction } from "../lib/types";

const WINDRAWWIN_URL =
  process.env.WINDRAWWIN_URL ?? "https://www.windrawwin.com/world-cup-2026/";

/**
 * Scraper de WinDrawWin (vía Playwright — bloquea el fetch simple con 403).
 *
 * Estructura verificada contra el HTML vivo (jun 2026):
 *  cada partido es una fila `.wttr`. Dentro:
 *   - `.wtfixt`  → "Mexico v South Africa"  (split por " v ")
 *   - `.wtsc`    → marcador pronosticado "1-0"
 */
export const windrawwinScraper: Scraper = {
  slug: "windrawwin",
  name: "WinDrawWin",
  url: WINDRAWWIN_URL,

  async scrape(): Promise<ScrapedPrediction[]> {
    const html = await fetchRenderedHtml(WINDRAWWIN_URL, { waitFor: ".wttr" });
    const $ = cheerio.load(html);
    const out: ScrapedPrediction[] = [];

    $(".wttr").each((_, el) => {
      const row = $(el);
      const fixture = clean(row.find(".wtfixt").first().text()); // "Mexico v South Africa"
      const [homeTeam, awayTeam] = fixture.split(/\s+v\s+/i);
      if (!homeTeam || !awayTeam) return;

      const [predHome, predAway] = parseScore(clean(row.find(".wtsc").first().text()));
      if (predHome === null) return; // fila sin marcador → saltear

      out.push({ homeTeam, awayTeam, predHome, predAway });
    });

    return out;
  },
};

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}
