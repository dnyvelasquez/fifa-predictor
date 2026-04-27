import { Injectable } from '@angular/core';
import { Observable, from, map, forkJoin, of, switchMap } from 'rxjs';
import { SupabaseClientService } from './core/supabase-client';

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
  grupo: string;
  e32: string;
  of: string;
  cf: string;
  sf: string;
  gf: string;
  logo: string;
  participante?: string;
}

export interface GrupoEquipos {
  nombre: string;
  equipos: Equipo[];
}

  export interface EquiposEspeciales {
    unoA: Equipo | null;
    unoB: Equipo | null;
    unoC: Equipo | null;
    unoD: Equipo | null;
    unoE: Equipo | null;
    unoF: Equipo | null;
    unoG: Equipo | null;
    unoH: Equipo | null;
    unoI: Equipo | null;
    unoJ: Equipo | null;
    unoK: Equipo | null;
    unoL: Equipo | null;
    dosA: Equipo | null;
    dosB: Equipo | null;
    dosC: Equipo | null;
    dosD: Equipo | null;
    dosE: Equipo | null;
    dosF: Equipo | null;
    dosG: Equipo | null;
    dosH: Equipo | null;
    dosI: Equipo | null;
    dosJ: Equipo | null;
    dosK: Equipo | null;
    dosL: Equipo | null;
    tresUno: Equipo | null;
    tresDos: Equipo | null;
    tresTres: Equipo | null;
    tresCuatro: Equipo | null;
    tresCinco: Equipo | null;
    tresSeis: Equipo | null;
    tresSiete: Equipo | null;
    tresOcho: Equipo | null;
    o1: Equipo | null;
    o2: Equipo | null;
    o3: Equipo | null;
    o4: Equipo | null;
    o5: Equipo | null;
    o6: Equipo | null;
    o7: Equipo | null;
    o8: Equipo | null;
    o9: Equipo | null;
    o10: Equipo | null;
    o11: Equipo | null;
    o12: Equipo | null;
    o13: Equipo | null;
    o14: Equipo | null;
    o15: Equipo | null;
    o16: Equipo | null;
    c1: Equipo | null;
    c2: Equipo | null;
    c3: Equipo | null;
    c4: Equipo | null;
    c5: Equipo | null;
    c6: Equipo | null;
    c7: Equipo | null;
    c8: Equipo | null;
    s1: Equipo | null;
    s2: Equipo | null;
    s3: Equipo | null;
    s4: Equipo | null;
    f1: Equipo | null;
    f2: Equipo | null;
  };


@Injectable({
  providedIn: 'root',
})
export class EquiposService {

  equiposAgrupados$!: Observable<GrupoEquipos[]>;
  equiposEspeciales$!: Observable<EquiposEspeciales[]>;
  gruposOrdenados = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

