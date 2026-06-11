import type { Scraper } from "./base";
import { forebetScraper } from "./forebet";
import { vitibetScraper } from "./vitibet";
import { predictzScraper } from "./predictz";
import { windrawwinScraper } from "./windrawwin";

// ── Registro de fuentes ─────────────────────────────────────────
// Para sumar una página nueva de pronósticos:
//   1. creá scrapers/tu-fuente.ts que exporte un Scraper
//      (HTML simple → usá fetchHtml; con anti-bot → usá fetchRenderedHtml)
//   2. importalo y agregalo a esta lista
//   3. `npm run seed` agrega la fila en sources automáticamente
//
// Forebet / Vitibet  → fetch + cheerio (HTML estático)
// PredictZ / WinDrawWin → Playwright (bloquean el fetch simple con 403)
export const SCRAPERS: Scraper[] = [
  forebetScraper,
  vitibetScraper,
  predictzScraper,
  windrawwinScraper,
];
