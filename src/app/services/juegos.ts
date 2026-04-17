import { Injectable } from '@angular/core';
import { Observable, from, map, forkJoin, of, switchMap } from 'rxjs';
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
  lscore: number;
  vscore: number;
  logoVisitante?: string;
  logoLocal?: string;
  participanteVisitante? : string;
  participanteLocal? : string;
}

export interface GrupoJuegos {
  fecha: string;
  fases: string[];
  juegos: Juego[];
}


@Injectable({
  providedIn: 'root',
})
export class JuegosService {

  constructor(private supabaseClient: SupabaseClientService) {};

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

  actualizarScores(id: string, lscore: number, vscore: number): Observable<Juego> {
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
        return data[0] as Juego;
      })
    );
  }  

  eliminarJuego(id: string): Observable<void> {
    return from(
      this.supabaseClient
        .from('juegos')
        .delete()
        .eq('id', id)
    ).pipe(
      map(({ error }: any) => {
        if (error) throw error;
        return;
      })
    );
  }
  
}
