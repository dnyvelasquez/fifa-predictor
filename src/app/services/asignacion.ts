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
