import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AsyncPipe } from '@angular/common';
import { Observable, Subject, of } from 'rxjs';
import { takeUntil, catchError, finalize, shareReplay, tap } from 'rxjs/operators';
import { AuthService } from '../../services/auth/auth';
import { EquiposService, Equipo } from '../../services/equipos';
import { ParticipantesService } from '../../services/participantes';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-puntajes',
  standalone: true,
  imports: [
    MatCardModule,
    MatDividerModule,
    MatTableModule,
    AsyncPipe,
    CommonModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    FormsModule
  ],
  templateUrl: './puntajes.html',
  styleUrls: ['./puntajes.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Puntajes implements OnInit, OnDestroy {
  
  equipos: Equipo[] = [];
  loading = true;
  saving = false;
  private destroy$ = new Subject<void>();
  
  private authService = inject(AuthService);
  private equiposService = inject(EquiposService);
  private participantesService = inject(ParticipantesService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  
  ngOnInit(): void {
    this.loadEquipos();
  }
  
  private loadEquipos(): void {
    this.loading = true;
    
    this.equiposService.getEquipos().pipe(
      tap(() => this.loading = false),
      catchError(error => {
        console.error('Error loading equipos:', error);
        this.showMessage('Error al cargar los equipos', 'error');
        return of([]);
      }),
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }),
      takeUntil(this.destroy$)
    ).subscribe(equipos => {
      // Filtrar equipos con participantes asignados
      this.equipos = equipos.filter(e => {
        const participante = (e.participante ?? '').trim();
        return participante && participante.toLowerCase() !== 'no asignado';
      });
    });
  }
  
  guardarPuntos(equipo: Equipo): void {
    this.saving = true;
    
    this.equiposService.actualizarPuntaje(
      equipo.id, equipo.pg, equipo.pe, equipo.pp, 
      equipo.p32, equipo.po, equipo.pc, equipo.ps, equipo.pf
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.showMessage(`Puntaje actualizado para ${equipo.nombre}`, 'success');
        this.saving = false;
      },
      error: (err) => {
        console.error('Error updating scores:', err);
        this.showMessage(`Error al actualizar puntaje de ${equipo.nombre}`, 'error');
        this.saving = false;
      }
    });
  }
  
  acumular(): void {
    const ok = confirm('¿Sumar el puntaje de cada equipo al "acumulado" de su participante?');
    if (!ok) return;
    
    this.saving = true;
    
    this.participantesService.acumularPuntajesEnParticipantes().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (r: any) => {
        this.showMessage(`Acumulado actualizado (${r?.updated ?? 0} participante(s))`, 'success');
        this.loadEquipos(); // Recargar equipos
        this.saving = false;
      },
      error: (e) => {
        console.error('Error accumulating:', e);
        this.showMessage('Error al acumular: ' + (e?.message || ''), 'error');
        this.saving = false;
      }
    });
  }
  
  resetPuntajes(): void {
    const ok = confirm('¿Poner en 0 el puntaje de TODOS los equipos?');
    if (!ok) return;
    
    this.saving = true;
    
    this.equiposService.resetPuntajes().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.loadEquipos();
        this.showMessage('Puntajes reiniciados a 0', 'success');
        this.saving = false;
      },
      error: (e) => {
        console.error('Error resetting scores:', e);
        this.showMessage('Error al resetear puntajes: ' + (e?.message || ''), 'error');
        this.saving = false;
      }
    });
  }
  
  resetAcumulados(): void {
    const ok = confirm('¿Poner en 0 el puntaje de TODOS los acumulados?');
    if (!ok) return;
    
    this.saving = true;
    
    this.participantesService.resetAcumulados().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.showMessage('Acumulados reiniciados a 0', 'success');
        this.saving = false;
      },
      error: (e) => {
        console.error('Error resetting accumulated:', e);
        this.showMessage('Error al resetear acumulados: ' + (e?.message || ''), 'error');
        this.saving = false;
      }
    });
  }
  
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
  
  private showMessage(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: type === 'success' ? 'snackbar-success' : 'snackbar-error'
    });
  }
  
  trackByEquipoId(index: number, equipo: Equipo): string {
    return equipo.id;
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

