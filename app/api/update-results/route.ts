import { runUpdateResults } from "../../../lib/updateResults";
import { isIngestionDisabled } from "../../../lib/ingestionGate";

// Corre en Node (usa supabase-js), nunca cacheado.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dispara la actualización de resultados desde TheSportsDB.
 * Pensado para un cron externo (cron-job.org, UptimeRobot, etc.) que
 * pegue cada 1-2 min — más confiable que el cron de GitHub Actions para
 * los partidos en vivo.
 *
 * Protegido con ?key=CRON_SECRET para que no lo dispare cualquiera.
 *   GET /api/update-results?key=TU_SECRETO
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
    const { updated, live } = await runUpdateResults();
    return Response.json({ ok: true, updated, live, at: new Date().toISOString() });
  } catch (e: any) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
