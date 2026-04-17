import { Component, OnDestroy, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth/auth';

@Component({
  selector: 'app-nuevo-usuario',
  standalone: true,
  imports: [
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule, 
    RouterModule
  ],
  templateUrl: './nuevo-usuario.html',
  styleUrls: ['./nuevo-usuario.css']
})
export class NuevoUsuario implements OnDestroy {

  constructor(
    private authService: AuthService,
    private router: Router,
  ) { }

  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  loading = false;
  errorMsg: string | null = null;
  okMsg: string | null = null;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get f() { return this.form.controls; }

  submit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }
    
    this.loading = true;
    this.errorMsg = null;
    this.okMsg = null;

    const { email, password } = this.form.value;

    this.authService.createUser(String(email), String(password))
      .subscribe({
        next: (res: any) => {
          if (res?.error) { 
            this.errorMsg = res.error; return; 
          }
          this.okMsg = 'Usuario creado correctamente';
          this.form.reset();
        },
        error: (e) => this.errorMsg = e?.message || 'No fue posible crear el usuario',
        complete: () => this.loading = false,
      });
  }

  logout(): void {
    this.authService.logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.router.navigate(['/login'], { replaceUrl: true });
        },
        error: () => {
          this.router.navigate(['/login'], { replaceUrl: true });
        }
      });
  }
}