  constructor(private supabaseClient: SupabaseClientService) {
    this.cargarEquipos();
    this.cargarEquiposEspeciales();
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

  cargarEquipos(): Observable<{ nombre: string, equipos: Equipo[] }[]> {
    return this.getEquipos().pipe(
      map(equipos => {
        const gruposMap = equipos.reduce((map, equipo) => {
          const grupo = equipo.grupo;
          if (!map.has(grupo)) map.set(grupo, []);
          map.get(grupo)!.push(equipo);
          return map;
        }, new Map<string, Equipo[]>());
        
        return Array.from(gruposMap.entries())
          .map(([nombre, equipos]) => ({ nombre, equipos }))
          .sort((a, b) => 
            this.gruposOrdenados.indexOf(a.nombre) - 
            this.gruposOrdenados.indexOf(b.nombre)
          );
      })
    );
  }

  cargarEquiposEspeciales(): Observable<any> {
    return this.getEquipos().pipe(
      map(equipos => {
        const indices = equipos.reduce((acc, equipo) => {
          if (equipo.grupo && equipo.e32) {
            acc[`${equipo.grupo}|${equipo.e32}`] = equipo;
          }
          if (equipo.e32) acc[`e32_${equipo.e32}`] = equipo;
          if (equipo.of) acc[`of_${equipo.of}`] = equipo;
          if (equipo.cf) acc[`cf_${equipo.cf}`] = equipo;
          if (equipo.sf) acc[`sf_${equipo.sf}`] = equipo;
          if (equipo.gf) acc[`gf_${equipo.gf}`] = equipo;
          return acc;
        }, {} as Record<string, Equipo>);
        
        const grupos = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
        const numerosTres = ['Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis', 'Siete', 'Ocho'];
        
        return {
          ...Object.fromEntries(grupos.map(g => [`uno${g}`, indices[`${g}|1`] || null])),
          ...Object.fromEntries(grupos.map(g => [`dos${g}`, indices[`${g}|2`] || null])),
          ...Object.fromEntries(numerosTres.map((n, i) => [`tres${n}`, indices[`e32_3-${i + 1}`] || null])),
          ...Object.fromEntries(Array.from({ length: 16 }, (_, i) => [`o${i + 1}`, indices[`of_${i + 1}`] || null])),
          ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`c${i + 1}`, indices[`cf_${i + 1}`] || null])),
          ...Object.fromEntries(Array.from({ length: 4 }, (_, i) => [`s${i + 1}`, indices[`sf_${i + 1}`] || null])),
          ...Object.fromEntries(Array.from({ length: 2 }, (_, i) => [`f${i + 1}`, indices[`gf_${i + 1}`] || null]))
        };
      })
    );
  }

  async updateClasificacionField(
    equipoId: string, 
    field: 'e32' | 'of' | 'cf' | 'sf' | 'gf', 
    value: string,
    equiposActuales: Equipo[]
  ): Promise<{ success: boolean; error?: string; equiposActualizados?: Equipo[] }> {
    
    const equipo = equiposActuales.find(e => e.id === equipoId);
    if (!equipo) {
      return { success: false, error: 'Equipo no encontrado' };
    }

    const validation = this.validateClasificacionField(equipo, field, value, equiposActuales);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const updateData: Partial<Equipo> = { [field]: value };
    
    this.cleanDependentClasificacionFields(equipo, field, value, updateData);

    try {
      const { error } = await this.supabaseClient
        .from('equipos')
        .update(updateData)
        .eq('id', equipoId);

      if (error) throw error;

      const equiposActualizados = equiposActuales.map(e => {
        if (e.id === equipoId) {
          const updated = { ...e, [field]: value };
          if (updateData.of !== undefined) updated.of = updateData.of;
          if (updateData.cf !== undefined) updated.cf = updateData.cf;
          if (updateData.sf !== undefined) updated.sf = updateData.sf;
          if (updateData.gf !== undefined) updated.gf = updateData.gf;
          return updated;
        }
        return e;
      });

      return { success: true, equiposActualizados };
      
    } catch (error: any) {
      console.error('Error updating clasificacion:', error);
      return { success: false, error: error?.message || 'Error al guardar' };
    }
  }

  validateClasificacionField(
    equipo: Equipo, 
    field: 'e32' | 'of' | 'cf' | 'sf' | 'gf', 
    value: string,
    equiposActuales: Equipo[]
  ): { valid: boolean; error?: string } {
    
    if (field === 'e32') {
      if (value === '1' || value === '2') {
        const mismoGrupo = equiposActuales.filter(e => e.grupo === equipo.grupo);
        const tiene1 = mismoGrupo.some(e => e.e32 === '1' && e.id !== equipo.id);
        const tiene2 = mismoGrupo.some(e => e.e32 === '2' && e.id !== equipo.id);
        
        if (value === '1' && tiene1) {
          return { valid: false, error: `Ya existe un equipo con '1' en el grupo ${equipo.grupo}` };
        }
        if (value === '2' && tiene2) {
          return { valid: false, error: `Ya existe un equipo con '2' en el grupo ${equipo.grupo}` };
        }
      }
      return { valid: true };
    }

    if (field === 'of' && value) {
      const usedOf = this.getUsedOfValues(equiposActuales);
      if (usedOf.has(value) && equipo.of !== value) {
        return { valid: false, error: `El número ${value} ya está asignado en Octavos de Final` };
      }
      if (!equipo.e32 || equipo.e32.trim() === '') {
        return { valid: false, error: 'Debe asignar Eliminatoria 32 primero' };
      }
    }

    if (field === 'cf' && value) {
      const usedCf = this.getUsedCfValues(equiposActuales);
      if (usedCf.has(value) && equipo.cf !== value) {
        return { valid: false, error: `El número ${value} ya está asignado en Cuartos de Final` };
      }
      if (!equipo.of || equipo.of.trim() === '') {
        return { valid: false, error: 'Debe asignar Octavos de Final primero' };
      }
    }

    if (field === 'sf' && value) {
      const usedSf = this.getUsedSfValues(equiposActuales);
      if (usedSf.has(value) && equipo.sf !== value) {
        return { valid: false, error: `El número ${value} ya está asignado en Semifinal` };
      }
      if (!equipo.cf || equipo.cf.trim() === '') {
        return { valid: false, error: 'Debe asignar Cuartos de Final primero' };
      }
    }

    if (field === 'gf' && value) {
      const usedGf = this.getUsedGfValues(equiposActuales);
      if (usedGf.has(value) && equipo.gf !== value) {
        return { valid: false, error: `El número ${value} ya está asignado en Gran Final` };
      }
      if (!equipo.sf || equipo.sf.trim() === '') {
        return { valid: false, error: 'Debe asignar Semifinal primero' };
      }
    }

    return { valid: true };
  }

  private cleanDependentClasificacionFields(
    equipo: Equipo, 
    field: 'e32' | 'of' | 'cf' | 'sf' | 'gf', 
    value: string, 
    updateData: Partial<Equipo>
  ): void {
    if (field === 'e32' && equipo.e32 !== value) {
      updateData.of = '';
      updateData.cf = '';
      updateData.sf = '';
      updateData.gf = '';
    } else if (field === 'of' && equipo.of !== value) {
      updateData.cf = '';
      updateData.sf = '';
      updateData.gf = '';
    } else if (field === 'cf' && equipo.cf !== value) {
      updateData.sf = '';
      updateData.gf = '';
    } else if (field === 'sf' && equipo.sf !== value) {
      updateData.gf = '';
    }
  }

  async resetAllClasificacion(equipos: Equipo[]): Promise<{ success: boolean; error?: string }> {
    try {
      const updates = equipos.map(equipo => 
        this.supabaseClient
          .from('equipos')
          .update({ e32: '', of: '', cf: '', sf: '', gf: '' })
          .eq('id', equipo.id)
      );
      
      await Promise.all(updates);
      return { success: true };
      
    } catch (error: any) {
      console.error('Error resetting clasificacion:', error);
      return { success: false, error: error?.message || 'Error al resetear' };
    }
  }

  getUsedOfValues(equipos: Equipo[]): Set<string> {
    const equiposConE32 = equipos.filter(e => e.e32 && e.e32.trim() !== '');
    return new Set(equiposConE32.map(e => e.of).filter(v => v && v.trim() !== ''));
  }

  getUsedCfValues(equipos: Equipo[]): Set<string> {
    const equiposConOF = equipos.filter(e => e.of && e.of.trim() !== '');
    return new Set(equiposConOF.map(e => e.cf).filter(v => v && v.trim() !== ''));
  }

  getUsedSfValues(equipos: Equipo[]): Set<string> {
    const equiposConCF = equipos.filter(e => e.cf && e.cf.trim() !== '');
    return new Set(equiposConCF.map(e => e.sf).filter(v => v && v.trim() !== ''));
  }

  getUsedGfValues(equipos: Equipo[]): Set<string> {
    const equiposConSF = equipos.filter(e => e.sf && e.sf.trim() !== '');
    return new Set(equiposConSF.map(e => e.gf).filter(v => v && v.trim() !== ''));
  }

  getE32Options(): string[] {
    return ['1', '2', '3-1', '3-2', '3-3', '3-4', '3-5', '3-6', '3-7', '3-8'];
  }

  getOfOptions(): string[] {
    return Array.from({ length: 16 }, (_, i) => (i + 1).toString());
  }

  getCfOptions(): string[] {
    return Array.from({ length: 8 }, (_, i) => (i + 1).toString());
  }

  getSfOptions(): string[] {
    return Array.from({ length: 4 }, (_, i) => (i + 1).toString());
  }

  getGfOptions(): string[] {
    return Array.from({ length: 2 }, (_, i) => (i + 1).toString());
  }







}
