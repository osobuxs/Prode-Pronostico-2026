import { lookupVenue, type Venue } from "./venues";
import { canonicalTeam } from "./normalize";

// ════════════════════════════════════════════════════════════════
//  Fixture FIJO de la fase final del Mundial 2026 (oficial FIFA).
//  Sede y fecha de cada partido del cuadro (73-104) — NO cambian, aunque
//  los equipos sean TBD. Reutiliza las 16 sedes de lib/venues.ts.
//  Fuente: calendario oficial (Wikipedia).
// ════════════════════════════════════════════════════════════════

interface KnockoutInfo {
  venueKey: string; // clave de lib/venues.ts
  utc: string; // fecha/hora exacta en UTC (ISO)
}

const KNOCKOUT: Record<number, KnockoutInfo> = {
  // Dieciseisavos (73-88)
  73: { venueKey: "los angeles stadium", utc: "2026-06-28T19:00:00Z" },
  74: { venueKey: "boston stadium", utc: "2026-06-29T20:30:00Z" },
  75: { venueKey: "monterrey stadium", utc: "2026-06-29T19:00:00Z" },
  76: { venueKey: "houston stadium", utc: "2026-06-29T20:00:00Z" },
  77: { venueKey: "new york new jersey stadium", utc: "2026-06-30T21:00:00Z" },
  78: { venueKey: "dallas stadium", utc: "2026-06-30T17:00:00Z" },
  79: { venueKey: "mexico city stadium", utc: "2026-06-30T19:00:00Z" },
  80: { venueKey: "atlanta stadium", utc: "2026-07-01T16:00:00Z" },
  81: { venueKey: "san francisco bay area stadium", utc: "2026-07-01T19:00:00Z" },
  82: { venueKey: "seattle stadium", utc: "2026-07-01T20:00:00Z" },
  83: { venueKey: "toronto stadium", utc: "2026-07-02T17:00:00Z" },
  84: { venueKey: "los angeles stadium", utc: "2026-07-02T19:00:00Z" },
  85: { venueKey: "vancouver stadium", utc: "2026-07-02T19:00:00Z" },
  86: { venueKey: "miami stadium", utc: "2026-07-03T22:00:00Z" },
  87: { venueKey: "kansas city stadium", utc: "2026-07-04T01:30:00Z" },
  88: { venueKey: "dallas stadium", utc: "2026-07-03T18:00:00Z" },
  // Octavos (89-96)
  89: { venueKey: "philadelphia stadium", utc: "2026-07-04T20:00:00Z" },
  90: { venueKey: "houston stadium", utc: "2026-07-04T17:00:00Z" },
  91: { venueKey: "new york new jersey stadium", utc: "2026-07-05T20:00:00Z" },
  92: { venueKey: "mexico city stadium", utc: "2026-07-05T19:00:00Z" },
  93: { venueKey: "dallas stadium", utc: "2026-07-06T19:00:00Z" },
  94: { venueKey: "seattle stadium", utc: "2026-07-06T19:00:00Z" },
  95: { venueKey: "atlanta stadium", utc: "2026-07-07T16:00:00Z" },
  96: { venueKey: "vancouver stadium", utc: "2026-07-07T20:00:00Z" },
  // Cuartos (97-100)
  97: { venueKey: "boston stadium", utc: "2026-07-09T18:00:00Z" },
  98: { venueKey: "los angeles stadium", utc: "2026-07-10T19:00:00Z" },
  99: { venueKey: "miami stadium", utc: "2026-07-11T21:00:00Z" },
  100: { venueKey: "kansas city stadium", utc: "2026-07-12T00:00:00Z" },
  // Semis (101-102)
  101: { venueKey: "dallas stadium", utc: "2026-07-14T18:00:00Z" },
  102: { venueKey: "atlanta stadium", utc: "2026-07-15T19:00:00Z" },
  // Tercer puesto y Final
  103: { venueKey: "miami stadium", utc: "2026-07-18T21:00:00Z" },
  104: { venueKey: "new york new jersey stadium", utc: "2026-07-19T19:00:00Z" },
};

