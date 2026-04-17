import { Injectable } from '@angular/core';
import { Observable, from, map, of, switchMap, forkJoin } from 'rxjs';
import { SupabaseClient } from '@supabase/supabase-js';
import { HttpClient } from '@angular/common/http';
import { supabase } from '../core/supabase.client';

//Opt
import { SupabaseClientService } from './core/supabase-client';
//

export interface Participante {
  id: string;
  numero: number;
  nombre: string;
  acumulado: number;
  puntaje?: number;
  equipos?: Equipo[];
  max: boolean;
  second: boolean;
}

export interface Equipo {
  id: string;
  nombre: string;
  puntaje: number;
  pg: number;
  pe: number;
  pp: number;
  p32: number;
  po: number;
  pc: number;
  ps: number;
  pf: number;
  e32: string;
  grupo: string;
  of: string;
  cf: string;
  sf: string;
  gf: string;
  logo: string;
  participante?: string;
}

export interface Juego {
  id: string;
  fase: string;
  semana: number;
  visitante: string;
  local: string;
  fecha: string;
  hora: string;
  actual: boolean;
  lscore: number;
  vscore: number;
  logoVisitante?: string;
  logoLocal?: string;
  participanteVisitante? : string;
  participanteLocal? : string;
}

export interface Asignacion {
  id?: string;
  equipo_id: string;
  participante: string;
}

@Injectable({
  providedIn: 'root',
})
export class Service { 

  private supabase: SupabaseClient;
  
  constructor(
    private http: HttpClient,

    // opt
    private supabaseClient: SupabaseClientService,
    //

  ) {
    this.supabase = supabase;
  }
  
  getParticipantes(): Observable<Participante[]> {
    return from(
      this.supabaseClient
        .from('participantes')
        .select('*')
        .order('numero', { ascending: true })
        .order('nombre', { ascending: true })
    ).pipe(
      map((res:any) => {
        if (res.error) {
          return[];
        }
        return res.data as Participante[];
      })
    );
  }

  getParticipantesConPuntaje(): Observable<(Participante & {
  })[]> {
    return this.getParticipantes().pipe(
      switchMap(participantes =>
        forkJoin(
          participantes.map(p =>
            this.getEquiposDe(p.nombre).pipe(
              map(equipos => {
                const puntajeEquipos = equipos.reduce((acc, eq) => 
                  acc + (eq.pg ?? 0) * 10 + (eq.pe ?? 0) * 5 + (eq.p32 ?? 0) * 20 + 
                  (eq.po ?? 0) * 20 + (eq.pc ?? 0) * 30 + (eq.ps ?? 0) * 40 + (eq.pf ?? 0) * 50, 0);
                const acumulado = p.acumulado ?? 0;
                return { 
                  ...p, 
                  equipos, 
                  puntajeEquipos, 
                  puntaje: puntajeEquipos + acumulado 
                };
              })
            )
          )
        )
      ),
      map(list => {
        const participantesOrdenados = list.sort((a, b) => b.puntaje - a.puntaje);
        
        const puntajesUnicos = [...new Set(participantesOrdenados.map(p => p.puntaje))]
          .filter(p => p > 0)
          .sort((a, b) => b - a);
        
        const primerPuntaje = puntajesUnicos.length > 0 ? puntajesUnicos[0] : 0;
        
        const hayEmpatePrimerLugar = participantesOrdenados.filter(p => p.puntaje === primerPuntaje).length > 1;
        
        const segundoPuntaje = !hayEmpatePrimerLugar && puntajesUnicos.length > 1 ? puntajesUnicos[1] : 0;
        
        return participantesOrdenados.map(p => ({
          ...p,
          max: p.puntaje === primerPuntaje && p.puntaje > 0,
          second: !hayEmpatePrimerLugar && p.puntaje === segundoPuntaje && p.puntaje > 0
        }));
      })
    );
  }

