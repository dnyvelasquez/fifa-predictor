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
- **Ingresar Juego** (admin): programa partidos (con posición de bracket, tarjetas y penales para fases eliminatorias) y registra sus marcadores. Al guardar, se recalculan automáticamente: los puntajes de los equipos (PG/PE/PP en fase de grupos, P32/PO/PC/PS/PF en fases eliminatorias), la clasificación de grupos (1°, 2° y los 8 mejores terceros, con desempates por diferencia de goles, goles a favor, partidos ganados y tarjetas) y el avance de cada cruce eliminatorio según quién ganó el partido.
- **Asignar Terceros** (admin): único paso manual — define con cuál de los 8 cruces de Eliminatoria 32 se enfrenta cada uno de los mejores terceros clasificados, ya que ese emparejamiento depende del Anexo C de FIFA y no se puede calcular automáticamente.
- **Puntajes** (admin): vista informativa de los puntajes por equipo, con acciones para acumular puntajes a los participantes o reiniciar puntajes/acumulados.
- **Tabla de puntajes / Fixture**: vistas públicas de resultados y posiciones (en Fixture, los equipos de cada grupo se ordenan y resaltan según su clasificación: azul el 1°, rojo el 2°, amarillo los mejores terceros).

Para más detalle de la arquitectura interna, ver [CLAUDE.md](CLAUDE.md).
