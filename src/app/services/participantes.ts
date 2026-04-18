import { Injectable } from '@angular/core';
import { Observable, from, map, forkJoin, of, switchMap } from 'rxjs';
import { SupabaseClientService } from './core/supabase-client';
import { EquiposService, Equipo } from './equipos';

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


@Injectable({
  providedIn: 'root',
})
export class ParticipantesService { 
  
  constructor(
    private supabaseClient: SupabaseClientService,
    private equiposService: EquiposService,  
  ) {}

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
  
  getParticipantesConPuntaje(): Observable<(Participante & {})[]> {
    return this.getParticipantes().pipe(
      switchMap(participantes =>
        forkJoin(
          participantes.map(p =>
            this.equiposService.getEquiposDe(p.nombre).pipe(
              map(equipos => {
                // Eliminar equipos duplicados por nombre
                const equiposUnicos = equipos.filter((eq, index, self) => 
                  index === self.findIndex(e => e.nombre === eq.nombre)
                );
                
                const puntajeEquipos = equiposUnicos.reduce((acc, eq) => 
                  acc + (eq.pg ?? 0) * 10 + (eq.pe ?? 0) * 5 + (eq.p32 ?? 0) * 20 + 
                  (eq.po ?? 0) * 20 + (eq.pc ?? 0) * 30 + (eq.ps ?? 0) * 40 + (eq.pf ?? 0) * 50, 0);
                const acumulado = p.acumulado ?? 0;
                return { 
                  ...p, 
                  equipos: equiposUnicos, 
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

  acumularPuntajesEnParticipantes() {
    return forkJoin({
      asign: from(
        this.supabaseClient
          .from('asignacion')
          .select('participante, equipos!inner(pg, pe, pp, p32, po, pc, ps, pf)')
      ),
      parts: from(
        this.supabaseClient
          .from('participantes')
          .select('id,nombre,acumulado')
      )
    }).pipe(
      switchMap(({ asign, parts }: any) => {
        if (asign.error) throw asign.error;
        if (parts.error) throw parts.error;

        const totales: Record<string, number> = {};
        for (const row of asign.data ?? []) {
          const nombre = (row.participante || '').trim();
          const pts = Number((row.equipos?.pg ?? 0) * 10 + (row.equipos?.pe ?? 0) * 5 + (row.equipos?.p32 ?? 0) * 20 + (row.equipos?.po ?? 0) * 20 + (row.equipos?.pc ?? 0) * 30 + (row.equipos?.ps ?? 0) * 40 + (row.equipos?.pf ?? 0) * 50);
          if (!nombre || !pts) continue;
          totales[nombre] = (totales[nombre] ?? 0) + pts;
        }

        const updates = (parts.data ?? [])
          .filter((p: any) => totales[p.nombre])
          .map((p: any) =>
            from(
              this.supabaseClient
                .from('participantes')
                .update({ acumulado: Number(p.acumulado ?? 0) + totales[p.nombre] })
                .eq('id', p.id)
            )
          );

        if (!updates.length) return of({ ok: true, updated: 0 });
        return forkJoin(updates).pipe(map(() => ({ ok: true, updated: updates.length })));
      })
    );
  }

  resetAcumulados(): Observable<any> {
    return from(      
      this.supabaseClient
        .from('participantes')
        .update({ 
          acumulado: 0,
        })
        .not('id', 'is', null)
    );
  }

}
