import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { AuthService } from '../../services/auth/auth';
import { EquiposService, Equipo } from '../../services/equipos';
import { ParticipantesService } from '../../services/participantes';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-puntajes',
  standalone: true,
  imports: [
    MatCardModule,
    MatDividerModule,
    MatTableModule,
    AsyncPipe,
    CommonModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule
  ],
  templateUrl: './puntajes.html',
  styleUrls: ['./puntajes.css']
})
export class Puntajes {

  equipos$: Observable<Equipo[]>;

  constructor(
    private authService: AuthService, 
    private equiposService: EquiposService,
    private participantesService: ParticipantesService,
    private router: Router 
  ) {

    this.equipos$ = this.equiposService.getEquipos(); 

  }

  guardarPuntos(equipo: Equipo) {
    this.equiposService.actualizarPuntaje(equipo.id, equipo.pg, equipo.pe, equipo.pp, equipo.p32, equipo.po, equipo.pc, equipo.ps, equipo.pf)
      .subscribe({
        next: () => alert(`Puntaje actualizado para ${equipo.nombre}`),
        error: () => alert('Error al actualizar puntaje:')
      });
  }
  
  acumular() {
    const ok = confirm('¿Sumar el puntaje de cada equipo al "acumulado" de su participante?');
    if (!ok) return;

    this.participantesService.acumularPuntajesEnParticipantes().subscribe({
      next: (r: any) => {
        alert(`Acumulado actualizado (${r?.updated ?? 0} participante(s)).`);
        this.equipos$ = this.equiposService.getEquipos();
      },
      error: (e) => alert('Error al acumular: ' + (e?.message || ''))
    });
  }

  resetPuntajes() {
    const ok = confirm('¿Poner en 0 el puntaje de TODOS los equipos?');
    if (!ok) return;

    this.equiposService.resetPuntajes().subscribe({
      next: () => {
        this.equipos$ = this.equiposService.getEquipos();
        alert('Puntajes reiniciados a 0');
      },
      error: (e) => alert('Error al resetear puntajes: ' + (e?.message || ''))
    });
  }

  resetAcumulados() {
    const ok = confirm('¿Poner en 0 el puntaje de TODOS los acumulados?');
    if (!ok) return;

    this.participantesService.resetAcumulados().subscribe({
      next: () => {         
        alert('Acumulados reiniciados a 0');
      },
      error: (e) => alert('Error al resetear acumulados: ' + (e?.message || ''))
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }  

}
