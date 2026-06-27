import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
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
    FormsModule,
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
  todosEquipos: Equipo[] = [];
  juegos: Juego[] = [];
  loading = false;
  saving = false;
  errorMsg: string | null = null;
  readonly displayedColumns: string[] = ['local', 'visitante', 'fase', 'fecha', 'hora', 'lscore', 'vscore', 'acciones'];

  readonly editableFields = ['local', 'visitante', 'fase', 'fecha', 'hora'] as const;
  editingCell: { id: string; field: string } | null = null;
  editValue: string = '';

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
      this.todosEquipos = equipos;
      this.equipos = equipos;
      this.checkLoadingComplete();
      this.cdr.detectChanges();
    });
  }

  opcionesEquipoEdicion(valorActual: string): Equipo[] {
    const yaIncluido = this.equipos.some(e => e.nombre === valorActual);
    if (yaIncluido) return this.equipos;

    const actual = this.todosEquipos.find(e => e.nombre === valorActual);
    return actual ? [actual, ...this.equipos] : this.equipos;
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
      await this.recalcularPuntajes();

    } catch (err: any) {
      this.errorMsg = err?.message || 'No fue posible crear el juego';
      this.showMessage(this.errorMsg, 'error');
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

async actualizarScore(juego: Juego): Promise<void> {
    if (this.saving) return;

    const lscore = this.toScoreOrNull(juego.lscore);
    const vscore = this.toScoreOrNull(juego.vscore);

    this.saving = true;
    try {
      await this.juegosService.actualizarScores(juego.id, lscore, vscore)
        .pipe(takeUntil(this.destroy$)).toPromise();

      juego.lscore = lscore;
      juego.vscore = vscore;

      await this.recalcularPuntajes();
      this.showMessage(`Score actualizado: ${juego.local} ${lscore ?? '-'} - ${vscore ?? '-'} ${juego.visitante}`, 'success');
    } catch (err: any) {
      this.errorMsg = err?.message || 'No fue posible actualizar el score';
      this.showMessage(this.errorMsg, 'error');
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  private async recalcularPuntajes(): Promise<void> {
    try {
      await this.juegosService.recalcularPuntajesEquipos().pipe(takeUntil(this.destroy$)).toPromise();
    } catch (err: any) {
      this.showMessage(err?.message || 'No fue posible recalcular los puntajes de los equipos', 'error');
    }
  }

  private toScoreOrNull(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = parseInt(value, 10);
    return isNaN(n) ? null : n;
  }

  isEditing(juego: Juego, field: string): boolean {
    return this.editingCell?.id === juego.id && this.editingCell?.field === field;
  }

  startEdit(juego: Juego, field: string): void {
    if (this.saving) return;
    this.editingCell = { id: juego.id, field };
    this.editValue = String((juego as any)[field] ?? '');
    this.cdr.detectChanges();
  }

  cancelEdit(): void {
    this.editingCell = null;
    this.editValue = '';
    this.cdr.detectChanges();
  }

  async saveEdit(juego: Juego, field: string): Promise<void> {
    if (!this.isEditing(juego, field)) return;

    const valorActual = String((juego as any)[field] ?? '');
    const nuevoValor = this.editValue.trim();

    if (!nuevoValor) {
      this.showMessage('El campo no puede quedar vacío', 'error');
      return;
    }

    if (field === 'hora' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(nuevoValor)) {
      this.showMessage('Formato de hora inválido. Usa HH:mm (24h)', 'error');
      return;
    }

    if (field === 'fecha') {
      const fechaParseada = this.parseYYYYMMDD(nuevoValor);
      if (!fechaParseada) {
        this.showMessage('Formato de fecha inválido. Usa AAAA/MM/DD', 'error');
        return;
      }
    }

    if ((field === 'local' && nuevoValor === juego.visitante) ||
        (field === 'visitante' && nuevoValor === juego.local)) {
      this.showMessage('Local y visitante no pueden ser el mismo equipo', 'error');
      return;
    }

    if (nuevoValor === valorActual) {
      this.cancelEdit();
      return;
    }

    this.saving = true;
    try {
      await this.juegosService.actualizarCampos(juego.id, { [field]: nuevoValor } as any)
        .pipe(takeUntil(this.destroy$)).toPromise();

      (juego as any)[field] = nuevoValor;

      if (field === 'local' || field === 'visitante' || field === 'fase') {
        await this.recalcularPuntajes();
      }

      this.showMessage('Juego actualizado correctamente', 'success');
      this.cancelEdit();
    } catch (err: any) {
      this.errorMsg = err?.message || 'No fue posible actualizar el juego';
      this.showMessage(this.errorMsg, 'error');
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  async eliminarJuego(id: string): Promise<void> {
    if (confirm('¿Estás seguro de eliminar este juego? Esta acción no se puede deshacer.')) {
      try {
        await this.juegosService.eliminarJuego(id).pipe(takeUntil(this.destroy$)).toPromise();
        this.showMessage('Juego eliminado correctamente', 'success');
        await this.cargarJuegos();
        await this.recalcularPuntajes();
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

