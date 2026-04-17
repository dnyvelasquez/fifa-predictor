import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { EquiposService, GrupoEquipos, EquiposEspeciales } from '../../services/equipos';

@Component({
  selector: 'app-fixture',
  standalone: true,
  imports: [
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatButtonModule,
    CommonModule
  ],
  templateUrl: './fixture.html',
  styleUrls: ['./fixture.css'],
})

export class Fixture {
  
  grupoEquipos$: Observable<GrupoEquipos[]>;
  equiposEspeciales$: Observable<EquiposEspeciales>;
  
  constructor(private equiposService: EquiposService) {

    this.grupoEquipos$ = this.equiposService.cargarEquipos();
    this.equiposEspeciales$ = this.equiposService.cargarEquiposEspeciales();
    
  }
  
}

