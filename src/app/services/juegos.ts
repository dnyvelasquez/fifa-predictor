import { Injectable } from '@angular/core';
import { Observable, from, map, forkJoin, of, switchMap, combineLatest } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { SupabaseClientService } from './core/supabase-client';

export interface Juego {
  id: string;
  fase: string;
  semana: number;
  visitante: string;
  local: string;
  fecha: string;
  hora: string;
  actual: boolean;
  lscore: number | null;
  vscore: number | null;
  posicion: number | null;
  lroja: number;
  lamarilla: number;
  vroja: number;
  vamarilla: number;
  lpenales: number | null;
  vpenales: number | null;
  acumulado: boolean;
  logoVisitante?: string;
  logoLocal?: string;
  participanteVisitante?: string;
  participanteLocal?: string;
}

/** Fases eliminatorias y la cantidad de posiciones de bracket que tiene cada una. */
export const FASES_ELIMINATORIAS: Record<string, number> = {
  'Eliminatoria 32': 16,
  'Octavos de Final': 8,
  'Cuartos de Final': 4,
  'Semifinal': 2,
  'Final': 1,
};

export interface GrupoJuegos {
  fecha: string;
  fases: string[];
  juegos: Juego[];
}

@Injectable({
  providedIn: 'root',
})
export class JuegosService {
  private equiposCache$: Observable<any[]> | null = null;
  private asignacionesCache$: Observable<any[]> | null = null;
  private extremosSemanasCache$: Observable<{min: number | null, max: number | null}> | null = null;
  private juegosPorSemanaCache: Map<number, Observable<Juego[]>> = new Map();

  constructor(private supabaseClient: SupabaseClientService) {}