  getEquipos(): Observable<Equipo[]> {
    return forkJoin({
      equiposRes: from(
        this.supabaseClient.from('equipos').select('*').order('id', { ascending: true })
      ),
      asignRes: from(
        this.supabaseClient.from('asignacion').select('equipo_id,participante')
      )
    }).pipe(
      map(({ equiposRes, asignRes }: any) => {
        if (equiposRes.error) throw equiposRes.error;
        if (asignRes.error)   throw asignRes.error;

        const participantesPorEquipo: Record<string, string[]> = {};
        for (const a of (asignRes.data ?? [])) {
          const id = a?.equipo_id;
          const p  = (a?.participante ?? '').trim();
          if (!id || !p) continue;
          (participantesPorEquipo[id] ??= []).push(p);
        }
        for (const id of Object.keys(participantesPorEquipo)) {
          const uniq = Array.from(new Set(participantesPorEquipo[id]));
          uniq.sort((a, b) => a.localeCompare(b));
          participantesPorEquipo[id] = uniq;
        }

        return (equiposRes.data ?? []).map((e: any) => ({
          id: e.id,
          nombre: e.nombre,
          puntaje: e.puntaje,
          grupo:e.grupo,
          logo: e.logo,
          pg: e.pg,
          pe: e.pe,
          pp: e.pp,
          p32: e.p32,
          po: e.po,
          pc: e.pc,
          ps: e.ps,
          pf: e.pf,
          e32: e.e32,
          of: e.of,
          cf: e.cf,
          sf: e.sf,
          gf: e.gf,
          participante: (participantesPorEquipo[e.id]?.join(' / ')) ?? ''
        })) as Equipo[];
      })
    );
  }

  getEquiposDe(nombre: string): Observable<Equipo[]> {
    return from(
      this.supabaseClient
        .from('asignacion')
        .select('equipo_id, participante, equipos!inner(id,nombre,pg,pe,pp,p32,po,pc,ps,pf,e32,grupo,of,cf,sf,gf,logo)')
        .eq('participante', nombre)
    ).pipe(
      map(({ data, error }: any) => {
        if (error) throw error;
        return (data ?? []).map((row: any) => ({
          id: row.equipos.id,
          nombre: row.equipos.nombre,
          grupo: row.equipos.grupo,
          logo: row.equipos.logo,
          pg: row.equipos.pg,
          pe: row.equipos.pe,
          pp: row.equipos.pp,
          p32: row.equipos.p32,
          po: row.equipos.po,
          pc: row.equipos.pc,
          ps: row.equipos.ps,
          pf: row.equipos.pf,
          e32: row.equipos.e32,
          of: row.equipos.of,
          cf: row.equipos.cf,
          sf: row.equipos.sf,
          gf: row.equipos.gf,
          participante: row.participante,
        })) as Equipo[];
      })
    );
  }

