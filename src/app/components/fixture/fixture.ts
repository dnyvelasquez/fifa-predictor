import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { Observable, Subject, combineLatest, of } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { EquiposService, GrupoEquipos, EquiposEspeciales, Equipo } from '../../services/equipos';

@Component({
  selector: 'app-fixture',
  standalone: true,
  imports: [
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    CommonModule
  ],
  templateUrl: './fixture.html',
  styleUrls: ['./fixture.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Fixture implements OnInit, OnDestroy {
  
  grupos: GrupoEquipos[] = [];
  especiales: EquiposEspeciales | null = null;
  loading = true;
  error: string | null = null;
  
  private destroy$ = new Subject<void>();
  private equiposService = inject(EquiposService);
  private cdr = inject(ChangeDetectorRef);
  
  ngOnInit(): void {
    this.loadFixture();
  }
  
  private loadFixture(): void {
    this.loading = true;
    this.error = null;
    
    combineLatest({
      grupos: this.equiposService.cargarEquipos(),
      especiales: this.equiposService.cargarEquiposEspeciales()
    }).pipe(
      catchError(err => {
        console.error('Error loading fixture:', err);
        this.error = 'Error al cargar el fixture. Por favor, intenta de nuevo.';
        return of({ grupos: [], especiales: null });
      }),
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result) => {
        this.grupos = result.grupos.map(grupo => ({
          ...grupo,
          equipos: [...grupo.equipos].sort((a, b) => this.ordenClasificacion(a) - this.ordenClasificacion(b))
        }));
        this.especiales = result.especiales;
      }
    });
  }

  private ordenClasificacion(equipo: Equipo): number {
    if (equipo.e32 === '1') return 0;
    if (equipo.e32 === '2') return 1;
    if (equipo.e32?.startsWith('3-')) return 2;
    return 3;
  }

  claseClasificacion(equipo: Equipo): string {
    if (equipo.e32 === '1') return 'primero-grupo';
    if (equipo.e32 === '2') return 'segundo-grupo';
    if (equipo.e32?.startsWith('3-')) return 'mejor-tercero';
    return '';
  }

  trackByGrupo(index: number, grupo: GrupoEquipos): string {
    return grupo.nombre;
  }

  trackByEquipo(index: number, equipo: any): string {
    return equipo?.id || index.toString();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