const TZ = "America/Argentina/Buenos_Aires";

function fmtDate(utc: string): string {
  return new Date(utc)
    .toLocaleDateString("es-AR", { day: "2-digit", month: "short", timeZone: TZ })
    .replace(/[.\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function fmtTime(utc: string): string {
  return new Date(utc).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  });
}

export interface MatchFixture {
  venue: Venue | null;
  date: string; // legible (hora de Argentina)
  time: string; // HH:MM (hora de Argentina)
}

/** Sede + fecha + hora fija de un partido del cuadro (73-104), en hora ARG. */
export function knockoutFixture(matchNum: number): MatchFixture | null {
  const info = KNOCKOUT[matchNum];
  if (!info) return null;
  return {
    venue: lookupVenue(info.venueKey),
    date: fmtDate(info.utc),
    time: fmtTime(info.utc),
  };
}

// ════════════════════════════════════════════════════════════════
//  Sedes FIJAS de la fase de grupos (72 partidos, oficial FIFA).
//  Fuente: Wikipedia (artículos por grupo). NO depende de scraping.
//  Las ciudades-metro (Zapopan→Guadalajara, Guadalupe→Monterrey,
//  Inglewood→Los Ángeles, etc.) se mapean a las 16 sedes de venues.ts.
// ════════════════════════════════════════════════════════════════
const CITY_TO_VENUE: Record<string, string> = {
  "mexico city": "mexico city stadium",
  zapopan: "guadalajara stadium",
  guadalajara: "guadalajara stadium",
  guadalupe: "monterrey stadium",
  monterrey: "monterrey stadium",
  atlanta: "atlanta stadium",
  toronto: "toronto stadium",
  "santa clara": "san francisco bay area stadium",
  "san francisco": "san francisco bay area stadium",
  inglewood: "los angeles stadium",
  "los angeles": "los angeles stadium",
  vancouver: "vancouver stadium",
  seattle: "seattle stadium",
  "east rutherford": "new york new jersey stadium",
  "new york": "new york new jersey stadium",
  foxborough: "boston stadium",
  boston: "boston stadium",
  philadelphia: "philadelphia stadium",
  "miami gardens": "miami stadium",
  miami: "miami stadium",
  houston: "houston stadium",
  arlington: "dallas stadium",
  dallas: "dallas stadium",
  "kansas city": "kansas city stadium",
};

// [local, visitante, ciudad] — los 72 partidos de fase de grupos.
const GROUP_MATCHES: [string, string, string][] = [
  // A
  ["Mexico", "South Africa", "Mexico City"],
  ["South Korea", "Czech Republic", "Zapopan"],
  ["Czech Republic", "South Africa", "Atlanta"],
  ["Mexico", "South Korea", "Zapopan"],
  ["Czech Republic", "Mexico", "Mexico City"],
  ["South Africa", "South Korea", "Guadalupe"],
  // B
  ["Canada", "Bosnia and Herzegovina", "Toronto"],
  ["Qatar", "Switzerland", "Santa Clara"],
  ["Switzerland", "Bosnia and Herzegovina", "Inglewood"],
  ["Canada", "Qatar", "Vancouver"],
  ["Switzerland", "Canada", "Vancouver"],
  ["Bosnia and Herzegovina", "Qatar", "Seattle"],
  // C
  ["Brazil", "Morocco", "East Rutherford"],
  ["Haiti", "Scotland", "Foxborough"],
  ["Scotland", "Morocco", "Foxborough"],
  ["Brazil", "Haiti", "Philadelphia"],
  ["Scotland", "Brazil", "Miami Gardens"],
  ["Morocco", "Haiti", "Atlanta"],
  // D
  ["United States", "Paraguay", "Inglewood"],
  ["Australia", "Turkey", "Vancouver"],
  ["United States", "Australia", "Seattle"],
  ["Turkey", "Paraguay", "Santa Clara"],
  ["Turkey", "United States", "Inglewood"],
  ["Paraguay", "Australia", "Santa Clara"],
  // E
  ["Germany", "Curacao", "Houston"],
  ["Ivory Coast", "Ecuador", "Philadelphia"],
  ["Germany", "Ivory Coast", "Toronto"],
  ["Ecuador", "Curacao", "Kansas City"],
  ["Curacao", "Ivory Coast", "Philadelphia"],
  ["Ecuador", "Germany", "East Rutherford"],
  // F
  ["Netherlands", "Japan", "Arlington"],
  ["Sweden", "Tunisia", "Guadalupe"],
  ["Netherlands", "Sweden", "Houston"],
  ["Tunisia", "Japan", "Guadalupe"],
  ["Japan", "Sweden", "Arlington"],
  ["Tunisia", "Netherlands", "Kansas City"],
  // G
  ["Belgium", "Egypt", "Seattle"],
  ["Iran", "New Zealand", "Inglewood"],
  ["Belgium", "Iran", "Inglewood"],
  ["New Zealand", "Egypt", "Vancouver"],
  ["Egypt", "Iran", "Seattle"],
  ["New Zealand", "Belgium", "Vancouver"],
  // H
  ["Spain", "Cape Verde", "Atlanta"],
  ["Saudi Arabia", "Uruguay", "Miami Gardens"],
  ["Spain", "Saudi Arabia", "Atlanta"],
  ["Uruguay", "Cape Verde", "Miami Gardens"],
  ["Cape Verde", "Saudi Arabia", "Houston"],
  ["Uruguay", "Spain", "Zapopan"],
  // I
  ["France", "Senegal", "East Rutherford"],
  ["Iraq", "Norway", "Foxborough"],
  ["France", "Iraq", "Philadelphia"],
  ["Norway", "Senegal", "East Rutherford"],
  ["Norway", "France", "Foxborough"],
  ["Senegal", "Iraq", "Toronto"],
  // J
  ["Argentina", "Algeria", "Kansas City"],
  ["Austria", "Jordan", "Santa Clara"],
  ["Argentina", "Austria", "Arlington"],
  ["Jordan", "Algeria", "Santa Clara"],
  ["Algeria", "Austria", "Kansas City"],
  ["Jordan", "Argentina", "Arlington"],
  // K
  ["Portugal", "DR Congo", "Houston"],
  ["Uzbekistan", "Colombia", "Mexico City"],
  ["Portugal", "Uzbekistan", "Houston"],
  ["Colombia", "DR Congo", "Zapopan"],
  ["Colombia", "Portugal", "Miami Gardens"],
  ["DR Congo", "Uzbekistan", "Atlanta"],
  // L
  ["England", "Croatia", "Arlington"],
  ["Ghana", "Panama", "Toronto"],
  ["England", "Ghana", "Foxborough"],
  ["Panama", "Croatia", "Toronto"],
  ["Panama", "England", "East Rutherford"],
  ["Croatia", "Ghana", "Philadelphia"],
];

// matchKey canónico (orden-independiente) → venueKey
const groupVenueMap = new Map<string, string>();
for (const [h, a, city] of GROUP_MATCHES) {
  const vk = CITY_TO_VENUE[city.toLowerCase().split(",")[0].trim()];
  if (!vk) continue;
  const key = [canonicalTeam(h), canonicalTeam(a)].sort().join("__");
  groupVenueMap.set(key, vk);
}

/** Sede fija de un partido de grupo, cruzando por los equipos. */
export function groupVenue(home: string, away: string): Venue | null {
  const key = [canonicalTeam(home), canonicalTeam(away)].sort().join("__");
  const vk = groupVenueMap.get(key);
  return vk ? lookupVenue(vk) : null;
}
