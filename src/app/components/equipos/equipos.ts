import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AsyncPipe } from '@angular/common';
import { Subject, of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { EquiposService, Equipo } from '../../services/equipos';

@Component({
  selector: 'app-equipos',
  standalone: true,
  imports: [
    MatCardModule,
    MatDividerModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatIconModule,
    CommonModule
  ],
  templateUrl: './equipos.html',
  styleUrls: ['./equipos.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Equipos implements OnInit, OnDestroy {
  
  equipos: Equipo[] = [];
  loading = true;
  error: string | null = null;
  
  private destroy$ = new Subject<void>();
  private equiposService = inject(EquiposService);
  private cdr = inject(ChangeDetectorRef);
  
  ngOnInit(): void {
    this.loadEquipos();
  }
  
  private loadEquipos(): void {
    this.loading = true;
    this.error = null;
    
    this.equiposService.getEquipos().pipe(
      catchError(err => {
        console.error('Error loading equipos:', err);
        this.error = 'Error al cargar los equipos. Por favor, intenta de nuevo.';
        return of([]);
      }),
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }),
      takeUntil(this.destroy$)
    ).subscribe(equipos => {
      this.equipos = equipos.filter(e => {
        const participante = (e.participante ?? '').trim();
        return participante && participante.toLowerCase() !== 'no asignado';
      });
    });
  }
  
  calcularPuntajeEquipo(equipo: Equipo): number {
    return (equipo.pg || 0) * 10 + 
           (equipo.pe || 0) * 5 + 
           (equipo.po || 0) * 20 + 
           (equipo.pc || 0) * 30 + 
           (equipo.ps || 0) * 40 + 
           (equipo.pf || 0) * 50;
  }
  
  trackByEquipoId(index: number, equipo: Equipo): string {
    return equipo.id;
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}




// import { Component } from '@angular/core';
// import { MatCardModule } from '@angular/material/card';
// import { MatDividerModule } from '@angular/material/divider';
// import { MatTableModule } from '@angular/material/table';
// import { AsyncPipe } from '@angular/common';
// import { Observable } from 'rxjs';
// import { CommonModule } from '@angular/common';
// import { EquiposService, Equipo } from '../../services/equipos';


// @Component({
//   selector: 'app-equipos',
//   standalone: true,
//   imports: [
//     MatCardModule,
//     MatDividerModule,
//     MatTableModule,
//     AsyncPipe,
//     CommonModule
//   ], 
//   templateUrl: './equipos.html',
//   styleUrls: ['./equipos.css']
// })

// export class Equipos  {

//   equipos$: Observable<Equipo[]>;

//   constructor(private equiposService: EquiposService) {

//     this.equipos$ = this.equiposService.getEquipos(); 

//   }

// }
