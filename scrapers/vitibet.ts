import * as cheerio from "cheerio";
import type { Scraper } from "./base";
import { fetchHtml, parseScore } from "./base";
import type { ScrapedPrediction } from "../lib/types";

// Página de Vitibet con los tips del Mundial.
const VITIBET_URL =
  process.env.VITIBET_URL ?? "https://www.vitibet.com/football/tips/world-cup/world/1/";

/**
 * Scraper de Vitibet.
 *
 * Estructura verificada contra el HTML vivo (jun 2026):
 *  cada partido es una "card" `a.upcoming-match-wrapper`. Dentro:
 *   - `.mc-team span`            → nombres (2: local y visitante en orden)
 *   - `.mc-score`               → marcador pronosticado "2 : 1"
 *   - `.prob-item:not(.idx-item) .prob-val` → probabilidades 1 / X / 2 (%)
 *       (el primer .prob-item es el INDEX de Vitibet, se saltea)
 *  OJO: NO está en una <table> (esa es la tabla de posiciones, no los tips).
 */
export const vitibetScraper: Scraper = {
  slug: "vitibet",
  name: "Vitibet",
  url: VITIBET_URL,

  async scrape(): Promise<ScrapedPrediction[]> {
    const html = await fetchHtml(VITIBET_URL);
    const $ = cheerio.load(html);
    const out: ScrapedPrediction[] = [];

    $("a.upcoming-match-wrapper").each((_, el) => {
      const card = $(el);
      const teams = card
        .find(".mc-team span")
        .map((_, s) => clean($(s).text()))
        .get()
        .filter(Boolean);
      const [homeTeam, awayTeam] = teams;
      if (!homeTeam || !awayTeam) return;

      const [predHome, predAway] = parseScore(clean(card.find(".mc-score").text()));

      // probabilidades 1 / X / 2 (excluyendo el INDEX)
      const probs = card
        .find(".prob-item:not(.idx-item) .prob-val")
        .map((_, s) => Number(clean($(s).text()).replace("%", "")))
        .get();

      out.push({
        homeTeam,
        awayTeam,
        predHome,
        predAway,
        probHome: probs[0] ?? null,
        probDraw: probs[1] ?? null,
        probAway: probs[2] ?? null,
      });
    });

    return out;
  },
};

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}
