import type { Scraper } from "./base";
import { forebetScraper } from "./forebet";
import { vitibetScraper } from "./vitibet";

// Fuentes que NO usan navegador (fetch + cheerio) → corren en Vercel.
// OJO: este archivo NO debe importar predictz/windrawwin (usan Playwright),
// así el bundle del endpoint /api/scrape no incluye Playwright.
export const BROWSERLESS_SCRAPERS: Scraper[] = [forebetScraper, vitibetScraper];
