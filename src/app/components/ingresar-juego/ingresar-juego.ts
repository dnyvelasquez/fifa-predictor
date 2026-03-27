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
import { Service, Equipo, Juego } from '../../services/data';

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
  private svc = inject(Service);

  constructor(private service: Service, private router: Router) {}

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
    this.svc.getEquipos().subscribe({
      next: (eqs) => {
        this.equipos = eqs ?? [];
      },
      error: (e) => {
        console.error('Error al cargar equipos:', e);
        this.errorMsg = e?.message || 'No fue posible cargar equipos';
      }
    });
  }

  cargarJuegos(): void {
    // Usamos getAllJuegos() en lugar de getJuegosSemanaActual()
    this.svc.getAllJuegos().subscribe({
      next: (juegos) => {
        this.juegos = juegos ?? [];
        console.log('Juegos cargados:', this.juegos.length);
      },
      error: (e) => {
        console.error('Error al cargar juegos:', e);
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

      await firstValueFrom(this.svc.crearJuego({
        visitante: String(visitante),
        local: String(local),
        fase: String(fase),
        fecha: fechaStr,
        hora: String(hora),
      }));

      // Resetear el formulario
      this.form.reset();
      
      // Recargar la lista de juegos después de guardar
      await this.cargarJuegos();
      
      // Mostrar mensaje de éxito (opcional)
      console.log('Juego guardado exitosamente');
      
    } catch (err: any) {
      console.error('Error al guardar juego:', err);
      this.errorMsg = err?.message || 'No fue posible crear el juego';
    } finally {
      this.loading = false;
    }
  }

  async actualizarScore(juego: Juego, lscoreInput: any, vscoreInput: any) {
    try {
      // Convertir los valores a números
      const lscore = parseInt(lscoreInput, 10) || 0;
      const vscore = parseInt(vscoreInput, 10) || 0;
      
      // Validar que sean números válidos
      if (isNaN(lscore) || isNaN(vscore)) {
        console.error('Scores inválidos');
        return;
      }
      
      // Actualizar usando el método actualizarScores
      await firstValueFrom(this.svc.actualizarScores(juego.id, lscore, vscore));
      
      // Recargar la lista después de actualizar
      await this.cargarJuegos();
      
      console.log('Score actualizado exitosamente');
      
    } catch (err: any) {
      console.error('Error al actualizar score:', err);
      this.errorMsg = err?.message || 'No fue posible actualizar el score';
      // Recargar para revertir cualquier cambio visual
      await this.cargarJuegos();
    }
  }

  async eliminarJuego(id: string) {
    if (confirm('¿Estás seguro de eliminar este juego? Esta acción no se puede deshacer.')) {
      try {
        await firstValueFrom(this.svc.eliminarJuego(id));
        await this.cargarJuegos();
        console.log('Juego eliminado exitosamente');
      } catch (err: any) {
        console.error('Error al eliminar juego:', err);
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
    this.service.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Error al cerrar sesión:', err);
        this.router.navigate(['/login']);
      }
    });
  }  
}



// import { Component, OnInit, inject } from '@angular/core';
// import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
// import { CommonModule } from '@angular/common';
// import { MatCardModule } from '@angular/material/card';
// import { MatFormFieldModule } from '@angular/material/form-field';
// import { MatInputModule } from '@angular/material/input';
// import { MatSelectModule } from '@angular/material/select';
// import { MatButtonModule } from '@angular/material/button';
// import { MatDatepickerModule } from '@angular/material/datepicker';
// import { MatNativeDateModule } from '@angular/material/core';
// import { MatDatepickerInputEvent } from '@angular/material/datepicker';
// import { MatIconModule } from '@angular/material/icon';
// import { MatDividerModule } from '@angular/material/divider';
// import { MatMenuModule } from '@angular/material/menu';
// import { firstValueFrom } from 'rxjs';
// import { Router, RouterModule } from '@angular/router';
// import { Service, Equipo } from '../../services/data';

