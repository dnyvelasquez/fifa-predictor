# FIFA Predictor 2026

Aplicación para gestionar una quiniela/pool de predicciones del Mundial de Fútbol 2026: asignación de equipos a participantes, registro de marcadores de partidos, cálculo automático de puntajes y tabla de posiciones.

Construida con Angular 20 (componentes standalone, zoneless, SSR) y [Supabase](https://supabase.com) (Postgres + Auth + Edge Functions).

## Requisitos

- Node.js y npm
- Una instancia de Supabase con las variables de entorno configuradas en `src/environments/environment.ts` (`supabaseUrl`, `supabaseAnonKey`)

## Desarrollo

```bash
npm install
npm start
```

Abre `http://localhost:4200`. La app recarga automáticamente al modificar el código fuente.

## Build

```bash
npm run build
```

Genera los artefactos en `dist/fifa-predictor`.

Para ejecutar el servidor SSR del build de producción:

```bash
npm run serve:ssr:fifa-predictor
```

## Tests

```bash
npm test
```

Ejecuta las pruebas unitarias con Karma/Jasmine.

## Funcionalidad principal

- **Equipos**: catálogo de selecciones agrupadas A–L, con su avance en cada fase eliminatoria (Eliminatoria 32, Octavos, Cuartos, Semifinal, Final).
- **Participantes**: personas inscritas en la quiniela.
- **Asignación**: relación entre equipos y participantes.
- **Ingresar Juego** (admin): programa partidos y registra sus marcadores. Al guardar un marcador, los puntajes de los equipos (PG/PE/PP en fase de grupos, P32/PO/PC/PS/PF en fases eliminatorias) se recalculan automáticamente.
- **Puntajes** (admin): vista informativa de los puntajes por equipo, con acciones para acumular puntajes a los participantes o reiniciar puntajes/acumulados.
- **Tabla de puntajes / Clasificación / Fixture**: vistas públicas de resultados y posiciones.

Para más detalle de la arquitectura interna, ver [CLAUDE.md](CLAUDE.md).
