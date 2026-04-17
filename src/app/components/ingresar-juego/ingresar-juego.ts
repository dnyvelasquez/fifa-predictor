import { Component, OnInit, inject } from '@angular/core';
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
import { firstValueFrom } from 'rxjs';
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
    MatTableModule
  ],
  templateUrl: './ingresar-juego.html',
  styleUrls: ['./ingresar-juego.css'],
})
export class IngresarJuego implements OnInit {
  private fb = inject(FormBuilder);

  constructor(
    private authService: AuthService,
    private juegosService: JuegosService,
    private equiposService: EquiposService,    
    private router: Router
  ) {}

  fases = [
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
  errorMsg: string | null = null;
  displayedColumns: string[] = ['local', 'visitante', 'fase', 'fecha', 'hora', 'lscore', 'vscore', 'acciones'];

  form = this.fb.group({
    visitante: ['', Validators.required],
    local: ['', Validators.required],
    fase: ['', Validators.required],
    fecha: [null as Date | null, Validators.required],
    hora: ['', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)]],
  }, { validators: [distintos] });

  ngOnInit(): void {
    this.cargarEquipos();
    this.cargarJuegos();
  }

  cargarEquipos(): void {
    this.equiposService.getEquipos().subscribe({
      next: (eqs) => {
        this.equipos = eqs ?? [];
      },
      error: (e) => {
        this.errorMsg = e?.message || 'No fue posible cargar equipos';
      }
    });
  }

  cargarJuegos(): void {
    this.juegosService.getAllJuegos().subscribe({
      next: (juegos) => {
        this.juegos = juegos ?? [];
      },
      error: (e) => {
        this.errorMsg = e?.message || 'No fue posible cargar los juegos';
      }
    });
  }

  get f() { 
    return this.form.controls; 
  }

  onFechaTyped(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    const d = this.parseYYYYMMDD(v);
    if (d) {
      this.form.get('fecha')?.setValue(d);
    }
  }

  onFechaPicked(e: MatDatepickerInputEvent<Date>) {
    const d = e.value ?? null;
    this.form.get('fecha')?.setValue(d);
  }

  async guardar() {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }
    
    this.loading = true;
    this.errorMsg = null;

    const { visitante, local, fase, fecha, hora } = this.form.value;

    try {
      const fechaStr = this.formatYYYYMMDD(fecha as Date);

      await firstValueFrom(this.juegosService.crearJuego({
        visitante: String(visitante),
        local: String(local),
        fase: String(fase),
        fecha: fechaStr,
        hora: String(hora),
      }));

      this.form.reset();
      
      await this.cargarJuegos();
      
    } catch (err: any) {
      this.errorMsg = err?.message || 'No fue posible crear el juego';
    } finally {
      this.loading = false;
    }
  }

  async actualizarScore(juego: Juego, lscoreInput: any, vscoreInput: any) {
    try {
      const lscore = parseInt(lscoreInput, 10) || 0;
      const vscore = parseInt(vscoreInput, 10) || 0;
      
      if (isNaN(lscore) || isNaN(vscore)) {
        return;
      }
      
      await firstValueFrom(this.juegosService.actualizarScores(juego.id, lscore, vscore));
      
      await this.cargarJuegos();
      
    } catch (err: any) {
      this.errorMsg = err?.message || 'No fue posible actualizar el score';
      await this.cargarJuegos();
    }
  }

  async eliminarJuego(id: string) {
    if (confirm('¿Estás seguro de eliminar este juego? Esta acción no se puede deshacer.')) {
      try {
        await firstValueFrom(this.juegosService.eliminarJuego(id));
        await this.cargarJuegos();
      } catch (err: any) {
        this.errorMsg = err?.message || 'No fue posible eliminar el juego';
      }
    }
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
    
  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.router.navigate(['/login']);
      }
    });
  }  
}

