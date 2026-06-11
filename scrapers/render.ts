import { chromium } from "playwright";

/**
 * Descarga una página renderizándola con un navegador headless (Playwright).
 * Lo usamos para fuentes que bloquean el fetch simple con anti-bot (403),
 * como PredictZ y WinDrawWin.
 *
 * ⚠️ Esto NO corre en Vercel (serverless, sin navegador). Solo se ejecuta
 *    en el cron de GitHub Actions (que instala chromium). La web nunca
 *    importa este módulo.
 */
export async function fetchRenderedHtml(
  url: string,
  opts: { waitFor?: string; waitMs?: number } = {}
): Promise<string> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      locale: "en-US",
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    if (opts.waitFor) {
      // esperar a que aparezca el contenedor de partidos (o seguir si no aparece)
      await page.waitForSelector(opts.waitFor, { timeout: 15000 }).catch(() => {});
    } else {
      await page.waitForTimeout(opts.waitMs ?? 2000);
    }
    return await page.content();
  } finally {
    await browser.close();
  }
}
