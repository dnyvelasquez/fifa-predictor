import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { EquiposService, Equipo } from '../../services/equipos';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth/auth';

@Component({
  selector: 'app-clasificacion',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    RouterModule,
    MatMenuModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './clasificacion.html',
  styleUrls: ['./clasificacion.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Clasificacion implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private equiposService = inject(EquiposService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  equipos = signal<Equipo[]>([]);
  loading = signal(true);
  message = signal<{ text: string; type: 'success' | 'error' } | null>(null);

  gruposAgrupados = computed(() => {
    const gruposMap = new Map<string, Equipo[]>();
    this.equipos().forEach(equipo => {
      if (!gruposMap.has(equipo.grupo)) {
        gruposMap.set(equipo.grupo, []);
      }
      gruposMap.get(equipo.grupo)!.push(equipo);
    });

    return Array.from(gruposMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([grupo, equipos]) => ({ grupo, equipos }));
  });

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading.set(true);

    try {
      const equipos = await firstValueFrom(
        this.equiposService.getEquipos().pipe(
          catchError(error => {
            console.error('Error fetching equipos:', error);
            this.showMessage('Error al cargar los equipos', 'error');
            return of([]);
          })
        )
      );

      const sortedEquipos = [...equipos].sort((a, b) => {
        if (a.grupo === b.grupo) {
          return a.id.localeCompare(b.id);
        }
        return a.grupo.localeCompare(b.grupo);
      });

      this.equipos.set(sortedEquipos);

    } catch (error) {
      console.error('Error loading data:', error);
      this.showMessage('Error al cargar los datos', 'error');
    } finally {
      this.loading.set(false);
      this.cdr.detectChanges();
    }
  }

  showMessage(text: string, type: 'success' | 'error'): void {
    this.message.set({ text, type });
    setTimeout(() => {
      this.message.set(null);
      this.cdr.detectChanges();
    }, 3000);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  trackByEquipoId(index: number, equipo: Equipo): string {
    return equipo.id;
  }

  trackByGrupo(index: number, grupo: { grupo: string; equipos: Equipo[] }): string {
    return grupo.grupo;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
