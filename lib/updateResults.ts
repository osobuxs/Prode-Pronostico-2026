import { createAdminClient } from "./supabase";
import { fetchAllRelevantEvents, mapSdbStatus, toScore } from "./sportsdb";
import { fetchMatches, mapStatus as mapFdStatus, resolveScore } from "./footballData";
import { canonicalTeam } from "./normalize";

type Status = "scheduled" | "live" | "finished";

/**
 * ¿El resultado define un ganador? En eliminatoria un empate sin penales
 * decisivos NO define nada (el feed a veces manda fullTime/penales empatados
 * durante unos segundos). Sirve para no pisar un resultado ya decidido.
 */
function decisive(
  hs: number | null,
  as: number | null,
  penH: number | null,
  penA: number | null
): boolean {
  if (hs == null || as == null) return false;
  if (hs !== as) return true;
  return penH != null && penA != null && penH !== penA;
}

/**
 * Actualiza ESTADO + MARCADOR de los partidos. Fuente híbrida:
 *
 *   1) football-data.org (PRIMARIA): da status (IN_PLAY/FINISHED) Y marcador
 *      en vivo, incluso en el free tier. Se cruza por `external_id` (el id de
 *      football-data que guardó el seed), que es exacto — no depende del nombre.
 *   2) TheSportsDB (FALLBACK): solo si football-data no tiene el partido o deja
 *      el marcador en null. Se cruza por nombre canónico de los equipos.
 *
 * Antes el "en vivo" salía solo de TheSportsDB, que en el free tier crea los
 * eventos con delay (un partido del Mundial podía estar IN_PLAY en football-data
 * y todavía no existir en TheSportsDB → nunca pasaba a "en vivo").
 *
 * Lo usan el script CLI (npm run update-results) y el endpoint
 * /api/update-results (cron externo).
 */
export async function runUpdateResults(): Promise<{ updated: number; live: number }> {
  const db = createAdminClient();

  const { data: teams } = await db.from("teams").select("id,name");
  const { data: matches } = await db
    .from("matches")
    .select("id,home_team_id,away_team_id,group_id,external_id,kickoff,home_score,away_score,pen_home,pen_away,status,stage");
  if (!teams || !matches) throw new Error("DB vacía. Corré `npm run seed` primero.");

  const canonById = new Map(teams.map((t) => [t.id, canonicalTeam(t.name)]));

  // ── Fuente primaria: football-data, indexada por id (== external_id) ──
  const fdById = new Map<string, Awaited<ReturnType<typeof fetchMatches>>[number]>();
  try {
    for (const m of await fetchMatches()) fdById.set(String(m.id), m);
  } catch {
    // Sin football-data seguimos con TheSportsDB como única fuente.
  }

  // ── Fallback: TheSportsDB, indexado por par de equipos canónicos ──
  const sdbByKey = new Map<string, { hs: number | null; as: number | null; status: Status }>();
  for (const ev of await fetchAllRelevantEvents()) {
    const home = canonicalTeam(ev.strHomeTeam);
    const away = canonicalTeam(ev.strAwayTeam);
    sdbByKey.set(`${home}__${away}`, {
      hs: toScore(ev.intHomeScore),
      as: toScore(ev.intAwayScore),
      status: mapSdbStatus(ev.strStatus),
    });
  }

  let updated = 0;
  let live = 0;

  for (const m of matches) {
    const isGroup = m.group_id != null;
    let status: Status | null = null;
    let hs: number | null = null;
    let as: number | null = null;
    let penH: number | null = null;
    let penA: number | null = null;
    let stage: string | null = null;

    // 1) football-data por external_id (exacto). `resolveScore` separa el
    //    marcador (reglamentario + alargue) de la tanda de penales.
    const fd = m.external_id ? fdById.get(m.external_id) : undefined;
    if (fd) {
      status = mapFdStatus(fd.status);
      const sc = resolveScore(fd.score);
      hs = sc.home;
      as = sc.away;
      penH = sc.penHome;
      penA = sc.penAway;
      stage = fd.stage && fd.stage !== "GROUP_STAGE" ? fd.stage : null;
    }

    // 2) TheSportsDB como fallback: si no hubo football-data, o si vino sin
    //    marcador (free tier puede demorarlo) y TheSportsDB ya lo tiene.
    const h = canonById.get(m.home_team_id!);
    const a = canonById.get(m.away_team_id!);
    if (h && a) {
      let sdb = sdbByKey.get(`${h}__${a}`);
      let swap = false;
      if (!sdb) {
        sdb = sdbByKey.get(`${a}__${h}`);
        swap = true;
      }
      if (sdb) {
        let shs = sdb.hs;
        let sas = sdb.as;
        if (swap) [shs, sas] = [sas, shs];
        if (status === null) {
          // football-data no tenía el partido: TheSportsDB manda
          status = sdb.status;
          hs = shs;
          as = sas;
        } else if (hs === null && as === null && shs !== null) {
          // football-data sin marcador todavía: lo completa TheSportsDB
          hs = shs;
          as = sas;
        }
      }
    }

    if (status === null) continue; // ninguna fuente conoce el partido

    // Red de seguridad: si algo quedó "live" mucho después del inicio (delay en
    // marcar FT), lo damos por terminado. Grupos 2.5h; eliminatorias 4h (alargue
    // + penales). Usa el kickoff guardado del fixture.
    if (status === "live" && m.kickoff) {
      const start = Date.parse(m.kickoff);
      const limitMin = isGroup ? 150 : 240;
      if (Number.isFinite(start) && Date.now() - start > limitMin * 60 * 1000) {
        status = "finished";
      }
    }

    if (status === "scheduled" && hs === null && as === null) continue;

    // Anti-flicker (eliminatoria): si el cruce YA estaba terminado y decidido en
    // la base, no lo pisamos con un snapshot empatado/indeciso del feed.
    if (
      !isGroup &&
      status === "finished" &&
      m.status === "finished" &&
      decisive(m.home_score, m.away_score, m.pen_home, m.pen_away) &&
      !decisive(hs, as, penH, penA)
    ) {
      continue;
    }

    if (status === "live") live++;

    const payload: Record<string, unknown> = { home_score: hs, away_score: as, status };
    // Solo pisamos penales/ronda cuando football-data los aportó (eliminatoria).
    if (fd) {
      payload.pen_home = penH;
      payload.pen_away = penA;
      payload.stage = stage;
    }
    const { error } = await db.from("matches").update(payload).eq("id", m.id);
    if (!error) updated++;
  }

  return { updated, live };
}
