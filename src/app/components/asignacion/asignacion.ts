import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { Service, Participante, Equipo } from '../../services/data';
import { forkJoin } from 'rxjs';
import { Router, RouterModule } from '@angular/router';

type AsignacionRow = { id?: string; equipo_id: string; participante: string };

@Component({
  selector: 'app-asignacion',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    RouterModule,
    MatMenuModule
  ],
  templateUrl: './asignacion.html',
  styleUrls: ['./asignacion.css'],
})
export class Asignacion implements OnInit {
  private svc = inject(Service);
  private router = inject(Router);

  loading = signal(true);
  errorMsg = signal<string | null>(null);
  okMsg    = signal<string | null>(null);

  participantes = signal<Participante[]>([]);
  equipos       = signal<Equipo[]>([]);
  asignaciones  = signal<AsignacionRow[]>([]);

  filas = [
    { id: 'equipo1', label: 'Equipo 1' },
    { id: 'equipo2', label: 'Equipo 2' }
  ];

  ngOnInit(): void { this.cargarTodo(); }

  private cargarTodo() {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.okMsg.set(null);

    forkJoin({
      participantes: this.svc.getParticipantes(),
      equipos:       this.svc.getEquipos(), 
      asign:         this.svc.getAsignaciones(),
    }).subscribe({
      next: ({ participantes, equipos, asign }) => {
        const ordPart = [...participantes].sort(
          (a, b) => (a.numero ?? 0) - (b.numero ?? 0) || a.nombre.localeCompare(b.nombre)
        );
        this.participantes.set(ordPart);
        this.equipos.set(equipos);
        this.asignaciones.set(asign ?? []);
      },
      error: (e) => this.errorMsg.set(e?.message || 'No fue posible cargar la asignación'),
      complete: () => this.loading.set(false)
    });
  }

  equiposOrdenados = computed(() => {
    return [...this.equipos()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  getEquipoAsignado(participanteNombre: string, filaId: string): string | null {
    const asignacionesParticipante = this.asignaciones()
      .filter(a => a.participante === participanteNombre);
    
    if (filaId === 'equipo1' && asignacionesParticipante.length > 0) {
      return asignacionesParticipante[0].equipo_id;
    }
    if (filaId === 'equipo2' && asignacionesParticipante.length > 1) {
      return asignacionesParticipante[1].equipo_id;
    }
    return null;
  }

  onChangeCelda(filaId: string, participanteNombre: string, equipoId: string | null) {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.okMsg.set(null);

    const asignacionesActuales = this.asignaciones()
      .filter(a => a.participante === participanteNombre);
    
    let nuevasAsignaciones = [...this.asignaciones().filter(a => a.participante !== participanteNombre)];
    
    if (filaId === 'equipo1') {
      if (equipoId) {
        nuevasAsignaciones.push({ equipo_id: equipoId, participante: participanteNombre });
        if (asignacionesActuales.length > 1) {
          nuevasAsignaciones.push(asignacionesActuales[1]);
        }
      } else {
        if (asignacionesActuales.length > 1) {
          nuevasAsignaciones.push(asignacionesActuales[1]);
        }
      }
    } else if (filaId === 'equipo2') {
      if (asignacionesActuales.length > 0) {
        nuevasAsignaciones.push(asignacionesActuales[0]);
      }
      if (equipoId) {
        nuevasAsignaciones.push({ equipo_id: equipoId, participante: participanteNombre });
      }
    }

    this.svc.deleteParticipanteAsignaciones(participanteNombre).subscribe({
      next: () => {
        if (nuevasAsignaciones.length === 0) {
          this.asignaciones.set(nuevasAsignaciones);
          this.okMsg.set('Asignación actualizada');
          this.loading.set(false);
          return;
        }

        const insertObservables = nuevasAsignaciones.map(asign => 
          this.svc.assignEquipoSimple(asign.participante, asign.equipo_id)
        );
        
        forkJoin(insertObservables).subscribe({
          next: () => {
            this.asignaciones.set(nuevasAsignaciones);
            this.okMsg.set('Asignación actualizada');
            this.loading.set(false);
          },
          error: (e) => {
            this.errorMsg.set(e?.message || 'No se pudo actualizar la asignación');
            this.loading.set(false);
          }
        });
      },
      error: (e) => {
        this.errorMsg.set(e?.message || 'No se pudo actualizar la asignación');
        this.loading.set(false);
      }
    });
  }

  resetAll() {
    const ok = confirm('¿Quitar TODAS las asignaciones?');
    if (!ok) return;

    this.loading.set(true);
    this.errorMsg.set(null);
    this.okMsg.set(null);

    this.svc.resetAsignaciones().subscribe({
      next: () => {
        this.asignaciones.set([]);
        this.okMsg.set('Asignaciones reiniciadas');
      },
      error: (e) => this.errorMsg.set(e?.message || 'No se pudo reiniciar'),
      complete: () => this.loading.set(false),
    });
  }

  logout(): void {
    this.svc.logout();
    this.router.navigate(['/login']);
  }
}