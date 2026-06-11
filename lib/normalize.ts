// ════════════════════════════════════════════════════════════════
//  Normalización de nombres de selecciones.
//  Cada fuente nombra distinto a los equipos. Para cruzar el mismo
//  partido entre Forebet, Vitibet, la API de resultados y nuestra DB
//  necesitamos un nombre CANÓNICO único por selección.
// ════════════════════════════════════════════════════════════════

// Alias conocidos → nombre canónico (en inglés, que es el común a las fuentes).
// Ampliá esta tabla cuando aparezca un nombre nuevo que no matchee.
const ALIASES: Record<string, string> = {
  "korea republic": "south korea",
  "korea dpr": "north korea",
  "usa": "united states",
  "us": "united states",
  "united states of america": "united states",
  "ivory coast": "cote d'ivoire",
  "côte d'ivoire": "cote d'ivoire",
  "czechia": "czech republic",
  "bosnia": "bosnia herzegovina",
  "uae": "united arab emirates",
  "drc": "dr congo",
  "congo dr": "dr congo",
  "cabo verde": "cape verde",
  "türkiye": "turkey",
  "turkiye": "turkey",
  "north macedonia": "macedonia",
  "republic of ireland": "ireland",
};

/**
 * Devuelve una clave canónica comparable para un nombre de equipo.
 * Pasa a minúsculas, saca acentos, colapsa espacios y aplica alias.
 */
export function canonicalTeam(raw: string): string {
  const cleaned = stripAccents(raw)
    .toLowerCase()
    .replace(/\bfc\b|\bnational team\b/g, "")
    .replace(/[^a-z'\s]/g, " ")
    .replace(/\b(and|islands?)\b/g, " ") // "Bosnia and Herzegovina", "Cape Verde Islands"
    .replace(/\s+/g, " ")
    .trim();
  return ALIASES[cleaned] ?? cleaned;
}

/** Clave única de un partido, independiente de la fuente. */
export function matchKey(home: string, away: string): string {
  return `${canonicalTeam(home)}__vs__${canonicalTeam(away)}`;
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}
