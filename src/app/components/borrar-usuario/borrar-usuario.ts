import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterModule } from '@angular/router';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError, finalize, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AuthService } from '../../services/auth/auth';

interface User {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

@Component({
  selector: 'app-borrar-usuario',
  standalone: true,
  imports: [
    ReactiveFormsModule, 
    MatCardModule, 
    MatButtonModule, 
    MatFormFieldModule, 
    MatInputModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    RouterModule
  ],
  templateUrl: './borrar-usuario.html',
  styleUrls: ['./borrar-usuario.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BorrarUsuario implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  loading = false;
  deleting = false;
  
  page = 1;
  perPage = 20;
  q = '';
  totalPages = 1;

  users: User[] = [];

  search = this.fb.control('');

  ngOnInit(): void {
    this.load();
    
    this.search.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.doSearch();
    });
  }

  load(page = this.page, q = this.q): void {
    this.loading = true;

    this.authService.listUsers().pipe(
      catchError(error => {
        this.showMessage(error?.message || 'Error cargando usuarios', 'error');
        return of({ users: [], page: 1, perPage: 20 });
      }),
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }),
      takeUntil(this.destroy$)
    ).subscribe(res => {
      // El servicio ya maneja errores, res siempre es válido
      this.users = (res as any)?.users ?? [];
      this.page = (res as any)?.page ?? page;
      this.perPage = (res as any)?.perPage ?? this.perPage;
      this.totalPages = Math.ceil(((res as any)?.total_count || this.users.length) / this.perPage);
    });
  }

  doSearch(): void {
    this.q = this.search.value?.trim() || '';
    this.page = 1;
    this.load(1, this.q);
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.load(this.page + 1, this.q);
    }
  }
  
  prevPage(): void {
    if (this.page > 1) {
      this.load(this.page - 1, this.q);
    }
  }

  confirmAndDelete(u: User): void {
    const ok = confirm(`¿Eliminar al usuario ${u.email ?? u.id}? Esta acción no se puede deshacer.`);
    if (!ok) return;

    this.deleting = true;

    this.authService.deleteUser(u.id).pipe(
      catchError(error => {
        this.showMessage(error?.message || 'No se pudo eliminar', 'error');
        return of(null);
      }),
      finalize(() => {
        this.deleting = false;
        this.cdr.detectChanges();
      }),
      takeUntil(this.destroy$)
    ).subscribe(res => {
      // Si llegamos aquí, la operación fue exitosa (el servicio maneja errores)
      if (res !== null) {
        this.showMessage('Usuario eliminado correctamente', 'success');
        this.load(this.page, this.q);
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
    this.authService.logout().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: () => {
        this.router.navigate(['/login']);
      }
    });
  }

  trackByUserId(index: number, user: User): string {
    return user.id;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}