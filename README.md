# ⚽ Prode Mundial 2026

Scrapea pronósticos de varias páginas (Forebet, Vitibet, …), calcula el
**consenso** entre todas, y los muestra por **grupo** junto al **resultado
real** —que se actualiza solo— con un indicador de quién le pegó.

## Cómo funciona (la idea en 30 segundos)

```
  Forebet ───┐  (HTML)
  Vitibet ───┤  (HTML)
  PredictZ ──┤  (Playwright)
  WinDrawWin ┘  (Playwright) ─► scrapers ─► [ Supabase (Postgres) ] ◄─ resultados reales (football-data.org)
                                                   │
                                                   ▼
                                          Next.js (Vercel) ─► vos ves los 12 grupos
```

**4 fuentes de pronóstico**: Forebet y Vitibet sirven el marcador en HTML
estático (fetch simple). PredictZ y WinDrawWin bloquean a los bots (403), así
que esas dos se scrapean con un navegador headless (Playwright) — que solo
corre en el cron, nunca en la web.

- **No scrapeamos en vivo** desde la web (sería lento y frágil). Un **cron**
  (GitHub Actions) baja los datos cada tanto y los guarda en Supabase.
- La web solo **lee** de Supabase → rapidísima y siempre disponible.
- Como guardamos todo, tenés **historial**: pronóstico vs resultado real.

| Capa | Tecnología |
|------|-----------|
| Web + deploy | Next.js en Vercel |
| Base de datos | Supabase (Postgres) |
| Scraping + resultados | GitHub Actions (cron) |
| Resultados reales | API de [football-data.org](https://www.football-data.org) |

---

## Puesta en marcha

### 1. Dependencias

```bash
npm install
```

### 2. Cuentas y claves (las sacás vos, son gratis)

1. **Supabase** → creá un proyecto en <https://supabase.com>.
   En *Settings → API* copiás: `URL`, `anon key` y `service_role key`.
2. **football-data.org** → registrate gratis en
   <https://www.football-data.org/client/register> y copiá tu API key.

### 3. Variables de entorno

```bash
cp env.example .env.local
```

Completá `.env.local` con las claves del paso anterior.

> ⚠️ La `service_role key` es **secreta** y puede escribir en tu base.
> Nunca la pongas en código del frontend ni la commitees.

### 4. Crear las tablas

En Supabase: *SQL Editor → New query* → pegá el contenido de
[`supabase/schema.sql`](supabase/schema.sql) → **Run**.

### 5. Sembrar el fixture (grupos, equipos, partidos)

```bash
npm run seed
```

Esto baja la **verdad oficial** del Mundial desde football-data.org:
12 grupos, 48 selecciones y los 72 partidos de fase de grupos. No inventamos
nada a mano.

### 6. Bajar pronósticos y resultados

```bash
npm run scrape           # baja pronósticos de Forebet, Vitibet, …
npm run update-results   # baja los marcadores reales
```

### 7. Levantar la web

```bash
npm run dev
# http://localhost:3000
```

---

## Deploy en Vercel

1. Subí el repo a GitHub.
2. En <https://vercel.com> → *New Project* → importá el repo.
3. Cargá las **Environment Variables** (las mismas de `.env.local`).
4. Deploy. Listo, tenés tu link.

### Automatizar la actualización (GitHub Actions)

Los workflows en `.github/workflows/` están desactivados por ahora:

- `scrape.yml` → pronósticos.
- `results.yml` → resultados reales.

Para que funcionen, cargá los **Secrets** del repo
(*Settings → Secrets and variables → Actions*):

| Secret | Valor |
|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key |
| `FOOTBALL_DATA_API_KEY` | key de football-data.org |
| `FOOTBALL_DATA_COMPETITION` | `WC` |
| `FOREBET_URL` *(opcional)* | URL exacta del Mundial en Forebet |
| `VITIBET_URL` *(opcional)* | URL exacta del Mundial en Vitibet |

---

## Afinar los scrapers (importante)

El scraping depende del HTML de páginas que no controlamos. Los selectores en
`scrapers/forebet.ts` y `scrapers/vitibet.ts` son la mejor aproximación a su
estructura conocida, **pero hay que verificarlos contra la página real** —y más
con el Mundial recién arrancando.

Para probar sin escribir en la base:

```bash
npm run scrape -- --dry
```

Te imprime qué partidos encontró y cuáles cruzaron con la DB. Si una fuente
trae 0 resultados, abrí la página, mirá el HTML y ajustá los selectores
(están comentados con `⚠️ SELECTORES A VERIFICAR`). El resto del pipeline
—normalización de nombres, consenso, guardado— no se toca.

### Sumar una fuente nueva

1. Creá `scrapers/mi-fuente.ts` que exporte un `Scraper`:
   - HTML estático → usá `fetchHtml(url)` (como Forebet/Vitibet).
   - Con anti-bot (403) → usá `fetchRenderedHtml(url)` (como PredictZ/WinDrawWin).
2. Registralo en `scrapers/index.ts`.
3. `npm run seed` la agrega sola a la tabla `sources`.

> Si tu fuente usa Playwright, acordate que el navegador se instala con
> `npx playwright install chromium` (local) y ya está en el workflow del cron.

---

## Estructura

```
app/            # Next.js (UI de los grupos)
components/     # GroupCard, MatchRow
lib/            # supabase, consensus, normalize, queries, footballData, types
scrapers/       # base + forebet + vitibet + index (registro)
scripts/        # seed, scrape, update-results
supabase/       # schema.sql
.github/        # workflows del cron
```
