// ════════════════════════════════════════════════════════════════
//  Las 16 sedes del Mundial 2026 (USA · México · Canadá).
//  Forebet nombra los estadios de forma genérica ("[Ciudad] Stadium").
//  Mapeamos ese nombre al estadio real + ciudad + país.
// ════════════════════════════════════════════════════════════════

export interface Venue {
  stadium: string; // nombre real
  city: string;
  country: string; // nombre
  countryCode: string; // código FIFA (para la bandera, reusa lib/flags)
}

// clave = nombre que da Forebet, normalizado (minúsculas)
const VENUES: Record<string, Venue> = {
  // ── México ──
  "mexico city stadium": { stadium: "Estadio Azteca", city: "Ciudad de México", country: "México", countryCode: "MEX" },
  "guadalajara stadium": { stadium: "Estadio Akron", city: "Guadalajara", country: "México", countryCode: "MEX" },
  "monterrey stadium": { stadium: "Estadio BBVA", city: "Monterrey", country: "México", countryCode: "MEX" },
  // ── Canadá ──
  "toronto stadium": { stadium: "BMO Field", city: "Toronto", country: "Canadá", countryCode: "CAN" },
  "vancouver stadium": { stadium: "BC Place", city: "Vancouver", country: "Canadá", countryCode: "CAN" },
  // ── Estados Unidos ──
  "atlanta stadium": { stadium: "Mercedes-Benz Stadium", city: "Atlanta", country: "Estados Unidos", countryCode: "USA" },
  "boston stadium": { stadium: "Gillette Stadium", city: "Boston", country: "Estados Unidos", countryCode: "USA" },
  "dallas stadium": { stadium: "AT&T Stadium", city: "Dallas", country: "Estados Unidos", countryCode: "USA" },
  "houston stadium": { stadium: "NRG Stadium", city: "Houston", country: "Estados Unidos", countryCode: "USA" },
  "kansas city stadium": { stadium: "Arrowhead Stadium", city: "Kansas City", country: "Estados Unidos", countryCode: "USA" },
  "los angeles stadium": { stadium: "SoFi Stadium", city: "Los Ángeles", country: "Estados Unidos", countryCode: "USA" },
  "miami stadium": { stadium: "Hard Rock Stadium", city: "Miami", country: "Estados Unidos", countryCode: "USA" },
  "new york new jersey stadium": { stadium: "MetLife Stadium", city: "Nueva York / Nueva Jersey", country: "Estados Unidos", countryCode: "USA" },
  "philadelphia stadium": { stadium: "Lincoln Financial Field", city: "Filadelfia", country: "Estados Unidos", countryCode: "USA" },
  "san francisco bay area stadium": { stadium: "Levi's Stadium", city: "San Francisco Bay Area", country: "Estados Unidos", countryCode: "USA" },
  "seattle stadium": { stadium: "Lumen Field", city: "Seattle", country: "Estados Unidos", countryCode: "USA" },
};

/** Busca la sede por el nombre crudo que vino del scraper (ej. Forebet). */
export function lookupVenue(raw: string | null): Venue | null {
  if (!raw) return null;
  const key = raw.toLowerCase().replace(/\s+/g, " ").trim();
  return VENUES[key] ?? null;
}
