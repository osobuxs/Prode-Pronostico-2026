import "./_env";
import { runUpdateResults } from "../lib/updateResults";

/** CLI: npm run update-results */
runUpdateResults()
  .then(({ updated, live }) =>
    console.log(`✓ ${updated} partidos actualizados (${live} en vivo) — TheSportsDB.`)
  )
  .catch((e) => {
    console.error("✗ update-results falló:", e.message);
    process.exit(1);
  });
