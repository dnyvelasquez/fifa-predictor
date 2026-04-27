import { Component, OnInit, OnDestroy, inject, computed, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { ParticipantesService, Participante } from '../../services/participantes';
import { EquiposService, Equipo } from '../../services/equipos';
import { AsignacionService } from '../../services/asignacion';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth/auth';

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
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './asignacion.html',
  styleUrls: ['./asignacion.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Asignacion implements OnInit, OnDestroy {
  private participantesService = inject(ParticipantesService);
  private equiposService = inject(EquiposService);
  private asignacionService = inject(AsignacionService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  loading = signal(true);
  saving = signal(false);
  
  participantes = signal<Participante[]>([]);
  equipos = signal<Equipo[]>([]);
  asignaciones = signal<AsignacionRow[]>([]);

  readonly filas = [
    { id: 'equipo1', label: 'Equipo 1' },
    { id: 'equipo2', label: 'Equipo 2' }
  ];

  equiposOrdenados = computed(() => {
    return [...this.equipos()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  ngOnInit(): void {
    this.cargarTodo();
  }

  private cargarTodo(): void {
    this.loading.set(true);

    forkJoin({
      participantes: this.participantesService.getParticipantes(),
      equipos: this.equiposService.getEquipos(),
      asign: this.asignacionService.getAsignaciones(),
    }).pipe(
      catchError(error => {
        this.showMessage(error?.message || 'No fue posible cargar la asignación', 'error');
        return of({ participantes: [], equipos: [], asign: [] });
      }),
      finalize(() => {
        this.loading.set(false);
        this.cdr.detectChanges();
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: ({ participantes, equipos, asign }) => {
        const ordPart = [...participantes].sort(
          (a, b) => (a.numero ?? 0) - (b.numero ?? 0) || a.nombre.localeCompare(b.nombre)
        );
        this.participantes.set(ordPart);
        this.equipos.set(equipos);
        this.asignaciones.set(asign ?? []);
      }
    });
  }

  /**
   * Obtiene los equipos asignados a un participante
   */
  private getEquiposAsignados(participanteNombre: string): string[] {
    return this.asignaciones()
      .filter(a => a.participante === participanteNombre)
      .map(a => a.equipo_id);
  }

  /**
   * Obtiene el equipo asignado para una fila específica (1 o 2)
   */
  getEquipoAsignado(participanteNombre: string, filaId: string): string | null {
    const equipos = this.getEquiposAsignados(participanteNombre);
    
    if (filaId === 'equipo1' && equipos.length > 0) {
      return equipos[0];
    }
    if (filaId === 'equipo2' && equipos.length > 1) {
      return equipos[1];
    }
    return null;
  }

  /**
   * Actualiza la asignación de un participante
   */
  onChangeCelda(filaId: string, participanteNombre: string, equipoId: string | null): void {
    if (this.saving()) return;
    
    this.saving.set(true);
    
    const equiposActuales = this.getEquiposAsignados(participanteNombre);
    let nuevosEquipos: string[] = [];

    if (filaId === 'equipo1') {
      if (equipoId) {
        // Asignar equipo1, mantener equipo2 si existe
        nuevosEquipos = [equipoId];
        if (equiposActuales.length > 1 && equiposActuales[1] !== equipoId) {
          nuevosEquipos.push(equiposActuales[1]);
        }
      } else {
        // Limpiar equipo1, mantener equipo2 si existe
        if (equiposActuales.length > 1) {
          nuevosEquipos = [equiposActuales[1]];
        }
      }
    } else if (filaId === 'equipo2') {
      if (equipoId) {
        // Mantener equipo1 si existe, asignar equipo2
        if (equiposActuales.length > 0 && equiposActuales[0] !== equipoId) {
          nuevosEquipos = [equiposActuales[0]];
        }
        nuevosEquipos.push(equipoId);
      } else {
        // Limpiar equipo2, mantener equipo1 si existe
        if (equiposActuales.length > 0) {
          nuevosEquipos = [equiposActuales[0]];
        }
      }
    }

    // Eliminar duplicados y asegurar orden
    nuevosEquipos = [...new Set(nuevosEquipos)].slice(0, 2);

    this.asignacionService.deleteParticipanteAsignaciones(participanteNombre).pipe(
      catchError(error => {
        this.showMessage(error?.message || 'Error al actualizar', 'error');
        return of(null);
      }),
      takeUntil(this.destroy$)
    ).subscribe(result => {
      if (result === null) {
        this.saving.set(false);
        return;
      }

      if (nuevosEquipos.length === 0) {
        // Sin equipos asignados
        const nuevasAsignaciones = this.asignaciones().filter(a => a.participante !== participanteNombre);
        this.asignaciones.set(nuevasAsignaciones);
        this.showMessage('Asignación actualizada', 'success');
        this.saving.set(false);
        this.cdr.detectChanges();
        return;
      }

      // Insertar nuevos equipos
      const insertObservables = nuevosEquipos.map(equipoId => 
        this.asignacionService.assignEquipoSimple(participanteNombre, equipoId)
      );
      
      forkJoin(insertObservables).pipe(
        catchError(error => {
          this.showMessage(error?.message || 'No se pudo actualizar la asignación', 'error');
          return of([]);
        }),
        finalize(() => {
          this.saving.set(false);
          this.cdr.detectChanges();
        }),
        takeUntil(this.destroy$)
      ).subscribe(() => {
        // Recargar asignaciones actualizadas
        this.asignacionService.getAsignaciones().pipe(
          takeUntil(this.destroy$)
        ).subscribe(asignaciones => {
          this.asignaciones.set(asignaciones);
          this.showMessage('Asignación actualizada', 'success');
        });
      });
    });
  }

  /**
   * Resetea todas las asignaciones
   */
  resetAll(): void {
    const ok = confirm('¿Quitar TODAS las asignaciones?');
    if (!ok) return;

    this.saving.set(true);

    this.asignacionService.resetAsignaciones().pipe(
      catchError(error => {
        this.showMessage(error?.message || 'No se pudo reiniciar', 'error');
        return of(null);
      }),
      finalize(() => {
        this.saving.set(false);
        this.cdr.detectChanges();
      }),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.asignaciones.set([]);
      this.showMessage('Asignaciones reiniciadas', 'success');
    });
  }

  /**
   * Verifica si un equipo ya está asignado a un participante (excluyendo la fila actual)
   */
  isEquipoDisabled(participanteNombre: string, filaId: string, equipoId: string): boolean {
    const equiposAsignados = this.getEquiposAsignados(participanteNombre);
    const equipoAsignadoActual = this.getEquipoAsignado(participanteNombre, filaId);
    
    // Si el equipo ya está asignado en la otra fila, deshabilitarlo
    return equiposAsignados.includes(equipoId) && equipoAsignadoActual !== equipoId;
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: type === 'success' ? 'snackbar-success' : 'snackbar-error'
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  trackByParticipante(index: number, p: Participante): string {
    return p.id;
  }

  trackByEquipo(index: number, eq: Equipo): string {
    return eq.id;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}



// import { Component, OnInit, inject, computed, signal } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { MatCardModule } from '@angular/material/card';
// import { MatSelectModule } from '@angular/material/select';
// import { MatButtonModule } from '@angular/material/button';
// import { MatIconModule } from '@angular/material/icon';
// import { MatDividerModule } from '@angular/material/divider';
// import { MatMenuModule } from '@angular/material/menu';
// import { ParticipantesService, Participante } from '../../services/participantes';
// import { EquiposService, Equipo } from '../../services/equipos';
// import { AsignacionService } from '../../services/asignacion';
// import { forkJoin } from 'rxjs';
// import { Router, RouterModule } from '@angular/router';
// import { AuthService } from '../../services/auth/auth';

// type AsignacionRow = { id?: string; equipo_id: string; participante: string };

// @Component({
//   selector: 'app-asignacion',
//   standalone: true,
//   imports: [
//     CommonModule,
//     MatCardModule,
//     MatSelectModule,
//     MatButtonModule,
//     MatIconModule,
//     MatDividerModule,
//     RouterModule,
//     MatMenuModule
//   ],
//   templateUrl: './asignacion.html',
//   styleUrls: ['./asignacion.css'],
// })
// export class Asignacion implements OnInit {

//   constructor(
//     private participantesService: ParticipantesService,
//     private equiposService: EquiposService,
//     private asignacionService: AsignacionService,
//     private authService: AuthService
//   ) {}


//   private router = inject(Router);

//   loading = signal(true);
//   errorMsg = signal<string | null>(null);
//   okMsg    = signal<string | null>(null);

//   participantes = signal<Participante[]>([]);
//   equipos       = signal<Equipo[]>([]);
//   asignaciones  = signal<AsignacionRow[]>([]);

//   filas = [
//     { id: 'equipo1', label: 'Equipo 1' },
//     { id: 'equipo2', label: 'Equipo 2' }
//   ];

//   ngOnInit(): void { this.cargarTodo(); }

//   private cargarTodo() {
//     this.loading.set(true);
//     this.errorMsg.set(null);
//     this.okMsg.set(null);

//     forkJoin({
//       participantes: this.participantesService.getParticipantes(),
//       equipos:       this.equiposService.getEquipos(), 
//       asign:         this.asignacionService.getAsignaciones(),
//     }).subscribe({
//       next: ({ participantes, equipos, asign }) => {
//         const ordPart = [...participantes].sort(
//           (a, b) => (a.numero ?? 0) - (b.numero ?? 0) || a.nombre.localeCompare(b.nombre)
//         );
//         this.participantes.set(ordPart);
//         this.equipos.set(equipos);
//         this.asignaciones.set(asign ?? []);
//       },
//       error: (e) => this.errorMsg.set(e?.message || 'No fue posible cargar la asignación'),
//       complete: () => this.loading.set(false)
//     });
//   }

//   equiposOrdenados = computed(() => {
//     return [...this.equipos()].sort((a, b) => a.nombre.localeCompare(b.nombre));
//   });

//   getEquipoAsignado(participanteNombre: string, filaId: string): string | null {
//     const asignacionesParticipante = this.asignaciones()
//       .filter(a => a.participante === participanteNombre);
    
//     if (filaId === 'equipo1' && asignacionesParticipante.length > 0) {
//       return asignacionesParticipante[0].equipo_id;
//     }
//     if (filaId === 'equipo2' && asignacionesParticipante.length > 1) {
//       return asignacionesParticipante[1].equipo_id;
//     }
//     return null;
//   }

//   onChangeCelda(filaId: string, participanteNombre: string, equipoId: string | null) {
//     this.loading.set(true);
//     this.errorMsg.set(null);
//     this.okMsg.set(null);

//     const asignacionesActuales = this.asignaciones()
//       .filter(a => a.participante === participanteNombre);
    
//     let nuevasAsignaciones = [...this.asignaciones().filter(a => a.participante !== participanteNombre)];
    
//     if (filaId === 'equipo1') {
//       if (equipoId) {
//         nuevasAsignaciones.push({ equipo_id: equipoId, participante: participanteNombre });
//         if (asignacionesActuales.length > 1) {
//           nuevasAsignaciones.push(asignacionesActuales[1]);
//         }
//       } else {
//         if (asignacionesActuales.length > 1) {
//           nuevasAsignaciones.push(asignacionesActuales[1]);
//         }
//       }
//     } else if (filaId === 'equipo2') {
//       if (asignacionesActuales.length > 0) {
//         nuevasAsignaciones.push(asignacionesActuales[0]);
//       }
//       if (equipoId) {
//         nuevasAsignaciones.push({ equipo_id: equipoId, participante: participanteNombre });
//       }
//     }

//     this.asignacionService.deleteParticipanteAsignaciones(participanteNombre).subscribe({
//       next: () => {
//         if (nuevasAsignaciones.length === 0) {
//           this.asignaciones.set(nuevasAsignaciones);
//           this.okMsg.set('Asignación actualizada');
//           this.loading.set(false);
//           return;
//         }

//         const insertObservables = nuevasAsignaciones.map(asign => 
//           this.asignacionService.assignEquipoSimple(asign.participante, asign.equipo_id)
//         );
        
//         forkJoin(insertObservables).subscribe({
//           next: () => {
//             this.asignaciones.set(nuevasAsignaciones);
//             this.okMsg.set('Asignación actualizada');
//             this.loading.set(false);
//           },
//           error: (e) => {
//             this.errorMsg.set(e?.message || 'No se pudo actualizar la asignación');
//             this.loading.set(false);
//           }
//         });
//       },
//       error: (e) => {
//         this.errorMsg.set(e?.message || 'No se pudo actualizar la asignación');
//         this.loading.set(false);
//       }
//     });
//   }

//   resetAll() {
//     const ok = confirm('¿Quitar TODAS las asignaciones?');
//     if (!ok) return;

//     this.loading.set(true);
//     this.errorMsg.set(null);
//     this.okMsg.set(null);

//     this.asignacionService.resetAsignaciones().subscribe({
//       next: () => {
//         this.asignaciones.set([]);
//         this.okMsg.set('Asignaciones reiniciadas');
//       },
//       error: (e) => this.errorMsg.set(e?.message || 'No se pudo reiniciar'),
//       complete: () => this.loading.set(false),
//     });
//   }

//   logout(): void {
//     this.authService.logout();
//     this.router.navigate(['/login']);
//   }
// }