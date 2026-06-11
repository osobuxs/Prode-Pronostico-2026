// ════════════════════════════════════════════════════════════════
//  Banderas y nombres lindos para las 48 selecciones.
//  Usamos imágenes de flagcdn.com (los emoji de bandera NO se ven en
//  Windows). El mapa va por código FIFA (teams.code), que es estable.
// ════════════════════════════════════════════════════════════════

// Código FIFA (3 letras) → código de bandera de flagcdn (ISO-2, salvo UK).
const FIFA_TO_FLAG: Record<string, string> = {
  ALG: "dz", ARG: "ar", AUS: "au", AUT: "at", BEL: "be", BIH: "ba",
  BRA: "br", CAN: "ca", CPV: "cv", COL: "co", COD: "cd", CRO: "hr",
  CUR: "cw", CZE: "cz", ECU: "ec", EGY: "eg", ENG: "gb-eng", FRA: "fr",
  GER: "de", GHA: "gh", HAI: "ht", IRN: "ir", IRQ: "iq", CIV: "ci",
  JPN: "jp", JOR: "jo", MEX: "mx", MAR: "ma", NED: "nl", NZL: "nz",
  NOR: "no", PAN: "pa", PAR: "py", POR: "pt", QAT: "qa", KSA: "sa",
  SCO: "gb-sct", SEN: "sn", RSA: "za", KOR: "kr", ESP: "es", SWE: "se",
  SUI: "ch", TUN: "tn", TUR: "tr", USA: "us", URY: "uy", UZB: "uz",
};

// Nombre en español de cada selección (por código FIFA). Solo visual:
// los datos internos siguen en inglés para no romper los cruces.
const SPANISH_NAME: Record<string, string> = {
  ALG: "Argelia",
  ARG: "Argentina",
  AUS: "Australia",
  AUT: "Austria",
  BEL: "Bélgica",
  BIH: "Bosnia",
  BRA: "Brasil",
  CAN: "Canadá",
  CPV: "Cabo Verde",
  COL: "Colombia",
  COD: "Congo RD",
  CRO: "Croacia",
  CUR: "Curazao",
  CZE: "Chequia",
  ECU: "Ecuador",
  EGY: "Egipto",
  ENG: "Inglaterra",
  FRA: "Francia",
  GER: "Alemania",
  GHA: "Ghana",
  HAI: "Haití",
  IRN: "Irán",
  IRQ: "Irak",
  CIV: "Costa de Marfil",
  JPN: "Japón",
  JOR: "Jordania",
  MEX: "México",
  MAR: "Marruecos",
  NED: "Países Bajos",
  NZL: "Nueva Zelanda",
  NOR: "Noruega",
  PAN: "Panamá",
  PAR: "Paraguay",
  POR: "Portugal",
  QAT: "Catar",
  KSA: "Arabia Saudita",
  SCO: "Escocia",
  SEN: "Senegal",
  RSA: "Sudáfrica",
  KOR: "Corea del Sur",
  ESP: "España",
  SWE: "Suecia",
  SUI: "Suiza",
  TUN: "Túnez",
  TUR: "Turquía",
  USA: "EE.UU.",
  URY: "Uruguay",
  UZB: "Uzbekistán",
};

/** URL de la bandera (PNG nítido) para un código FIFA. */
export function flagUrl(code: string | null): string | null {
  if (!code) return null;
  const iso = FIFA_TO_FLAG[code.toUpperCase()];
  return iso ? `https://flagcdn.com/h40/${iso}.png` : null;
}

/** Versión 2x para pantallas retina. */
export function flagUrl2x(code: string | null): string | null {
  if (!code) return null;
  const iso = FIFA_TO_FLAG[code.toUpperCase()];
  return iso ? `https://flagcdn.com/h80/${iso}.png` : null;
}

/** Nombre en español (cae al nombre original si no está mapeado). */
export function displayName(name: string, code: string | null): string {
  if (code && SPANISH_NAME[code.toUpperCase()]) return SPANISH_NAME[code.toUpperCase()];
  return name;
}
