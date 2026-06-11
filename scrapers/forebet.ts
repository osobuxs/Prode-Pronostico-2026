import * as cheerio from "cheerio";
import type { Scraper } from "./base";
import { fetchHtml, parseScore } from "./base";
import type { ScrapedPrediction } from "../lib/types";

// URL de la página de predicciones del Mundial en Forebet.
// Cuando Forebet publique el fixture del Mundial 2026, poné acá la URL exacta.
// Se puede sobreescribir por env var sin tocar código.
const FOREBET_URL =
  process.env.FOREBET_URL ??
  "https://www.forebet.com/en/predictions-world/world-cup";

/**
 * Scraper de Forebet.
 *
 * Estructura verificada contra el HTML vivo (jun 2026):
 *  cada partido es una fila `.rcnt`. Dentro:
 *   - `.homeTeam` / `.awayTeam`     → nombres (vía itemprop name)
 *   - `div.ex_sc.tabonly`           → marcador correcto pronosticado, LIMPIO "2 - 1"
 *       (¡ojo! `span.scrmobpred.ex_sc` trae "21" pegado para mobile — NO usar ese)
 *   - `.fprc > span` (3 primeros)   → probabilidades 1 / X / 2 (en %)
 *  Si Forebet cambia la maqueta, ajustá estos selectores. El resto del
 *  pipeline (normalización, consenso, guardado) NO cambia.
 */
export const forebetScraper: Scraper = {
  slug: "forebet",
  name: "Forebet",
  url: FOREBET_URL,

  async scrape(): Promise<ScrapedPrediction[]> {
    const html = await fetchHtml(FOREBET_URL);
    const $ = cheerio.load(html);
    const out: ScrapedPrediction[] = [];

    $(".rcnt").each((_, el) => {
      const row = $(el);
      const homeTeam = clean(row.find(".homeTeam").first().text());
      const awayTeam = clean(row.find(".awayTeam").first().text());
      if (!homeTeam || !awayTeam) return;

      // marcador correcto pronosticado: usar SOLO el div.ex_sc.tabonly ("2 - 1")
      const scoreText = clean(row.find("div.ex_sc.tabonly").first().text());
      const [predHome, predAway] = parseScore(scoreText);

      // probabilidades 1 / X / 2 (los 3 primeros spans de .fprc)
      const probs = row
        .find(".fprc span")
        .slice(0, 3)
        .map((_, s) => Number(clean($(s).text()).replace("%", "")))
        .get();

      // estadio (meta itemprop location → name address)
      const venue =
        row.find("[itemprop='location'] meta[itemprop='name address']").attr("content") ??
        row.find("meta[itemprop='name address']").attr("content") ??
        null;

      out.push({
        homeTeam,
        awayTeam,
        predHome,
        predAway,
        probHome: probs[0] ?? null,
        probDraw: probs[1] ?? null,
        probAway: probs[2] ?? null,
        venue: venue ? clean(venue) : null,
      });
    });

    return out;
  },
};

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}
