import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterModule } from '@angular/router';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth/auth';
import { EquiposService, Equipo } from '../../services/equipos';

@Component({
  selector: 'app-asignar-terceros',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    RouterModule
  ],
  templateUrl: './asignar-terceros.html',
  styleUrls: ['./asignar-terceros.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AsignarTerceros implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private equiposService = inject(EquiposService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  readonly posiciones = [1, 2, 3, 4, 5, 6, 7, 8];

  terceros: Equipo[] = [];
  loading = true;
  saving = false;

  ngOnInit(): void {
    this.loadTerceros();
  }

  private loadTerceros(): void {
    this.loading = true;

    this.equiposService.getEquipos().pipe(
      catchError(err => {
        console.error('Error loading equipos:', err);
        this.showMessage('Error al cargar los equipos', 'error');
        return of([]);
      }),
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }),
      takeUntil(this.destroy$)
    ).subscribe(equipos => {
      this.terceros = equipos
        .filter(e => e.e32?.startsWith('3-'))
        .sort((a, b) => a.e32.localeCompare(b.e32));
    });
  }

  posicionDisabled(pos: number, equipo: Equipo): boolean {
    return this.terceros.some(e => e.id !== equipo.id && e.tercero_pos === pos);
  }

  async asignar(equipo: Equipo, pos: number | null): Promise<void> {
    if (pos != null && this.posicionDisabled(pos, equipo)) {
      this.showMessage(`La posición ${pos} ya está asignada a otro equipo`, 'error');
      return;
    }

    this.saving = true;
    try {
      await this.equiposService.asignarTerceroPos(equipo.id, pos)
        .pipe(takeUntil(this.destroy$)).toPromise();

      equipo.tercero_pos = pos;
      this.showMessage('Posición guardada', 'success');
    } catch (err: any) {
      this.showMessage(err?.message || 'No fue posible guardar la posición', 'error');
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  trackByEquipoId(index: number, equipo: Equipo): string {
    return equipo.id;
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: type === 'success' ? 'snackbar-success' : 'snackbar-error'
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
