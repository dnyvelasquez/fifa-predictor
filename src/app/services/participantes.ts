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
  
  getParticipantesConPuntaje(): Observable<(Participante & {
  })[]> {
    return this.getParticipantes().pipe(
      switchMap(participantes =>
        forkJoin(
          participantes.map(p =>
            this.equiposService.getEquiposDe(p.nombre).pipe(
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

}
