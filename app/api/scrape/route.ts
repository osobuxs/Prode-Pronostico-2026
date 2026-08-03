import { runScrape } from "../../../lib/runScrape";
import { isIngestionDisabled } from "../../../lib/ingestionGate";
import { BROWSERLESS_SCRAPERS } from "../../../scrapers/browserless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Scrapea los pronósticos de las fuentes SIN navegador (Forebet, Vitibet)
 * y los guarda. Pensado para un cron externo (cron-job.org) cada 1-2 horas,
 * más confiable que el cron de GitHub Actions.
 *
 * Las fuentes con Playwright (PredictZ, WinDrawWin) NO corren acá — esas
 * siguen en GitHub Actions (Vercel no soporta navegador).
 *
 *   GET /api/scrape?key=CRON_SECRET
 */
export async function GET(req: Request) {
  if (isIngestionDisabled()) {
    return new Response("Ingestion disabled", { status: 410 });
  }
  const key = new URL(req.url).searchParams.get("key");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const results = await runScrape(BROWSERLESS_SCRAPERS);
    return Response.json({ ok: true, results, at: new Date().toISOString() });
  } catch (e: any) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
