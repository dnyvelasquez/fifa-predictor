import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { Service } from '../../services/data';
import { EquiposService, Equipo } from '../../services/equipos';
import { lastValueFrom } from 'rxjs';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth/auth';

@Component({
  selector: 'app-clasificacion',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    RouterModule,
    MatMenuModule,
    MatFormFieldModule,
    FormsModule
  ],
  templateUrl: './clasificacion.html',
  styleUrls: ['./clasificacion.css'],
})

export class Clasificacion implements OnInit {

  constructor(
    private authService: AuthService,
    private equiposService: EquiposService,
    private router: Router
  ) {}

  private svc = inject(Service);
  
  equipos = signal<Equipo[]>([]);
  loading = signal(false);
  saving = signal(false);
  message = signal<{ text: string; type: 'success' | 'error' } | null>(null);

  e32Options = ['1', '2', '3-1', '3-2', '3-3', '3-4', '3-5', '3-6', '3-7', '3-8'];
  
  ofOptions = signal<string[]>([]);
  cfOptions = signal<string[]>([]);
  sfOptions = signal<string[]>([]);
  gfOptions = signal<string[]>([]);

  usedOfValues = signal<Set<string>>(new Set());
  usedCfValues = signal<Set<string>>(new Set());
  usedSfValues = signal<Set<string>>(new Set());
  usedGfValues = signal<Set<string>>(new Set());

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.loading.set(true);
    try {
      const equipos = await lastValueFrom(this.equiposService.getEquipos());
      const sortedEquipos = [...equipos].sort((a, b) => {
        if (a.grupo === b.grupo) {
          return a.id.localeCompare(b.id);
        }
        return a.grupo.localeCompare(b.grupo);
      });
      this.equipos.set(sortedEquipos);
      this.updateOptions();
    } catch (error) {
      console.error('Error loading data:', error);
      this.showMessage('Error al cargar los datos', 'error');
    } finally {
      this.loading.set(false);
    }
  }

  updateOptions() {
    const equiposConE32 = this.equipos().filter(e => e.e32 && e.e32.trim() !== '');
    const usedOf = new Set(equiposConE32.map(e => e.of).filter(v => v && v.trim() !== ''));
    this.usedOfValues.set(usedOf);
    this.ofOptions.set(Array.from({ length: 16 }, (_, i) => (i + 1).toString()));

    const equiposConOF = equiposConE32.filter(e => e.of && e.of.trim() !== '');
    const usedCf = new Set(equiposConOF.map(e => e.cf).filter(v => v && v.trim() !== ''));
    this.usedCfValues.set(usedCf);
    this.cfOptions.set(Array.from({ length: 8 }, (_, i) => (i + 1).toString()));

    const equiposConCF = equiposConOF.filter(e => e.cf && e.cf.trim() !== '');
    const usedSf = new Set(equiposConCF.map(e => e.sf).filter(v => v && v.trim() !== ''));
    this.usedSfValues.set(usedSf);
    this.sfOptions.set(Array.from({ length: 4 }, (_, i) => (i + 1).toString()));

    const equiposConSF = equiposConCF.filter(e => e.sf && e.sf.trim() !== '');
    const usedGf = new Set(equiposConSF.map(e => e.gf).filter(v => v && v.trim() !== ''));
    this.usedGfValues.set(usedGf);
    this.gfOptions.set(Array.from({ length: 2 }, (_, i) => (i + 1).toString()));
  }

  getEquiposPorGrupo(): Map<string, Equipo[]> {
    const grupos = new Map<string, Equipo[]>();
    this.equipos().forEach(equipo => {
      if (!grupos.has(equipo.grupo)) {
        grupos.set(equipo.grupo, []);
      }
      grupos.get(equipo.grupo)!.push(equipo);
    });
    return grupos;
  }

  getGruposOrdenados(): string[] {
    return Array.from(this.getEquiposPorGrupo().keys()).sort();
  }

  async updateEquipo(equipo: Equipo, field: keyof Equipo, value: string) {
    this.saving.set(true);
    try {
      if (field === 'e32') {
        if (value === '1' || value === '2') {
          const mismoGrupo = this.equipos().filter(e => e.grupo === equipo.grupo);
          const tiene1 = mismoGrupo.some(e => e.e32 === '1' && e.id !== equipo.id);
          const tiene2 = mismoGrupo.some(e => e.e32 === '2' && e.id !== equipo.id);
          
          if (value === '1' && tiene1) {
            this.showMessage(`Ya existe un equipo con '1' en el grupo ${equipo.grupo}`, 'error');
            return;
          }
          if (value === '2' && tiene2) {
            this.showMessage(`Ya existe un equipo con '2' en el grupo ${equipo.grupo}`, 'error');
            return;
          }
        }
        
        if (equipo.e32 !== value) {
          equipo.of = '';
          equipo.cf = '';
          equipo.sf = '';
          equipo.gf = '';
        }
      }

      if (field === 'of' && value) {
        if (this.usedOfValues().has(value) && equipo.of !== value) {
          this.showMessage(`El número ${value} ya está asignado en Octavos de Final`, 'error');
          return;
        }
        if (!equipo.e32 || equipo.e32.trim() === '') {
          this.showMessage('Debe asignar Eliminatoria 32 primero', 'error');
          return;
        }
        if (equipo.of !== value) {
          equipo.cf = '';
          equipo.sf = '';
          equipo.gf = '';
        }
      }

      if (field === 'cf' && value) {
        if (this.usedCfValues().has(value) && equipo.cf !== value) {
          this.showMessage(`El número ${value} ya está asignado en Cuartos de Final`, 'error');
          return;
        }
        if (!equipo.of || equipo.of.trim() === '') {
          this.showMessage('Debe asignar Octavos de Final primero', 'error');
          return;
        }
        if (equipo.cf !== value) {
          equipo.sf = '';
          equipo.gf = '';
        }
      }

      if (field === 'sf' && value) {
        if (this.usedSfValues().has(value) && equipo.sf !== value) {
          this.showMessage(`El número ${value} ya está asignado en Semifinal`, 'error');
          return;
        }
        if (!equipo.cf || equipo.cf.trim() === '') {
          this.showMessage('Debe asignar Cuartos de Final primero', 'error');
          return;
        }
        if (equipo.sf !== value) {
          equipo.gf = '';
        }
      }

      if (field === 'gf' && value) {
        if (this.usedGfValues().has(value) && equipo.gf !== value) {
          this.showMessage(`El número ${value} ya está asignado en Gran Final`, 'error');
          return;
        }
        if (!equipo.sf || equipo.sf.trim() === '') {
          this.showMessage('Debe asignar Semifinal primero', 'error');
          return;
        }
      }

      const updateData: Partial<Equipo> = {};
      updateData[field] = value as any;
      
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

      const { error } = await this.svc['supabase']
        .from('equipos')
        .update(updateData)
        .eq('id', equipo.id);

      if (error) throw error;

      (equipo as any)[field] = value;
      if (updateData.of !== undefined) equipo.of = updateData.of;
      if (updateData.cf !== undefined) equipo.cf = updateData.cf;
      if (updateData.sf !== undefined) equipo.sf = updateData.sf;
      if (updateData.gf !== undefined) equipo.gf = updateData.gf;
      
      this.equipos.set([...this.equipos()]);
      this.updateOptions();
      this.showMessage('Guardado exitosamente', 'success');
    } catch (error) {
      console.error('Error updating equipo:', error);
      this.showMessage('Error al guardar los cambios', 'error');
    } finally {
      this.saving.set(false);
    }
  }

  async resetAll() {
    if (!confirm('¿Estás seguro de que quieres resetear toda la clasificación? Se perderán todos los datos.')) {
      return;
    }

    this.saving.set(true);
    try {
      const updates = this.equipos().map(equipo => 
        this.svc['supabase']
          .from('equipos')
          .update({ e32: '', of: '', cf: '', sf: '', gf: '' })
          .eq('id', equipo.id)
      );
      
      await Promise.all(updates);
      
      this.equipos.update(equipos => 
        equipos.map(e => ({ ...e, e32: '', of: '', cf: '', sf: '', gf: '' }))
      );
      
      this.updateOptions();
      this.showMessage('Todos los datos han sido reseteados', 'success');
    } catch (error) {
      console.error('Error resetting data:', error);
      this.showMessage('Error al resetear los datos', 'error');
    } finally {
      this.saving.set(false);
    }
  }

  showMessage(text: string, type: 'success' | 'error') {
    this.message.set({ text, type });
    setTimeout(() => this.message.set(null), 3000);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  isOptionDisabled(field: string, value: string, equipo: Equipo): boolean {
    if (field === 'e32') {
      if (value === '1' || value === '2') {
        const mismoGrupo = this.equipos().filter(e => e.grupo === equipo.grupo);
        const yaAsignado = mismoGrupo.some(e => e.e32 === value && e.id !== equipo.id);
        return yaAsignado;
      }
      return false;
    }
    
    if (field === 'of') {
      return this.usedOfValues().has(value) && equipo.of !== value;
    }
    if (field === 'cf') {
      return this.usedCfValues().has(value) && equipo.cf !== value;
    }
    if (field === 'sf') {
      return this.usedSfValues().has(value) && equipo.sf !== value;
    }
    if (field === 'gf') {
      return this.usedGfValues().has(value) && equipo.gf !== value;
    }
    return false;
  }

  getGruposAgrupados(): { grupo: string; equipos: Equipo[] }[] {
    const gruposMap = new Map<string, Equipo[]>();
    this.equipos().forEach(equipo => {
      if (!gruposMap.has(equipo.grupo)) {
        gruposMap.set(equipo.grupo, []);
      }
      gruposMap.get(equipo.grupo)!.push(equipo);
    });
    
    return Array.from(gruposMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([grupo, equipos]) => ({ grupo, equipos }));
  }

}