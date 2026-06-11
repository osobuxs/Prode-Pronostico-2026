import type { ScrapedPrediction } from "../lib/types";

// Contrato que cumple TODO scraper de pronósticos.
// Agregar una fuente nueva = crear un archivo que exporte un Scraper
// y registrarlo en scrapers/index.ts. Nada más.
export interface Scraper {
  slug: string; // "forebet"  (debe matchear sources.slug en la DB)
  name: string; // "Forebet"
  url: string; // página de origen
  /**
   * Descarga y parsea la página, devolviendo un pronóstico por partido.
   * Debe ser tolerante: si un partido no se puede parsear, lo saltea
   * en vez de tirar todo abajo.
   */
  scrape(): Promise<ScrapedPrediction[]>;
}

// Helper compartido: descarga HTML con headers de navegador real.
// Muchas páginas devuelven 403 si no mandás un User-Agent creíble.
export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!res.ok) {
    throw new Error(`${url} respondió ${res.status} ${res.statusText}`);
  }
  return res.text();
}

// Parsea un marcador tipo "2-1", "2 : 1", "2:1" → [2, 1].
export function parseScore(text: string): [number | null, number | null] {
  const m = text.replace(/\s/g, "").match(/(\d+)[-:](\d+)/);
  if (!m) return [null, null];
  return [Number(m[1]), Number(m[2])];
}
