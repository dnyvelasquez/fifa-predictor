import { Component } from '@angular/core';
import { Service, Juego } from '../../services/data';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { forkJoin, Observable, of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { map } from 'rxjs/operators';

// Definir la interfaz para el grupo
interface GrupoJuegos {
  fecha: string;
  fases: string[];
  juegos: Juego[];
}

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
    CommonModule
],
  templateUrl: './juegos.html',
  styleUrls: ['./juegos.css']
})

export class Juegos  {
  juegos$!: Observable<Juego[]>;
  juegosAgrupados$!: Observable<GrupoJuegos[]>; // Cambiar el tipo
  currentWeekId: number | null = null;
  minWeek: number | null = null;
  maxWeek: number | null = null;

  constructor(private service: Service) {
    forkJoin({
      sem: this.service.getSemanaActualId(),
      lim: this.service.getExtremosSemanas()
    }).subscribe(({ sem, lim }) => {
      this.currentWeekId = sem ?? lim.min ?? null;
      this.minWeek = lim.min;
      this.maxWeek = lim.max;

      if (this.currentWeekId != null) {
        this.juegos$ = this.service.getJuegosPorSemanaId(this.currentWeekId);
        this.setupAgrupacion();
      } else {
        this.juegos$ = of([]);
        this.juegosAgrupados$ = of([]);
      }
    });
  }

  private setupAgrupacion() {
    this.juegosAgrupados$ = this.juegos$.pipe(
      map(juegos => {
        // Agrupar juegos por fecha
        const gruposMap = new Map<string, {juegos: Juego[], fases: Set<string>}>();
        
        juegos.forEach(juego => {
          const fecha = juego.fecha;
          if (!gruposMap.has(fecha)) {
            gruposMap.set(fecha, {juegos: [], fases: new Set()});
          }
          const grupo = gruposMap.get(fecha)!;
          grupo.juegos.push(juego);
          // Agregar la fase al Set si existe
          if (juego.fase && juego.fase.trim()) {
            grupo.fases.add(juego.fase);
          }
        });
        
        // Convertir a array y ordenar por fecha
        return Array.from(gruposMap.entries())
          .map(([fecha, {juegos, fases}]) => ({
            fecha,
            fases: Array.from(fases), // Convertir Set a Array
            juegos: juegos.sort((a, b) => a.hora.localeCompare(b.hora))
          }))
          .sort((a, b) => a.fecha.localeCompare(b.fecha));
      })
    );
  }

  private loadWeek(id: number | null) {
    if (id == null) return;
    this.currentWeekId = id;
    this.juegos$ = this.service.getJuegosPorSemanaId(id);
    this.setupAgrupacion();
  }

  prevWeek() {
    if (this.currentWeekId == null) return;
    this.service.getSemanaAnteriorId(this.currentWeekId).subscribe(id => this.loadWeek(id));
  }

  nextWeek() {
    if (this.currentWeekId == null) return;
    this.service.getSemanaSiguienteId(this.currentWeekId).subscribe(id => this.loadWeek(id));
  }
}