  getJuegosSemanaActual(): Observable<Juego[]> {
    const hoy = this.hoyYYYYMMDD();

    const semanaId$ = from(
      this.supabaseClient
        .from('semana')
        .select('id,inicio,fin')
        .lte('inicio', hoy)
        .gte('fin', hoy)
        .limit(1)
    ).pipe(
      map(({ data, error }: any) => {
        if (error) throw error;
        return data?.[0]?.id ?? null;
      }),
      switchMap(id => {
        if (id !== null) return of(id);
        return from(
          this.supabaseClient
            .from('semana')
            .select('id,inicio')
            .lte('inicio', hoy)
            .order('inicio', { ascending: false })
            .limit(1)
        ).pipe(map(({ data }: any) => data?.[0]?.id ?? null));
      })
    );

    return semanaId$.pipe(
      switchMap((semId) => {
        if (semId === null) return of({ juegos: [], equipos: [], asign: [] });

        return forkJoin({
          juegos: from(
            this.supabaseClient
              .from('juegos')
              .select('*')
              .eq('semana', semId)
              .order('fecha', { ascending: true })
              .order('hora', { ascending: true })
          ).pipe(map((res: any) => res.data || [])),
          equipos: from(
            this.supabaseClient.from('equipos').select('*')
          ).pipe(map((res: any) => res.data || [])),
          asign: from(
            this.supabaseClient.from('asignacion').select('equipo_id,participante')
          ).pipe(map((res: any) => res.data || []))
        });
      }),
      map(({ juegos, equipos, asign }: any) => {
        const byNombre: Record<string, any> = {};
        const byId: Record<string, any> = {};
        for (const e of equipos) { byNombre[e.nombre] = e; byId[e.id] = e; }

        const participantesPorEquipoId: Record<string, string[]> = {};
        for (const a of asign as Array<{equipo_id: string; participante: string}>) {
          if (!a?.equipo_id) continue;
          const p = (a.participante || '').trim();
          if (!p) continue;
          (participantesPorEquipoId[a.equipo_id] ??= []).push(p);
        }

        const enrich = (j: any): Juego => {
          const v = byNombre[j.visitante];
          const l = byNombre[j.local];

          const listV = v ? (participantesPorEquipoId[v.id] ?? []) : [];
          const listL = l ? (participantesPorEquipoId[l.id] ?? []) : [];

          return {
            ...j,
            logoVisitante: v?.logo || '',
            logoLocal:     l?.logo || '',
            participanteVisitante: listV.join(' / '), 
            participanteLocal:     listL.join(' / '),
          } as Juego;
        };

        return (juegos as any[])
          .map(enrich)
          .sort((a: Juego, b: Juego) => this.toTs(a.fecha, a.hora) - this.toTs(b.fecha, b.hora));
      })
    );
  }

