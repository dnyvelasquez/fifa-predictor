import { Injectable } from '@angular/core';
import { Observable, from, map, forkJoin, of, switchMap } from 'rxjs';
import { SupabaseClientService } from './core/supabase-client';

export interface Asignacion {
  id?: string;
  equipo_id: string;
  participante: string;
}

@Injectable({
  providedIn: 'root',
})


export class AsignacionService {
  
  constructor(private supabaseClient: SupabaseClientService) { }

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

  resetAsignaciones() {
    return from(this.supabaseClient.from('asignacion').delete().neq('equipo_id', ''))
      .pipe(
        map(({ error }: any) => {
          if (error) throw error;
          return { ok: true };
        })
      );
  }

}
