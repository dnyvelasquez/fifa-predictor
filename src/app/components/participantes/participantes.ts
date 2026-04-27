import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
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
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth/auth';
import { ParticipantesService } from '../../services/participantes';

type Row = { id: string; nombre: string; numero: number };

@Component({
  selector: 'app-participantes',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatDividerModule,
    MatTableModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './participantes.html',
  styleUrls: ['./participantes.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Participantes implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private participantesService = inject(ParticipantesService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  loading = false;
  saving = false;
  participantes: Row[] = [];

  addForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    numero: [null as number | null, [Validators.required, Validators.min(0)]],
  });

  editForms: Record<string, FormGroup> = {};

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    
    this.participantesService.getParticipantes().pipe(
      catchError(error => {
        this.showMessage('No se pudieron cargar los participantes', 'error');
        return of([]);
      }),
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }),
      takeUntil(this.destroy$)
    ).subscribe(rows => {
      this.participantes = rows.sort((a, b) => a.numero - b.numero || a.nombre.localeCompare(b.nombre));
    });
  }

  add(): void {
    if (this.addForm.invalid || this.saving) {
      this.addForm.markAllAsTouched();
      return;
    }
    
    const { nombre, numero } = this.addForm.value;
    this.saving = true;

    this.participantesService.createParticipante(String(nombre), Number(numero)).pipe(
      catchError(error => {
        this.showMessage(error?.message || 'No se pudo crear el participante', 'error');
        return of(null);
      }),
      finalize(() => {
        this.saving = false;
        this.cdr.detectChanges();
      }),
      takeUntil(this.destroy$)
    ).subscribe(row => {
      if (row) {
        this.showMessage('Participante creado', 'success');
        this.addForm.reset();
        this.participantes = [...this.participantes, row]
          .sort((a, b) => a.numero - b.numero || a.nombre.localeCompare(b.nombre));
      }
    });
  }

  startEdit(p: Row): void {
    if (!this.editForms[p.id]) {
      this.editForms[p.id] = this.fb.group({
        nombre: [p.nombre, [Validators.required, Validators.minLength(2)]],
        numero: [p.numero, [Validators.required, Validators.min(0)]],
      });
    }
  }

  cancelEdit(p: Row): void {
    delete this.editForms[p.id];
  }

  saveEdit(p: Row): void {
    const fg = this.editForms[p.id];
    if (!fg || fg.invalid) {
      fg?.markAllAsTouched();
      return;
    }

    const patch = {
      nombre: String(fg.value.nombre),
      numero: Number(fg.value.numero),
    };

    if (patch.nombre === p.nombre && patch.numero === p.numero) {
      this.cancelEdit(p);
      return;
    }

    this.saving = true;

    this.participantesService.updateParticipante(p.id, patch).pipe(
      catchError(error => {
        this.showMessage(error?.message || 'No se pudo actualizar', 'error');
        return of(null);
      }),
      finalize(() => {
        this.saving = false;
        this.cdr.detectChanges();
      }),
      takeUntil(this.destroy$)
    ).subscribe(row => {
      if (row) {
        this.showMessage('Participante actualizado', 'success');
        this.participantes = this.participantes
          .map(x => x.id === p.id ? row : x)
          .sort((a, b) => a.numero - b.numero || a.nombre.localeCompare(b.nombre));
        this.cancelEdit(p);
      }
    });
  }

  remove(p: Row): void {
    const ok = confirm(`¿Eliminar a "${p.nombre}"? Esta acción no se puede deshacer.`);
    if (!ok) return;

    this.saving = true;

    this.participantesService.deleteParticipante(p.id).pipe(
      catchError(error => {
        this.showMessage(error?.message || 'No se pudo eliminar', 'error');
        return of(null);
      }),
      finalize(() => {
        this.saving = false;
        this.cdr.detectChanges();
      }),
      takeUntil(this.destroy$)
    ).subscribe(result => {
      if (result) {
        this.showMessage('Participante eliminado', 'success');
        this.participantes = this.participantes.filter(x => x.id !== p.id);
        delete this.editForms[p.id];
      }
    });
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

  trackByParticipanteId(index: number, p: Row): string {
    return p.id;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
