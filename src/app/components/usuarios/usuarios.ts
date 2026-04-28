import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
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
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth/auth';

interface User {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
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
  templateUrl: './usuarios.html',
  styleUrls: ['./usuarios.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Usuarios implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  // Estados
  loading = signal(false);
  creating = signal(false);
  deleting = signal(false);
  
  // Usuarios
  users = signal<User[]>([]);
  searchQuery = signal('');
  searchControl = this.fb.control('');

  // Formulario para crear usuario
  createForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  get f() { return this.createForm.controls; }

  ngOnInit(): void {
    this.loadUsers();
    
    // Búsqueda con debounce
    this.searchControl.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.doSearch();
    });
  }

  // ==================== CREAR USUARIO ====================
  submitCreate(): void {
    if (this.createForm.invalid || this.creating()) {
      this.createForm.markAllAsTouched();
      return;
    }
    
    this.creating.set(true);

    const { email, password } = this.createForm.value;

    this.authService.createUser(String(email), String(password)).pipe(
      catchError(error => {
        this.showMessage(error?.message || 'No fue posible crear el usuario', 'error');
        return of(null);
      }),
      finalize(() => {
        this.creating.set(false);
        this.cdr.detectChanges();
      }),
      takeUntil(this.destroy$)
    ).subscribe(res => {
      if (res) {
        this.showMessage('Usuario creado correctamente', 'success');
        this.createForm.reset();
        this.loadUsers();
      }
    });
  }

  // ==================== LISTAR Y ELIMINAR USUARIOS ====================
  loadUsers(): void {
    this.loading.set(true);

    this.authService.listUsers().pipe(
      catchError(error => {
        this.showMessage(error?.message || 'Error cargando usuarios', 'error');
        return of({ users: [] });
      }),
      finalize(() => {
        this.loading.set(false);
        this.cdr.detectChanges();
      }),
      takeUntil(this.destroy$)
    ).subscribe(res => {
      let allUsers = (res as any)?.users ?? [];
      
      // Filtrar por búsqueda
      if (this.searchQuery()) {
        const query = this.searchQuery().toLowerCase();
        allUsers = allUsers.filter((u: User) => 
          u.email?.toLowerCase().includes(query)
        );
      }
      
      // Ordenar por fecha de creación descendente
      this.users.set(allUsers.sort((a: User, b: User) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    });
  }

  doSearch(): void {
    this.searchQuery.set(this.searchControl.value?.trim() || '');
    this.loadUsers();
  }

  confirmAndDelete(user: User): void {
    const ok = confirm(`¿Eliminar al usuario ${user.email ?? user.id}? Esta acción no se puede deshacer.`);
    if (!ok) return;

    this.deleting.set(true);

    this.authService.deleteUser(user.id).pipe(
      catchError(error => {
        this.showMessage(error?.message || 'No se pudo eliminar', 'error');
        return of(null);
      }),
      finalize(() => {
        this.deleting.set(false);
        this.cdr.detectChanges();
      }),
      takeUntil(this.destroy$)
    ).subscribe(res => {
      if (res !== null) {
        this.showMessage('Usuario eliminado correctamente', 'success');
        this.loadUsers();
      }
    });
  }

  // ==================== UTILIDADES ====================
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