// function distintos(control: AbstractControl): ValidationErrors | null {
//   const v = control.get('visitante')?.value;
//   const l = control.get('local')?.value;
//   if (!v || !l) return null;
//   return v === l ? { mismosEquipos: true } : null;
// }

// @Component({
//   selector: 'app-ingresar-juego',
//   standalone: true,
//   imports: [
//     CommonModule,
//     ReactiveFormsModule,
//     MatCardModule, 
//     MatFormFieldModule, 
//     MatInputModule, 
//     MatSelectModule, 
//     MatButtonModule,
//     MatDatepickerModule, 
//     MatNativeDateModule,
//     RouterModule,
//     MatIconModule,
//     MatDividerModule,
//     MatMenuModule
//   ],
//   templateUrl: './ingresar-juego.html',
//   styleUrls: ['./ingresar-juego.css'],
// })
// export class IngresarJuego implements OnInit {
//   private fb = inject(FormBuilder);
//   private svc = inject(Service);

//   constructor(private service: Service, private router: Router) {}

//   fases = [
//   'Fase de Grupos',
//   'Eliminatoria 32',
//   'Octavos de Final',
//   'Cuartos de Final',
//   'Semifinal',
//   'Final',
// ] as const;

//   equipos: Equipo[] = [];
//   loading = false;
//   errorMsg: string | null = null;

//   form = this.fb.group({
//     visitante: ['', Validators.required],
//     local: ['', Validators.required],
//     fase: ['', Validators.required],
//     fecha: [null as Date | null, Validators.required],
//     hora:  ['', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)]],
//   }, { validators: [distintos] });

//   ngOnInit(): void {
//     this.svc.getEquipos().subscribe({
//       next: (eqs) => this.equipos = eqs ?? [],
//       error: (e) => this.errorMsg = e?.message || 'No fue posible cargar equipos',
//     });
//   }

//   get f() { return this.form.controls; }

//   onFechaTyped(e: Event) {
//     const v = (e.target as HTMLInputElement).value;
//     const d = this.parseYYYYMMDD(v);
//     if (d) this.form.get('fecha')?.setValue(d);
//   }

//   onFechaPicked(e: MatDatepickerInputEvent<Date>) {
//     const d = e.value ?? null;
//     this.form.get('fecha')?.setValue(d);
//   }

//   async guardar() {
//     if (this.form.invalid || this.loading) {
//       this.form.markAllAsTouched();
//       return;
//     }
//     this.loading = true;
//     this.errorMsg = null;

//     const { visitante, local, fase, fecha, hora } = this.form.value;

//     try {
//       const fechaStr = this.formatYYYYMMDD(fecha as Date);

//       await firstValueFrom(this.svc.crearJuego({
//         visitante: String(visitante),
//         local: String(local),
//         fase: String(fase),
//         fecha: fechaStr,
//         hora: String(hora),
//       }));

//       this.form.reset();
//     } catch (err: any) {
//       this.errorMsg = err?.message || 'No fue posible crear el juego';
//     } finally {
//       this.loading = false;
//     }
//   }

//   private parseYYYYMMDD(s: string): Date | null {
//     if (!s) return null;
//     const clean = s.trim().replace(/-/g, '/');
//     const m = clean.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
//     if (!m) return null;
//     const y = +m[1], mo = +m[2], d = +m[3];
//     if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
//     const dt = new Date(y, mo - 1, d);
//     return (dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d) ? dt : null;
//   }

//   private formatYYYYMMDD(date: Date): string {
//     const y = date.getFullYear();
//     const m = String(date.getMonth() + 1).padStart(2, '0');
//     const d = String(date.getDate()).padStart(2, '0');
//     return `${y}/${m}/${d}`;
//   }
    
//   logout(): void {
//     this.service.logout();
//     this.router.navigate(['/login']);
//   }  


// }