  getNextJuegoId() {
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

  getSemanaIdPorFecha(fecha: string) {
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

  getSemanaActualId() {
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

  getExtremosSemanas() {
    return forkJoin({
      min: from(this.supabaseClient.from('semana').select('id').order('id', { ascending: true }).limit(1))
            .pipe(map((r: any) => r.data?.[0]?.id ?? null)),
      max: from(this.supabaseClient.from('semana').select('id').order('id', { ascending: false }).limit(1))
            .pipe(map((r: any) => r.data?.[0]?.id ?? null)),
    });
  }

  getSemanaAnteriorId(currentId: number) {
    return from(
      this.supabaseClient.from('semana')
        .select('id')
        .lt('id', currentId)
        .order('id', { ascending: false })
        .limit(1)
    ).pipe(map((r: any) => r.data?.[0]?.id ?? null));
  }

  getSemanaSiguienteId(currentId: number) {
    return from(
      this.supabaseClient.from('semana')
        .select('id')
        .gt('id', currentId)
        .order('id', { ascending: true })
        .limit(1)
    ).pipe(map((r: any) => r.data?.[0]?.id ?? null));
  }

  getJuegosPorSemanaId(semId: number): Observable<Juego[]> {
    return forkJoin({
      juegos: from(
        this.supabaseClient
          .from('juegos')
          .select('*')
          .eq('semana', semId)
          .order('fecha', { ascending: true })
          .order('hora', { ascending: true })
      ).pipe(map((res: any) => res.data || [])),
      equipos: from(this.supabaseClient.from('equipos').select('*'))
                .pipe(map((res: any) => res.data || [])),
      asign: from(this.supabaseClient.from('asignacion').select('equipo_id,participante'))
              .pipe(map((res: any) => res.data || []))
    }).pipe(
      map(({ juegos, equipos, asign }: any) => {
        const byNombre: Record<string, any> = {};
        const byId: Record<string, any> = {};
        for (const e of equipos) { byNombre[e.nombre] = e; byId[e.id] = e; }

        const participantesPorEquipoId: Record<string, string[]> = {};
        for (const a of asign as Array<{equipo_id: string; participante: string}>) {
          if (!a?.equipo_id) continue;
          const p = (a.participante || '').trim();
          if (!p) continue;
          (participantesPorEquipoId[a.equipo_id] ??= []).push(p);
        }

        const enrich = (j: any): Juego => {
          const v = byNombre[j.visitante];
          const l = byNombre[j.local];
          const listV = v ? (participantesPorEquipoId[v.id] ?? []) : [];
          const listL = l ? (participantesPorEquipoId[l.id] ?? []) : [];

          return {
            ...j,
            logoVisitante: v?.logo || '',
            logoLocal:     l?.logo || '',
            participanteVisitante: listV.join(' / '),
            participanteLocal:     listL.join(' / '),
          } as Juego;
        };

        return (juegos as any[])
          .map(enrich)
          .sort((a: Juego, b: Juego) => this.toTs(a.fecha, a.hora) - this.toTs(b.fecha, b.hora));
      })
    );
  }

  getAsignaciones() {
    return from(
      this.supabaseClient
        .from('asignacion')
        .select('id,equipo_id,participante')
        .order('equipo_id', { ascending: true })
    ).pipe(
      map(({ data, error }: any) => {
        if (error) throw error;
        return (data ?? []) as Asignacion[];
      })
    );
  }
 
  getAllJuegos(): Observable<Juego[]> {
    return forkJoin({
      juegos: from(
        this.supabaseClient
          .from('juegos')
          .select('*')
          .order('fecha', { ascending: false })
          .order('hora', { ascending: false })
      ).pipe(map((res: any) => res.data || [])),
      equipos: from(
        this.supabaseClient.from('equipos').select('*')
      ).pipe(map((res: any) => res.data || [])),
      asign: from(
        this.supabaseClient.from('asignacion').select('equipo_id,participante')
      ).pipe(map((res: any) => res.data || []))
    }).pipe(
      map(({ juegos, equipos, asign }: any) => {
        const byNombre: Record<string, any> = {};
        const byId: Record<string, any> = {};
        for (const e of equipos) { 
          byNombre[e.nombre] = e; 
          byId[e.id] = e; 
        }

        const participantesPorEquipoId: Record<string, string[]> = {};
        for (const a of asign as Array<{equipo_id: string; participante: string}>) {
          if (!a?.equipo_id) continue;
          const p = (a.participante || '').trim();
          if (!p) continue;
          (participantesPorEquipoId[a.equipo_id] ??= []).push(p);
        }

        const enrich = (j: any): Juego => {
          const v = byNombre[j.visitante];
          const l = byNombre[j.local];
          const listV = v ? (participantesPorEquipoId[v.id] ?? []) : [];
          const listL = l ? (participantesPorEquipoId[l.id] ?? []) : [];

          return {
            ...j,
            logoVisitante: v?.logo || '',
            logoLocal:     l?.logo || '',
            participanteVisitante: listV.join(' / '),
            participanteLocal:     listL.join(' / '),
          } as Juego;
        };

        return (juegos as any[])
          .map(enrich)
          .sort((a: Juego, b: Juego) => this.toTs(a.fecha, a.hora) - this.toTs(b.fecha, b.hora));
      })
    );
  }

  private getEquipoIdsPorDivision(grupo: string) {
    return from(
      this.supabaseClient.from('equipos').select('id').eq('grupo', grupo)
    ).pipe(
      map(({ data, error }: any) => {
        if (error) throw error;
        return (data ?? []).map((r: any) => r.id as string);
      })
    );
  }

  createParticipante(nombre: string, numero: number) {
    return from(
      this.supabaseClient
        .from('participantes')
        .insert([{ nombre, numero }])
        .select('id, nombre, numero')
        .single()
    ).pipe(
      map(({ data, error }: any) => {
        if (error) throw error;
        return data;
      })
    );
  }

  updateParticipante(id: string, patch: { nombre?: string; numero?: number }) {
    return from(
      this.supabaseClient
        .from('participantes')
        .update(patch)
        .eq('id', id)
        .select('id, nombre, numero')
        .single()
    ).pipe(
      map(({ data, error }: any) => {
        if (error) throw error;
        return data;
      })
    );
  }

  deleteParticipante(id: string) {
    return from(
      this.supabaseClient
        .from('participantes')
        .delete()
        .eq('id', id)
    ).pipe(
      map(({ error }: any) => {
        if (error) throw error;
        return { ok: true };
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

  crearJuego(input: { visitante: string; local: string; fase: string; fecha: string; hora: string }) {
    return forkJoin({
      nextId: this.getNextJuegoId(),
      semanaId: this.getSemanaIdPorFecha(input.fecha),
    }).pipe(
      switchMap(({ nextId, semanaId }) =>
        from(
          this.supabaseClient
            .from('juegos')
            .insert([
              {
                id: nextId,
                semana: semanaId, 
                visitante: input.visitante,
                local: input.local,
                fase: input.fase,
                fecha: input.fecha,
                hora: input.hora,
              },
            ])
            .select()
        )
      ),
      map(({ data, error }: any) => {
        if (error) throw error;
        return data?.[0];
      })
    );
  }

  assignEquipo(participanteNombre: string, grupo: string, equipoId: string | null) {
    return this.getEquipoIdsPorDivision(grupo).pipe(
      switchMap((idsMismaDivision) => {
        const delParticipante$ = idsMismaDivision.length
          ? from(
              this.supabaseClient
                .from('asignacion')
                .delete()
                .eq('participante', participanteNombre)
                .in('equipo_id', idsMismaDivision)
            )
          : of({});

        if (!equipoId) {
          return delParticipante$.pipe(
            map(({ error }: any) => {
              if (error) throw error;
              return { ok: true };
            })
          );
        }

        const insert$ = from(
          this.supabaseClient
            .from('asignacion')
            .insert([{ equipo_id: equipoId, participante: participanteNombre }])
            .select()
        );

        return delParticipante$.pipe(
          switchMap(() => insert$),
          map(({ error }: any) => {
            if (error && error.code !== '23505') throw error;
            return { ok: true };
          })
        );
      })
    );
  }

  resetAsignaciones() {
    return from(this.supabaseClient.from('asignacion').delete().neq('equipo_id', ''))
      .pipe(
        map(({ error }: any) => {
          if (error) throw error;
          return { ok: true };
        })
      );
  }

  actualizarPuntaje(id: string, pg: number, pe: number, pp: number, p32: number, po: number, pc: number, ps: number, pf: number): Observable<any> {
    return from(
      this.supabaseClient
        .from('equipos')
        .update({ 
          pg: pg,
          pe: pe,
          pp: pp,
          po: po,
          p32: p32,
          pc: pc,
          ps: ps,
          pf: pf,
        })
        .eq('id', id)
    );
  }  

  resetPuntajes(): Observable<any> {
    return from(
      this.supabaseClient
        .from('equipos')
        .update({ 
          pg: 0,
          pe: 0,
          pp: 0,
          p32: 0,
          po: 0,
          pc: 0,
          ps: 0,
          pf: 0,
        })
        .not('id', 'is', null)
    );
  }

  actualizarJuego(juego: Juego): Observable<Juego> {
    const { id, lscore, vscore, ...resto } = juego;
    
    return from(
      this.supabaseClient
        .from('juegos')
        .update({ 
          lscore: lscore || 0,
          vscore: vscore || 0
        })
        .eq('id', id)
        .select()
    ).pipe(
      map(({ data, error }: any) => {
        if (error) throw error;
        if (!data || data.length === 0) throw new Error('Juego no encontrado');
        return { ...data[0], ...resto } as Juego;
      })
    );
  }

  deleteParticipanteAsignaciones(participanteNombre: string): Observable<any> {
    return from(
      this.supabaseClient
        .from('asignacion')
        .delete()
        .eq('participante', participanteNombre)
    ).pipe(
      map(({ error }: any) => {
        if (error) throw error;
        return { ok: true };
      })
    );
  }

  assignEquipoSimple(participanteNombre: string, equipoId: string): Observable<any> {
    return from(
      this.supabaseClient
        .from('asignacion')
        .insert([{ equipo_id: equipoId, participante: participanteNombre }])
        .select()
    ).pipe(
      map(({ error }: any) => {
        if (error && error.code !== '23505') throw error;
        return { ok: true };
      })
    );
  }

}

