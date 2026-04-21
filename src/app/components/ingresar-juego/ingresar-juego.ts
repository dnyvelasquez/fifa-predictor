import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError, finalize, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth/auth';
import { JuegosService, Juego } from '../../services/juegos';
import { EquiposService, Equipo } from '../../services/equipos';

function distintos(control: AbstractControl): ValidationErrors | null {
  const v = control.get('visitante')?.value;
  const l = control.get('local')?.value;
  if (!v || !l) return null;
  return v === l ? { mismosEquipos: true } : null;
}

@Component({
  selector: 'app-ingresar-juego',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatSelectModule, 
    MatButtonModule,
    MatDatepickerModule, 
    MatNativeDateModule,
    RouterModule,
    MatIconModule,
    MatDividerModule,
    MatMenuModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './ingresar-juego.html',
  styleUrls: ['./ingresar-juego.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IngresarJuego implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private juegosService = inject(JuegosService);
  private equiposService = inject(EquiposService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  readonly fases = [
    'Fase de Grupos',
    'Eliminatoria 32',
    'Octavos de Final',
    'Cuartos de Final',
    'Semifinal',
    'Final',
  ] as const;

  equipos: Equipo[] = [];
  juegos: Juego[] = [];
  loading = false;
  saving = false;
  errorMsg: string | null = null;
  readonly displayedColumns: string[] = ['local', 'visitante', 'fase', 'fecha', 'hora', 'lscore', 'vscore', 'acciones'];

  form = this.fb.group({
    visitante: ['', Validators.required],
    local: ['', Validators.required],
    fase: ['', Validators.required],
    fecha: [null as Date | null, Validators.required],
    hora: ['', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)]],
  }, { validators: [distintos] });

  ngOnInit(): void {
    this.loading = true; 
    this.cargarEquipos();
    this.cargarJuegos();
    
    this.form.valueChanges.pipe(
      debounceTime(3000),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.errorMsg = null;
      this.cdr.detectChanges();
    });
  }

  cargarEquipos(): void {
    this.equiposService.getEquipos().pipe(
      catchError(error => {
        this.showMessage('No fue posible cargar equipos', 'error');
        return of([]);
      }),
      takeUntil(this.destroy$)
    ).subscribe(equipos => {
      this.equipos = equipos.filter(e => {
        const participante = (e.participante ?? '').trim();
        return participante && participante.toLowerCase() !== 'no asignado';
      });
      this.checkLoadingComplete();
      this.cdr.detectChanges();
    });
  }

  cargarJuegos(): void {
    this.juegosService.getAllJuegos().pipe(
      catchError(error => {
        this.showMessage('No fue posible cargar los juegos', 'error');
        return of([]);
      }),
      takeUntil(this.destroy$)
    ).subscribe(juegos => {
      this.juegos = juegos;
      this.checkLoadingComplete();
      this.cdr.detectChanges();
    });
  }

  private checkLoadingComplete(): void {
    setTimeout(() => {
      this.loading = false;
      this.cdr.detectChanges();
    }, 1000);
  }

  get f() { 
    return this.form.controls; 
  }

  onFechaTyped(e: Event): void {
    const v = (e.target as HTMLInputElement).value;
    const d = this.parseYYYYMMDD(v);
    if (d) {
      this.form.get('fecha')?.setValue(d);
    }
  }

  onFechaPicked(e: MatDatepickerInputEvent<Date>): void {
    const d = e.value ?? null;
    this.form.get('fecha')?.setValue(d);
  }

  async guardar(): Promise<void> {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    
    this.saving = true;
    this.errorMsg = null;

    const { visitante, local, fase, fecha, hora } = this.form.value;

    try {
      const fechaStr = this.formatYYYYMMDD(fecha as Date);

      await this.juegosService.crearJuego({
        visitante: String(visitante),
        local: String(local),
        fase: String(fase),
        fecha: fechaStr,
        hora: String(hora),
      }).pipe(takeUntil(this.destroy$)).toPromise();

      this.form.reset();
      this.showMessage('Juego creado exitosamente', 'success');
      await this.cargarJuegos();
      
    } catch (err: any) {
      this.errorMsg = err?.message || 'No fue posible crear el juego';
      this.showMessage(this.errorMsg, 'error');
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  async actualizarScore(juego: Juego, lscoreValue: any, vscoreValue: any): Promise<void> {
    const lscore = parseInt(lscoreValue, 10) || 0;
    const vscore = parseInt(vscoreValue, 10) || 0;
    
    if (isNaN(lscore) || isNaN(vscore)) return;
    
    try {
      await this.juegosService.actualizarScores(juego.id, lscore, vscore)
        .pipe(takeUntil(this.destroy$)).toPromise();
      
      this.showMessage(`Score actualizado: ${juego.local} ${lscore} - ${vscore} ${juego.visitante}`, 'success');
      await this.cargarJuegos();
      
    } catch (err: any) {
      this.errorMsg = err?.message || 'No fue posible actualizar el score';
      this.showMessage(this.errorMsg, 'error');
    }
  }

  async eliminarJuego(id: string): Promise<void> {
    if (confirm('¿Estás seguro de eliminar este juego? Esta acción no se puede deshacer.')) {
      try {
        await this.juegosService.eliminarJuego(id).pipe(takeUntil(this.destroy$)).toPromise();
        this.showMessage('Juego eliminado correctamente', 'success');
        await this.cargarJuegos();
      } catch (err: any) {
        this.errorMsg = err?.message || 'No fue posible eliminar el juego';
        this.showMessage(this.errorMsg, 'error');
      }
    }
  }

  logout(): void {
    this.authService.logout().pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: () => {
        this.router.navigate(['/login']);
      }
    });
  }

  trackByEquipoId(index: number, equipo: Equipo): string {
    return equipo.id;
  }

  trackByJuegoId(index: number, juego: Juego): string {
    return juego.id;
  }

  trackByFase(index: number, fase: string): string {
    return fase;
  }

  private showMessage(message: string | null, type: 'success' | 'error'): void {
    if (!message) return; // Si no hay mensaje, no hacer nada
    
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: type === 'success' ? 'snackbar-success' : 'snackbar-error'
    });
  }

  private parseYYYYMMDD(s: string): Date | null {
    if (!s) return null;
    const clean = s.trim().replace(/-/g, '/');
    const m = clean.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const dt = new Date(y, mo - 1, d);
    return (dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d) ? dt : null;
  }

  private formatYYYYMMDD(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

