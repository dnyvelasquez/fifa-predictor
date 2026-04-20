import { Component, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { JuegosService, Juego, GrupoJuegos } from '../../services/juegos';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, of, map } from 'rxjs';
import { CommonModule } from '@angular/common';
import { takeUntil, catchError, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-juegos',
  standalone: true,
  imports: [
    MatCardModule,
    MatDividerModule,
    MatTableModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    CommonModule
  ],
  templateUrl: './juegos.html',
  styleUrls: ['./juegos.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Juegos implements OnDestroy {
  
  juegosAgrupados: GrupoJuegos[] = [];
  currentWeekId: number | null = null;
  minWeek: number | null = null;
  maxWeek: number | null = null;
  loading = true;
  
  private destroy$ = new Subject<void>();
  private juegosService = inject(JuegosService);
  private cdr = inject(ChangeDetectorRef);
  
  constructor() {
    this.loadInitialData();
  }
  
  private loadInitialData(): void {
    this.loading = true;
    
    this.juegosService.getExtremosSemanas().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (lim) => {
        this.minWeek = lim.min;
        this.maxWeek = lim.max;
        
        this.juegosService.getSemanaActualId().pipe(
          takeUntil(this.destroy$)
        ).subscribe({
          next: (sem) => {
            this.currentWeekId = sem ?? this.minWeek ?? null;
            if (this.currentWeekId !== null) {
              this.loadGames();
            } else {
              this.loading = false;
              this.cdr.detectChanges();
            }
          },
          error: () => {
            this.currentWeekId = this.minWeek ?? null;
            if (this.currentWeekId !== null) {
              this.loadGames();
            } else {
              this.loading = false;
              this.cdr.detectChanges();
            }
          }
        });
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
  
  private loadGames(): void {
    if (this.currentWeekId === null) return;
    
    this.loading = true;
    
    this.juegosService.getJuegosPorSemanaId(this.currentWeekId).pipe(
      map(juegos => this.agruparJuegos(juegos)),
      catchError(() => of([])),
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }),
      takeUntil(this.destroy$)
    ).subscribe(grupos => {
      this.juegosAgrupados = grupos;
    });
  }
  
  private agruparJuegos(juegos: Juego[]): GrupoJuegos[] {
    const gruposMap = new Map<string, {juegos: Juego[], fases: Set<string>}>();        
    
    juegos.forEach(juego => {
      const fecha = juego.fecha;
      if (!gruposMap.has(fecha)) {
        gruposMap.set(fecha, {juegos: [], fases: new Set()});
      }
      const grupo = gruposMap.get(fecha)!;
      grupo.juegos.push(juego);
      if (juego.fase?.trim()) {
        grupo.fases.add(juego.fase);
      }
    });        
    
    return Array.from(gruposMap.entries())
      .map(([fecha, {juegos, fases}]) => ({
        fecha,
        fases: Array.from(fases),
        juegos: juegos.sort((a, b) => a.hora.localeCompare(b.hora))
      }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }
  
  prevWeek(): void {
    if (this.currentWeekId === null || this.currentWeekId <= (this.minWeek ?? 0)) return;
    
    this.loading = true;
    this.juegosService.getSemanaAnteriorId(this.currentWeekId).pipe(
      takeUntil(this.destroy$)
    ).subscribe(id => {
      if (id !== null) {
        this.currentWeekId = id;
        this.loadGames();
      } else {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
  
  nextWeek(): void {
    if (this.currentWeekId === null || this.currentWeekId >= (this.maxWeek ?? 0)) return;
    
    this.loading = true;
    this.juegosService.getSemanaSiguienteId(this.currentWeekId).pipe(
      takeUntil(this.destroy$)
    ).subscribe(id => {
      if (id !== null) {
        this.currentWeekId = id;
        this.loadGames();
      } else {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
  
  trackByFecha(index: number, grupo: GrupoJuegos): string {
    return grupo.fecha;
  }
  
  trackByJuegoId(index: number, juego: Juego): string {
    return juego.id;
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
