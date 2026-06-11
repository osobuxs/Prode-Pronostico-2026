// Carga .env.local para los scripts que corren fuera de Next.js
// (seed, scrape, update-results, y el cron de GitHub Actions).
import { config } from "dotenv";
import { existsSync } from "node:fs";

// Prioridad: .env.local (dev) → .env (CI / Actions con secrets)
if (existsSync(".env.local")) {
  config({ path: ".env.local" });
} else {
  config();
}
