# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` / `ng serve` — dev server at `http://localhost:4200`
- `npm run build` / `ng build` — production build to `dist/fifa-predictor`
- `npm run watch` — incremental dev build (no server)
- `npm test` / `ng test` — run Karma/Jasmine unit tests (all specs)
  - To run a single spec file, use Karma's `--include` or temporarily scope with `fdescribe`/`fit` in the spec — there is no built-in single-file CLI filter configured in this project
- `npm run serve:ssr:fifa-predictor` — run the built Express SSR server from `dist/fifa-predictor/server/server.mjs`
- `ng generate component components/<name>` — scaffold a new standalone component following existing conventions

## Architecture

This is an Angular 20 app (standalone components, zoneless change detection, SSR via `@angular/ssr` + Express) backed by Supabase (Postgres + Auth + Edge Functions).

### Supabase access layers

There are two Supabase-related wrappers — don't confuse them:

- `src/app/core/supabase.client.ts` — creates and exports the raw `supabase` client singleton (`createClient` with `environment.supabaseUrl`/`supabaseAnonKey`).
- `src/app/services/core/supabase-client.ts` — `SupabaseClientService`, an injectable thin wrapper around the raw client (`.from()`, `.auth()`, `.functions()`). All data services (`equipos.ts`, `juegos.ts`, `participantes.ts`, `asignacion.ts`) inject this service rather than importing `supabase` directly.
- `src/app/services/auth/auth.ts` (`AuthService`) and the guards (`auth-guard.ts`, `guest-guard.ts`) import the raw `supabase` client directly for session/auth calls.
- `supabase/functions/` contains Deno Edge Functions (`auth`, `create-user`, `delete-user`, `list-users`) used for admin user management that can't be done safely from the client (e.g. creating/deleting auth users).

Services are barrel-exported from `src/app/services/index.ts`.

### Domain model

The app runs a World Cup-style prediction pool with these core entities (Supabase tables):

- **equipos** (`EquiposService`, `Equipo` interface) — teams, grouped into groups A–L, with classification-stage fields (`e32`, `of`, `cf`, `sf`, `gf` representing Eliminatoria 32 → Octavos → Cuartos → Semifinal → Final) and score fields (`pg`, `pe`, `pp`, `p32`, `po`, `pc`, `ps`, `pf`). `EquiposService.cargarEquiposEspeciales()` builds lookup maps (e.g. `unoA`/`dosA` for group winners/runners-up, `o1..o16`, `c1..c8`, `s1..s4`, `f1..f2`) used to render the knockout bracket in `fixture`.
- **participantes** (`ParticipantesService`) — the people competing in the pool.
- **asignacion** (`AsignacionService`) — many-to-many assignment of teams to participants; a team's `participante` field on `Equipo` is derived by joining `equipos` with `asignacion`, not a column on `equipos` itself.
- **juegos** (`JuegosService`, `Juego` interface) — scheduled/played matches (local/visitante teams, fase, fecha, hora, scores, `posicion` (bracket slot for knockout fases), cards (`lroja`/`lamarilla`/`vroja`/`vamarilla`), and penalty-shootout scores (`lpenales`/`vpenales`) for knockout ties).

**Scores and classification are computed automatically, not entered by hand.** `JuegosService.recalcularPuntajesEquipos()` is called after every create/update/delete in `ingresar-juego` and recalculates, from scratch, all of: `pg`/`pe`/`pp`/`p32`/`po`/`pc`/`ps`/`pf` (per-fase win/draw/loss counts), `e32` (group classification: 1st/2nd per group plus the 8 best third-place teams, using tiebreakers in order: goal difference, goals for, wins, red cards, yellow cards), and `of`/`cf`/`sf`/`gf` (knockout advancement: the winner of each match — decided by score, or by penalties on a tie — inherits the bracket `posicion` that was assigned to that match when it was created).

One piece is intentionally *not* automatic: which of the 8 best third-place teams meets which of the 8 "vs. a third" slots in the Eliminatoria 32 preview shown on `fixture`. That pairing is governed by FIFA's Annex C (495 possible combinations depending on which 8 of the 12 groups supply a qualifying third) and can't be reliably computed here. `Equipo.tercero_pos` (manually set via the `asignar-terceros` admin page, `EquiposService.asignarTerceroPos()`) controls this instead — the automatic `e32` ranking (`3-1`..`3-8`) is unaffected.

### Routing & auth

Routes are defined in `src/app/app.routes.ts`. Admin/management routes (`admin`, `puntajes`, `usuarios`, `ingresar-juego`, `participantes`, `asignacion`, `asignar-terceros`) are protected by `authGuard`; `login` is protected by `guestGuard` (redirects away if already authenticated). Public routes (`tabla-puntajes`, `equipos`, `juegos`, `reglamento`, `fixture`) require no auth. `puntajes` is informational only (no inputs) — it shows computed scores plus buttons to accumulate scores into participants' `acumulado` or reset scores/accumulated totals.

### Component conventions

Components are standalone, import Angular Material modules directly per-component (no shared Material module), and commonly use `ChangeDetectionStrategy.OnPush` with manual `ChangeDetectorRef.detectChanges()` calls after async Supabase operations (since the app is zoneless). Most data-loading components combine multiple service calls and use RxJS (`takeUntil(this.destroy$)` with `ngOnDestroy`) for cleanup.
