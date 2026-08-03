import "./_env";
import { runUpdateResults } from "../lib/updateResults";
import { isIngestionDisabled } from "../lib/ingestionGate";

if (isIngestionDisabled()) {
  console.log("✦ ingestion disabled; skipping update-results.");
  process.exit(0);
}

/** CLI: npm run update-results */
runUpdateResults()
  .then(({ updated, live }) =>
    console.log(`✓ ${updated} partidos actualizados (${live} en vivo) — football-data + TheSportsDB.`)
  )
  .catch((e) => {
    console.error("✗ update-results falló:", e.message);
    process.exit(1);
  });