  private getEquipos(): Observable<any[]> {
    if (!this.equiposCache$) {
      this.equiposCache$ = from(
        this.supabaseClient.from('equipos').select('*')
      ).pipe(
        map((res: any) => res.data || []),
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.equiposCache$;
  }

  private getAsignaciones(): Observable<any[]> {
    if (!this.asignacionesCache$) {
      this.asignacionesCache$ = from(
        this.supabaseClient.from('asignacion').select('equipo_id,participante')
      ).pipe(
        map((res: any) => res.data || []),
        shareReplay({ bufferSize: 1, refCount: true })
      );
    }
    return this.asignacionesCache$;
  }

  private enriquecerJuegos(juegos: any[]): Observable<Juego[]> {
    return combineLatest({
      equipos: this.getEquipos(),
      asignaciones: this.getAsignaciones()
    }).pipe(
      map(({ equipos, asignaciones }) => {
        // Mapas de equipos por nombre e ID
        const byNombre: Record<string, any> = {};
        const byId: Record<string, any> = {};
        for (const e of equipos) {
          byNombre[e.nombre] = e;
          byId[e.id] = e;
        }

        const participantesPorEquipoId: Record<string, Set<string>> = {};
        for (const a of asignaciones as Array<{equipo_id: string; participante: string}>) {
          if (!a?.equipo_id) continue;
          const p = (a.participante || '').trim();
          if (!p) continue;

          if (!participantesPorEquipoId[a.equipo_id]) {
            participantesPorEquipoId[a.equipo_id] = new Set();
          }
          participantesPorEquipoId[a.equipo_id].add(p);
        }

        const formatearParticipantes = (equipo: any): string => {
          if (!equipo) return 'No asignado';
          const participantes = participantesPorEquipoId[equipo.id];
          if (!participantes || participantes.size === 0) return 'No asignado';

          const lista = Array.from(participantes);
          if (lista.length > 2) {
            return `${lista.slice(0, 2).join(', ')} +${lista.length - 2}`;
          }
          return lista.join(', ');
        };

        return juegos.map((j: any): Juego => {
          const v = byNombre[j.visitante];
          const l = byNombre[j.local];

          return {
            ...j,
            logoVisitante: v?.logo || '',
            logoLocal: l?.logo || '',
            participanteVisitante: formatearParticipantes(v),
            participanteLocal: formatearParticipantes(l),
          } as Juego;
        });
      })
    );
  }

  getJuegosPorSemanaId(semId: number): Observable<Juego[]> {
    if (this.juegosPorSemanaCache.has(semId)) {
      return this.juegosPorSemanaCache.get(semId)!;
    }

    const juegos$ = from(
      this.supabaseClient
        .from('juegos')
        .select('*')
        .eq('semana', semId)
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true })
    ).pipe(
      map((res: any) => res.data || []),
      switchMap(juegos => this.enriquecerJuegos(juegos)),
      map(juegos => juegos.sort((a, b) => this.toTs(a.fecha, a.hora) - this.toTs(b.fecha, b.hora))),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.juegosPorSemanaCache.set(semId, juegos$);
    return juegos$;
  }

  getSemanaIdPorFecha(fecha: string): Observable<number | null> {
    return from(
      this.supabaseClient
        .from('semana')
        .select('id,inicio,fin')
        .lte('inicio', fecha)
        .gte('fin', fecha)
        .limit(1)
    ).pipe(
      map(({ data, error }: any) => {
        if (error) throw error;
        return data?.[0]?.id ?? null;
      })
    );
  }

  getSemanaActualId(): Observable<number | null> {
    const hoy = this.hoyYYYYMMDD();
    return this.getSemanaIdPorFecha(hoy).pipe(
      switchMap(id => {
        if (id !== null) return of(id);
        return from(
          this.supabaseClient.from('semana')
            .select('id,inicio')
            .lte('inicio', hoy)
            .order('inicio', { ascending: false })
            .limit(1)
        ).pipe(map((r: any) => r.data?.[0]?.id ?? null));
      })
    );
  }

  getExtremosSemanas(): Observable<{min: number | null, max: number | null}> {
    if (!this.extremosSemanasCache$) {
      this.extremosSemanasCache$ = forkJoin({
        min: from(this.supabaseClient.from('semana').select('id').order('id', { ascending: true }).limit(1))
              .pipe(map((r: any) => r.data?.[0]?.id ?? null)),
        max: from(this.supabaseClient.from('semana').select('id').order('id', { ascending: false }).limit(1))
              .pipe(map((r: any) => r.data?.[0]?.id ?? null)),
      }).pipe(shareReplay({ bufferSize: 1, refCount: true }));
    }
    return this.extremosSemanasCache$;
  }

  getSemanaAnteriorId(currentId: number): Observable<number | null> {
    return from(
      this.supabaseClient.from('semana')
        .select('id')
        .lt('id', currentId)
        .order('id', { ascending: false })
        .limit(1)
    ).pipe(map((r: any) => r.data?.[0]?.id ?? null));
  }

  getSemanaSiguienteId(currentId: number): Observable<number | null> {
    return from(
      this.supabaseClient.from('semana')
        .select('id')
        .gt('id', currentId)
        .order('id', { ascending: true })
        .limit(1)
    ).pipe(map((r: any) => r.data?.[0]?.id ?? null));
  }

  getJuegosSemanaActual(): Observable<Juego[]> {
    return this.getSemanaActualId().pipe(
      switchMap(semId => semId !== null ? this.getJuegosPorSemanaId(semId) : of([]))
    );
  }

  getAllJuegos(): Observable<Juego[]> {
    return from(
      this.supabaseClient
        .from('juegos')
        .select('*')
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })
    ).pipe(
      map((res: any) => res.data || []),
      switchMap(juegos => this.enriquecerJuegos(juegos)),
      map(juegos => juegos.sort((a, b) => this.toTs(a.fecha, a.hora) - this.toTs(b.fecha, b.hora)))
    );
  }

  getNextJuegoId(): Observable<number> {
    return from(
      this.supabaseClient
        .from('juegos')
        .select('id')
        .order('id', { ascending: false })
        .limit(1)
    ).pipe(
      map(({ data, error }: any) => {
        if (error) throw error;
        const last = data?.[0]?.id ?? 0;
        return (Number(last) || 0) + 1;
      })
    );
  }

  crearJuego(input: { visitante: string; local: string; fase: string; fecha: string; hora: string; posicion?: number | null }): Observable<any> {
    return forkJoin({
      nextId: this.getNextJuegoId(),
      semanaId: this.getSemanaIdPorFecha(input.fecha),
    }).pipe(
      switchMap(({ nextId, semanaId }) =>
        from(
          this.supabaseClient
            .from('juegos')
            .insert([{
              id: nextId,
              semana: semanaId,
              visitante: input.visitante,
              local: input.local,
              fase: input.fase,
              fecha: input.fecha,
              hora: input.hora,
              posicion: input.posicion ?? null,
            }])
            .select()
        )
      ),
      map(({ data, error }: any) => {
        if (error) throw error;
        if (data?.[0]?.semana) {
          this.juegosPorSemanaCache.delete(data[0].semana);
        }
        return data?.[0];
      })
    );
  }

  actualizarJuego(juego: Juego): Observable<Juego> {
    const { id, lscore, vscore, semana, ...resto } = juego;

    return from(
      this.supabaseClient
        .from('juegos')
        .update({ lscore: lscore ?? null, vscore: vscore ?? null })
        .eq('id', id)
        .select()
    ).pipe(
      map(({ data, error }: any) => {
        if (error) throw error;
        if (!data || data.length === 0) throw new Error('Juego no encontrado');
        // Limpiar caché de la semana afectada
        if (semana) {
          this.juegosPorSemanaCache.delete(semana);
        }
        return { ...data[0], ...resto } as Juego;
      })
    );
  }

  actualizarCampos(id: string, campos: Partial<Pick<Juego, 'local' | 'visitante' | 'fase' | 'fecha' | 'hora' | 'posicion'>>): Observable<Juego> {
    return from(
      this.supabaseClient
        .from('juegos')
        .update(campos)
        .eq('id', id)
        .select()
    ).pipe(
      map(({ data, error }: any) => {
        if (error) throw error;
        if (!data || data.length === 0) throw new Error('Juego no encontrado');
        if (data[0]?.semana) {
          this.juegosPorSemanaCache.delete(data[0].semana);
        }
        return data[0] as Juego;
      })
    );
  }

  actualizarResultado(id: string, resultado: {
    lscore: number | null;
    vscore: number | null;
    lroja?: number | null;
    lamarilla?: number | null;
    vroja?: number | null;
    vamarilla?: number | null;
    lpenales?: number | null;
    vpenales?: number | null;
  }): Observable<Juego> {
    return from(
      this.supabaseClient
        .from('juegos')
        .update({
          lscore: resultado.lscore ?? null,
          vscore: resultado.vscore ?? null,
          lroja: resultado.lroja ?? 0,
          lamarilla: resultado.lamarilla ?? 0,
          vroja: resultado.vroja ?? 0,
          vamarilla: resultado.vamarilla ?? 0,
          lpenales: resultado.lpenales ?? null,
          vpenales: resultado.vpenales ?? null,
        })
        .eq('id', id)
        .select()
    ).pipe(
      map(({ data, error }: any) => {
        if (error) throw error;
        if (!data || data.length === 0) throw new Error('Juego no encontrado');
        if (data[0]?.semana) {
          this.juegosPorSemanaCache.delete(data[0].semana);
        }
        return data[0] as Juego;
      })
    );
  }

  /**
   * Recalcula desde cero, a partir de todos los juegos con marcador registrado:
   * - pg/pe/pp/p32/po/pc/ps/pf (conteos de resultados por fase)
   * - e32 (clasificación de grupos: 1ros, 2dos y los 8 mejores terceros, con desempates)
   * - of/cf/sf/gf (avance de eliminatorias: el ganador de cada cruce toma la posición
   *   de bracket ya establecida para ese partido; el desempate en eliminatorias es por penales)
   */
  recalcularPuntajesEquipos(): Observable<{ ok: true }> {
    const fasePuntajeMap: Record<string, 'p32' | 'po' | 'pc' | 'ps' | 'pf'> = {
      'Eliminatoria 32': 'p32',
      'Octavos de Final': 'po',
      'Cuartos de Final': 'pc',
      'Semifinal': 'ps',
      'Final': 'pf',
    };

    const faseAvanceMap: Record<string, 'of' | 'cf' | 'sf' | 'gf'> = {
      'Eliminatoria 32': 'of',
      'Octavos de Final': 'cf',
      'Cuartos de Final': 'sf',
      'Semifinal': 'gf',
    };

    // Estadísticas "de clasificación": siempre se calculan con el historial COMPLETO
    // de partidos, sin importar si ya fueron acumulados. La clasificación deportiva
    // (posición de grupo, avance de ronda) no depende de cómo se reparten los puntos.
    type StatsClasificacion = { pg: number; pe: number; dg: number; gf: number; rojas: number; amarillas: number };
    const statsClasificacionVacias = (): StatsClasificacion => ({ pg: 0, pe: 0, dg: 0, gf: 0, rojas: 0, amarillas: 0 });

    // Estadísticas "de puntaje": las que se guardan en equipos y alimentan la fórmula
    // de puntos de cada participante. Solo cuentan partidos NO acumulados aún, para
    // que un "Acumular" + "Reset" no se deshaga la próxima vez que se recalcule.
    type StatsPuntaje = { pg: number; pe: number; pp: number; p32: number; po: number; pc: number; ps: number; pf: number };
    const statsPuntajeVacias = (): StatsPuntaje => ({ pg: 0, pe: 0, pp: 0, p32: 0, po: 0, pc: 0, ps: 0, pf: 0 });

    return forkJoin({
      juegos: from(this.supabaseClient.from('juegos').select('local,visitante,fase,lscore,vscore,posicion,lroja,lamarilla,vroja,vamarilla,lpenales,vpenales,acumulado')),
      equipos: from(this.supabaseClient.from('equipos').select('id,nombre,grupo')),
    }).pipe(
      switchMap(({ juegos, equipos }: any) => {
        if (juegos.error) throw juegos.error;
        if (equipos.error) throw equipos.error;

        const statsClasificacion: Record<string, StatsClasificacion> = {};
        const getStatsClasificacion = (nombre: string): StatsClasificacion => statsClasificacion[nombre] ??= statsClasificacionVacias();

        const statsPuntaje: Record<string, StatsPuntaje> = {};
        const getStatsPuntaje = (nombre: string): StatsPuntaje => statsPuntaje[nombre] ??= statsPuntajeVacias();

        const avance: Record<string, Partial<Record<'of' | 'cf' | 'sf' | 'gf', string>>> = {};
        const setAvance = (nombre: string, campo: 'of' | 'cf' | 'sf' | 'gf', valor: string) => {
          (avance[nombre] ??= {})[campo] = valor;
        };

        for (const j of (juegos.data ?? [])) {
          if (j.lscore === null || j.lscore === undefined || j.vscore === null || j.vscore === undefined) continue;

          const lscore = Number(j.lscore);
          const vscore = Number(j.vscore);
          const localClasif = getStatsClasificacion(j.local);
          const visitanteClasif = getStatsClasificacion(j.visitante);
          const localPuntaje = j.acumulado ? null : getStatsPuntaje(j.local);
          const visitantePuntaje = j.acumulado ? null : getStatsPuntaje(j.visitante);

          if (j.fase === 'Fase de Grupos') {
            localClasif.gf += lscore;
            visitanteClasif.gf += vscore;
            localClasif.dg += lscore - vscore;
            visitanteClasif.dg += vscore - lscore;
            localClasif.rojas += Number(j.lroja ?? 0);
            visitanteClasif.rojas += Number(j.vroja ?? 0);
            localClasif.amarillas += Number(j.lamarilla ?? 0);
            visitanteClasif.amarillas += Number(j.vamarilla ?? 0);

            if (lscore > vscore) { localClasif.pg++; }
            else if (lscore < vscore) { visitanteClasif.pg++; }
            else { localClasif.pe++; visitanteClasif.pe++; }

            if (localPuntaje && visitantePuntaje) {
              if (lscore > vscore) { localPuntaje.pg++; visitantePuntaje.pp++; }
              else if (lscore < vscore) { visitantePuntaje.pg++; localPuntaje.pp++; }
              else { localPuntaje.pe++; visitantePuntaje.pe++; }
            }
            continue;
          }

          const campoPuntaje = fasePuntajeMap[j.fase];
          if (campoPuntaje && localPuntaje && visitantePuntaje) {
            if (lscore > vscore) localPuntaje[campoPuntaje]++;
            else if (lscore < vscore) visitantePuntaje[campoPuntaje]++;
          }

          const campoAvance = faseAvanceMap[j.fase];
          if (campoAvance && j.posicion) {
            let ganador: string | null = null;
            if (lscore > vscore) ganador = j.local;
            else if (lscore < vscore) ganador = j.visitante;
            else {
              const lp = j.lpenales, vp = j.vpenales;
              if (lp !== null && lp !== undefined && vp !== null && vp !== undefined && Number(lp) !== Number(vp)) {
                ganador = Number(lp) > Number(vp) ? j.local : j.visitante;
              }
            }
            if (ganador) setAvance(ganador, campoAvance, String(j.posicion));
          }
        }

        // Criterios de desempate de grupo: puntos, diferencia de goles, goles a favor,
        // partidos ganados, menos tarjetas rojas, menos tarjetas amarillas. Siempre con
        // el historial completo de partidos de grupo, sin importar si ya se acumularon.
        const compararEquipos = (nombreA: string, nombreB: string): number => {
          const a = statsClasificacion[nombreA] ?? statsClasificacionVacias();
          const b = statsClasificacion[nombreB] ?? statsClasificacionVacias();
          const ptsA = a.pg * 3 + a.pe;
          const ptsB = b.pg * 3 + b.pe;
          if (ptsB !== ptsA) return ptsB - ptsA;
          if (b.dg !== a.dg) return b.dg - a.dg;
          if (b.gf !== a.gf) return b.gf - a.gf;
          if (b.pg !== a.pg) return b.pg - a.pg;
          if (a.rojas !== b.rojas) return a.rojas - b.rojas;
          if (a.amarillas !== b.amarillas) return a.amarillas - b.amarillas;
          return 0;
        };

        const porGrupo: Record<string, string[]> = {};
        for (const e of (equipos.data ?? [])) {
          (porGrupo[e.grupo] ??= []).push(e.nombre);
        }

        const e32PorEquipo: Record<string, string> = {};
        const terceros: string[] = [];

        for (const nombresGrupo of Object.values(porGrupo)) {
          const ordenados = [...nombresGrupo].sort(compararEquipos);
          if (ordenados[0]) e32PorEquipo[ordenados[0]] = '1';
          if (ordenados[1]) e32PorEquipo[ordenados[1]] = '2';
          if (ordenados[2]) terceros.push(ordenados[2]);
        }

        terceros.sort(compararEquipos);
        terceros.slice(0, 8).forEach((nombre, i) => {
          e32PorEquipo[nombre] = `3-${i + 1}`;
        });

        const updates = (equipos.data ?? []).map((e: any) => {
          const s = statsPuntaje[e.nombre] ?? statsPuntajeVacias();
          const av = avance[e.nombre] ?? {};
          return from(
            this.supabaseClient
              .from('equipos')
              .update({
                pg: s.pg, pe: s.pe, pp: s.pp, p32: s.p32, po: s.po, pc: s.pc, ps: s.ps, pf: s.pf,
                e32: e32PorEquipo[e.nombre] ?? '',
                of: av.of ?? '',
                cf: av.cf ?? '',
                sf: av.sf ?? '',
                gf: av.gf ?? '',
              })
              .eq('id', e.id)
          );
        });

        if (!updates.length) return of({ ok: true as const });
        return forkJoin(updates).pipe(map(() => ({ ok: true as const })));
      })
    );
  }

  /**
   * Marca como acumulados todos los partidos con marcador que aún no lo estaban.
   * A partir de ahí, recalcularPuntajesEquipos() deja de contarlos para pg/pe/pp/p32/po/pc/ps/pf
   * (ya quedaron reflejados en el "acumulado" del participante), evitando que un partido
   * vuelva a sumar puntos tras un "Acumular" + "Reset puntajes".
   */
  marcarJuegosAcumulados(): Observable<{ ok: true }> {
    return from(
      this.supabaseClient
        .from('juegos')
        .update({ acumulado: true })
        .eq('acumulado', false)
        .not('lscore', 'is', null)
    ).pipe(
      map(({ error }: any) => {
        if (error) throw error;
        return { ok: true as const };
      })
    );
  }

  eliminarJuego(id: string): Observable<void> {
    return from(
      this.supabaseClient
        .from('juegos')
        .select('semana')
        .eq('id', id)
        .single()
    ).pipe(
      switchMap(({ data }: any) => {
        const semanaId = data?.semana;
        return from(
          this.supabaseClient
            .from('juegos')
            .delete()
            .eq('id', id)
        ).pipe(
          map(({ error }: any) => {
            if (error) throw error;
            if (semanaId) {
              this.juegosPorSemanaCache.delete(semanaId);
            }
            return;
          })
        );
      })
    );
  }

  private hoyYYYYMMDD(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}/${m}/${day}`;
  }

  private toTs(fecha?: string, hora?: string): number {
    if (!fecha) return Number.MAX_SAFE_INTEGER;
    const [Y, M, D] = fecha.replace(/-/g, '/').split('/').map(n => parseInt(n, 10));
    let h = 0, m = 0;
    if (hora) {
      const s = hora.trim().toUpperCase();
      const m1 = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
      if (m1) {
        h = parseInt(m1[1], 10);
        m = parseInt(m1[2], 10);
        const ap = m1[3];
        if (ap === 'PM' && h < 12) h += 12;
        if (ap === 'AM' && h === 12) h = 0;
      } else {
        const [hh, mm] = s.split(':');
        h = parseInt(hh || '0', 10);
        m = parseInt(mm || '0', 10);
      }
    }
    return new Date(Y, (M || 1) - 1, D || 1, h, m, 0, 0).getTime();
  }
}







// import { Injectable } from '@angular/core';
// import { Observable, from, map, forkJoin, of, switchMap } from 'rxjs';
// import { SupabaseClientService } from './core/supabase-client';

// export interface Juego {
//   id: string;
//   fase: string;
//   semana: number;
//   visitante: string;
//   local: string;
//   fecha: string;
//   hora: string;
//   actual: boolean;
//   lscore: number;
//   vscore: number;
//   logoVisitante?: string;
//   logoLocal?: string;
//   participanteVisitante? : string;
//   participanteLocal? : string;
// }

// export interface GrupoJuegos {
//   fecha: string;
//   fases: string[];
//   juegos: Juego[];
// }


// @Injectable({
//   providedIn: 'root',
// })
// export class JuegosService {

//   constructor(private supabaseClient: SupabaseClientService) {};

//   getJuegosSemanaActual(): Observable<Juego[]> {
//     const hoy = this.hoyYYYYMMDD();

//     const semanaId$ = from(
//       this.supabaseClient
//         .from('semana')
//         .select('id,inicio,fin')
//         .lte('inicio', hoy)
//         .gte('fin', hoy)
//         .limit(1)
//     ).pipe(
//       map(({ data, error }: any) => {
//         if (error) throw error;
//         return data?.[0]?.id ?? null;
//       }),
//       switchMap(id => {
//         if (id !== null) return of(id);
//         return from(
//           this.supabaseClient
//             .from('semana')
//             .select('id,inicio')
//             .lte('inicio', hoy)
//             .order('inicio', { ascending: false })
//             .limit(1)
//         ).pipe(map(({ data }: any) => data?.[0]?.id ?? null));
//       })
//     );

//     return semanaId$.pipe(
//       switchMap((semId) => {
//         if (semId === null) return of({ juegos: [], equipos: [], asign: [] });

//         return forkJoin({
//           juegos: from(
//             this.supabaseClient
//               .from('juegos')
//               .select('*')
//               .eq('semana', semId)
//               .order('fecha', { ascending: true })
//               .order('hora', { ascending: true })
//           ).pipe(map((res: any) => res.data || [])),
//           equipos: from(
//             this.supabaseClient.from('equipos').select('*')
//           ).pipe(map((res: any) => res.data || [])),
//           asign: from(
//             this.supabaseClient.from('asignacion').select('equipo_id,participante')
//           ).pipe(map((res: any) => res.data || []))
//         });
//       }),
//       map(({ juegos, equipos, asign }: any) => {
//         const byNombre: Record<string, any> = {};
//         const byId: Record<string, any> = {};
//         for (const e of equipos) { byNombre[e.nombre] = e; byId[e.id] = e; }

//         const participantesPorEquipoId: Record<string, string[]> = {};
//         for (const a of asign as Array<{equipo_id: string; participante: string}>) {
//           if (!a?.equipo_id) continue;
//           const p = (a.participante || '').trim();
//           if (!p) continue;
//           (participantesPorEquipoId[a.equipo_id] ??= []).push(p);
//         }

//         const enrich = (j: any): Juego => {
//           const v = byNombre[j.visitante];
//           const l = byNombre[j.local];

//           const listV = v ? (participantesPorEquipoId[v.id] ?? []) : [];
//           const listL = l ? (participantesPorEquipoId[l.id] ?? []) : [];

//           return {
//             ...j,
//             logoVisitante: v?.logo || '',
//             logoLocal:     l?.logo || '',
//             participanteVisitante: listV.join(' / '), 
//             participanteLocal:     listL.join(' / '),
//           } as Juego;
//         };

//         return (juegos as any[])
//           .map(enrich)
//           .sort((a: Juego, b: Juego) => this.toTs(a.fecha, a.hora) - this.toTs(b.fecha, b.hora));
//       })
//     );
//   }

//   getNextJuegoId() {
//     return from(
//       this.supabaseClient
//         .from('juegos')
//         .select('id')
//         .order('id', { ascending: false })
//         .limit(1)
//     ).pipe(
//       map(({ data, error }: any) => {
//         if (error) throw error;
//         const last = data?.[0]?.id ?? 0;
//         return (Number(last) || 0) + 1;
//       })
//     );
//   }

//   getSemanaIdPorFecha(fecha: string) {
//     return from(
//       this.supabaseClient
//         .from('semana')
//         .select('id,inicio,fin')
//         .lte('inicio', fecha)
//         .gte('fin', fecha)
//         .limit(1)
//     ).pipe(
//       map(({ data, error }: any) => {
//         if (error) throw error;
//         return data?.[0]?.id ?? null;
//       })
//     );
//   }

//   getSemanaActualId() {
//     const hoy = this.hoyYYYYMMDD();
//     return this.getSemanaIdPorFecha(hoy).pipe(
//       switchMap(id => {
//         if (id !== null) return of(id);
//         return from(
//           this.supabaseClient.from('semana')
//             .select('id,inicio')
//             .lte('inicio', hoy)
//             .order('inicio', { ascending: false })
//             .limit(1)
//         ).pipe(map((r: any) => r.data?.[0]?.id ?? null));
//       })
//     );
//   }

//   getExtremosSemanas() {
//     return forkJoin({
//       min: from(this.supabaseClient.from('semana').select('id').order('id', { ascending: true }).limit(1))
//             .pipe(map((r: any) => r.data?.[0]?.id ?? null)),
//       max: from(this.supabaseClient.from('semana').select('id').order('id', { ascending: false }).limit(1))
//             .pipe(map((r: any) => r.data?.[0]?.id ?? null)),
//     });
//   }

//   getSemanaAnteriorId(currentId: number) {
//     return from(
//       this.supabaseClient.from('semana')
//         .select('id')
//         .lt('id', currentId)
//         .order('id', { ascending: false })
//         .limit(1)
//     ).pipe(map((r: any) => r.data?.[0]?.id ?? null));
//   }

//   getSemanaSiguienteId(currentId: number) {
//     return from(
//       this.supabaseClient.from('semana')
//         .select('id')
//         .gt('id', currentId)
//         .order('id', { ascending: true })
//         .limit(1)
//     ).pipe(map((r: any) => r.data?.[0]?.id ?? null));
//   }

//   getJuegosPorSemanaId(semId: number): Observable<Juego[]> {
//     return forkJoin({
//       juegos: from(
//         this.supabaseClient
//           .from('juegos')
//           .select('*')
//           .eq('semana', semId)
//           .order('fecha', { ascending: true })
//           .order('hora', { ascending: true })
//       ).pipe(map((res: any) => res.data || [])),
//       equipos: from(this.supabaseClient.from('equipos').select('*'))
//                 .pipe(map((res: any) => res.data || [])),
//       asign: from(this.supabaseClient.from('asignacion').select('equipo_id,participante'))
//                 .pipe(map((res: any) => res.data || []))
//     }).pipe(
//       map(({ juegos, equipos, asign }: any) => {
//         const byNombre: Record<string, any> = {};
//         const byId: Record<string, any> = {};
//         for (const e of equipos) { 
//           byNombre[e.nombre] = e; 
//           byId[e.id] = e; 
//         }

//         const participantesPorEquipoId: Record<string, Set<string>> = {};
//         for (const a of asign as Array<{equipo_id: string; participante: string}>) {
//           if (!a?.equipo_id) continue;
//           const p = (a.participante || '').trim();
//           if (!p) continue;
          
//           if (!participantesPorEquipoId[a.equipo_id]) {
//             participantesPorEquipoId[a.equipo_id] = new Set();
//           }
//           participantesPorEquipoId[a.equipo_id].add(p);
//         }

//         const enrich = (j: any): Juego => {
//           const v = byNombre[j.visitante];
//           const l = byNombre[j.local];
          
//           let participantesV: string[] = [];
//           let participantesL: string[] = [];
          
//           if (v) {
//             participantesV = participantesPorEquipoId[v.id] 
//               ? Array.from(participantesPorEquipoId[v.id]) 
//               : [];
//           }
          
//           if (l) {
//             participantesL = participantesPorEquipoId[l.id] 
//               ? Array.from(participantesPorEquipoId[l.id]) 
//               : [];
//           }

//           const mostrarV = participantesV.length > 2 
//             ? `${participantesV.slice(0, 2).join(', ')} +${participantesV.length - 2}` 
//             : participantesV.join(', ');
            
//           const mostrarL = participantesL.length > 2 
//             ? `${participantesL.slice(0, 2).join(', ')} +${participantesL.length - 2}` 
//             : participantesL.join(', ');

//           return {
//             ...j,
//             logoVisitante: v?.logo || '',
//             logoLocal:     l?.logo || '',
//             participanteVisitante: mostrarV || 'No asignado',
//             participanteLocal:     mostrarL || 'No asignado',
//           } as Juego;
//         };

//         return (juegos as any[])
//           .map(enrich)
//           .sort((a: Juego, b: Juego) => this.toTs(a.fecha, a.hora) - this.toTs(b.fecha, b.hora));
//       })
//     );
//   }

//   private hoyYYYYMMDD(): string {
//     const d = new Date();
//     const y = d.getFullYear();
//     const m = String(d.getMonth() + 1).padStart(2, '0');
//     const day = String(d.getDate()).padStart(2, '0');
//     return `${y}/${m}/${day}`;
//   }

//   private toTs(fecha?: string, hora?: string): number {
//     if (!fecha) return Number.MAX_SAFE_INTEGER;
//     const [Y, M, D] = fecha.replace(/-/g, '/').split('/').map(n => parseInt(n, 10));
//     let h = 0, m = 0;
//     if (hora) {
//       const s = hora.trim().toUpperCase();
//       const m1 = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
//       if (m1) {
//         h = parseInt(m1[1], 10);
//         m = parseInt(m1[2], 10);
//         const ap = m1[3];
//         if (ap === 'PM' && h < 12) h += 12;
//         if (ap === 'AM' && h === 12) h = 0;
//       } else {
//         const [hh, mm] = s.split(':');
//         h = parseInt(hh || '0', 10);
//         m = parseInt(mm || '0', 10);
//       }
//     }
//     return new Date(Y, (M || 1) - 1, D || 1, h, m, 0, 0).getTime();
//   }

//   crearJuego(input: { visitante: string; local: string; fase: string; fecha: string; hora: string }) {
//     return forkJoin({
//       nextId: this.getNextJuegoId(),
//       semanaId: this.getSemanaIdPorFecha(input.fecha),
//     }).pipe(
//       switchMap(({ nextId, semanaId }) =>
//         from(
//           this.supabaseClient
//             .from('juegos')
//             .insert([
//               {
//                 id: nextId,
//                 semana: semanaId, 
//                 visitante: input.visitante,
//                 local: input.local,
//                 fase: input.fase,
//                 fecha: input.fecha,
//                 hora: input.hora,
//               },
//             ])
//             .select()
//         )
//       ),
//       map(({ data, error }: any) => {
//         if (error) throw error;
//         return data?.[0];
//       })
//     );
//   }

//   getAllJuegos(): Observable<Juego[]> {
//     return forkJoin({
//       juegos: from(
//         this.supabaseClient
//           .from('juegos')
//           .select('*')
//           .order('fecha', { ascending: false })
//           .order('hora', { ascending: false })
//       ).pipe(map((res: any) => res.data || [])),
//       equipos: from(
//         this.supabaseClient.from('equipos').select('*')
//       ).pipe(map((res: any) => res.data || [])),
//       asign: from(
//         this.supabaseClient.from('asignacion').select('equipo_id,participante')
//       ).pipe(map((res: any) => res.data || []))
//     }).pipe(
//       map(({ juegos, equipos, asign }: any) => {
//         const byNombre: Record<string, any> = {};
//         const byId: Record<string, any> = {};
//         for (const e of equipos) { 
//           byNombre[e.nombre] = e; 
//           byId[e.id] = e; 
//         }

//         const participantesPorEquipoId: Record<string, string[]> = {};
//         for (const a of asign as Array<{equipo_id: string; participante: string}>) {
//           if (!a?.equipo_id) continue;
//           const p = (a.participante || '').trim();
//           if (!p) continue;
//           (participantesPorEquipoId[a.equipo_id] ??= []).push(p);
//         }

//         const enrich = (j: any): Juego => {
//           const v = byNombre[j.visitante];
//           const l = byNombre[j.local];
//           const listV = v ? (participantesPorEquipoId[v.id] ?? []) : [];
//           const listL = l ? (participantesPorEquipoId[l.id] ?? []) : [];

//           return {
//             ...j,
//             logoVisitante: v?.logo || '',
//             logoLocal:     l?.logo || '',
//             participanteVisitante: listV.join(' / '),
//             participanteLocal:     listL.join(' / '),
//           } as Juego;
//         };

//         return (juegos as any[])
//           .map(enrich)
//           .sort((a: Juego, b: Juego) => this.toTs(a.fecha, a.hora) - this.toTs(b.fecha, b.hora));
//       })
//     );
//   }

//   actualizarJuego(juego: Juego): Observable<Juego> {
//     const { id, lscore, vscore, ...resto } = juego;
    
//     return from(
//       this.supabaseClient
//         .from('juegos')
//         .update({ 
//           lscore: lscore || 0,
//           vscore: vscore || 0
//         })
//         .eq('id', id)
//         .select()
//     ).pipe(
//       map(({ data, error }: any) => {
//         if (error) throw error;
//         if (!data || data.length === 0) throw new Error('Juego no encontrado');
//         return { ...data[0], ...resto } as Juego;
//       })
//     );
//   }

//   actualizarScores(id: string, lscore: number, vscore: number): Observable<Juego> {
//     return from(
//       this.supabaseClient
//         .from('juegos')
//         .update({ 
//           lscore: lscore || 0,
//           vscore: vscore || 0
//         })
//         .eq('id', id)
//         .select()
//     ).pipe(
//       map(({ data, error }: any) => {
//         if (error) throw error;
//         if (!data || data.length === 0) throw new Error('Juego no encontrado');
//         return data[0] as Juego;
//       })
//     );
//   }  

//   eliminarJuego(id: string): Observable<void> {
//     return from(
//       this.supabaseClient
//         .from('juegos')
//         .delete()
//         .eq('id', id)
//     ).pipe(
//       map(({ error }: any) => {
//         if (error) throw error;
//         return;
//       })
//     );
//   }
  
// }
