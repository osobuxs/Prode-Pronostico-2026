import "./_env";
import { SCRAPERS } from "../scrapers";
import { runScrape } from "../lib/runScrape";

/**
 * Corre TODOS los scrapers (incluidos los de Playwright) y guarda los
 * pronósticos. Para GitHub Actions.
 *
 * Modo prueba (no escribe, solo informa lo que cruzaría):
 *   npm run scrape -- --dry
 */
const dry = process.argv.includes("--dry");

runScrape(SCRAPERS, { dry })
  .then((results) => {
    for (const r of results) {
      if (r.error) console.log(`→ ${r.source}: ✗ ${r.error}`);
      else
        console.log(
          `→ ${r.source}: ${r.parsed} parseados, ${r.matched} cruzados` +
            (dry ? " (dry)" : `, ${r.saved} guardados`)
        );
    }
    console.log(dry ? "\n(dry-run: no se escribió nada)" : "\n✓ Scrape completo.");
  })
  .catch((e) => {
    console.error("✗ scrape falló:", e.message);
    process.exit(1);
  });
