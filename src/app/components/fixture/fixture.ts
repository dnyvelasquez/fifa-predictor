import { Component } from '@angular/core';
import { Service, Equipo } from '../../services/data';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { Observable, map, forkJoin, of } from 'rxjs';

interface GrupoEquipos {
  nombre: string;
  equipos: Equipo[];
}

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
  equiposAgrupados$!: Observable<GrupoEquipos[]>;
  equiposEspeciales$!: Observable<{
    unoA: Equipo | null;
    unoB: Equipo | null;
    unoC: Equipo | null;
    unoD: Equipo | null;
    unoE: Equipo | null;
    unoF: Equipo | null;
    unoG: Equipo | null;
    unoH: Equipo | null;
    unoI: Equipo | null;
    unoJ: Equipo | null;
    unoK: Equipo | null;
    unoL: Equipo | null;
    dosA: Equipo | null;
    dosB: Equipo | null;
    dosC: Equipo | null;
    dosD: Equipo | null;
    dosE: Equipo | null;
    dosF: Equipo | null;
    dosG: Equipo | null;
    dosH: Equipo | null;
    dosI: Equipo | null;
    dosJ: Equipo | null;
    dosK: Equipo | null;
    dosL: Equipo | null;
    tresUno: Equipo | null;
    tresDos: Equipo | null;
    tresTres: Equipo | null;
    tresCuatro: Equipo | null;
    tresCinco: Equipo | null;
    tresSeis: Equipo | null;
    tresSiete: Equipo | null;
    tresOcho: Equipo | null;
    o1: Equipo | null;
    o2: Equipo | null;
    o3: Equipo | null;
    o4: Equipo | null;
    o5: Equipo | null;
    o6: Equipo | null;
    o7: Equipo | null;
    o8: Equipo | null;
    o9: Equipo | null;
    o10: Equipo | null;
    o11: Equipo | null;
    o12: Equipo | null;
    o13: Equipo | null;
    o14: Equipo | null;
    o15: Equipo | null;
    o16: Equipo | null;
    c1: Equipo | null;
    c2: Equipo | null;
    c3: Equipo | null;
    c4: Equipo | null;
    c5: Equipo | null;
    c6: Equipo | null;
    c7: Equipo | null;
    c8: Equipo | null;
    s1: Equipo | null;
    s2: Equipo | null;
    s3: Equipo | null;
    s4: Equipo | null;
    f1: Equipo | null;
    f2: Equipo | null;
  }>;
  gruposOrdenados = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

  constructor(private service: Service) {
    this.cargarEquipos();
    this.cargarEquiposEspeciales();
  }

  cargarEquipos() {
    this.equiposAgrupados$ = this.service.getEquipos().pipe(
      map(equipos => {
        // Agrupar equipos por grupo
        const gruposMap = new Map<string, Equipo[]>();
        
        equipos.forEach(equipo => {
          const grupo = equipo.grupo;
          if (!gruposMap.has(grupo)) {
            gruposMap.set(grupo, []);
          }
          gruposMap.get(grupo)!.push(equipo);
        });
        
        return Array.from(gruposMap.entries())
          .map(([nombre, equipos]) => ({
            nombre,
            equipos: equipos
          }))
          .sort((a, b) => {
            const indexA = this.gruposOrdenados.indexOf(a.nombre);
            const indexB = this.gruposOrdenados.indexOf(b.nombre);
            return indexA - indexB;
          });
      })
    );
  }
  cargarEquiposEspeciales() {
    this.equiposEspeciales$ = this.service.getEquipos().pipe(
      map(equipos => {
                
        //Primeros lugares
        // Buscar equipo del grupo A con e32 = "1"
        const unoA = equipos.find(equipo => {
          const condicion = equipo.grupo === 'A' && equipo.e32 === '1';
          return condicion;
        }) || null;
        // Buscar equipo del grupo B con e32 = "1"
        const unoB = equipos.find(equipo => {
          const condicion = equipo.grupo === 'B' && equipo.e32 === '1';
          return condicion;
        }) || null;
        // Buscar equipo del grupo C con e32 = "1"
        const unoC = equipos.find(equipo => {
          const condicion = equipo.grupo === 'C' && equipo.e32 === '1';
          return condicion;
        }) || null;
        // Buscar equipo del grupo D con e32 = "1"
        const unoD = equipos.find(equipo => {
          const condicion = equipo.grupo === 'D' && equipo.e32 === '1';
          return condicion;
        }) || null;
        // Buscar equipo del grupo E con e32 = "1"
        const unoE = equipos.find(equipo => {
          const condicion = equipo.grupo === 'E' && equipo.e32 === '1';
          return condicion;
        }) || null;
        // Buscar equipo del grupo F con e32 = "1"
        const unoF = equipos.find(equipo => {
          const condicion = equipo.grupo === 'F' && equipo.e32 === '1';
          return condicion;
        }) || null;
        // Buscar equipo del grupo G con e32 = "1"
        const unoG = equipos.find(equipo => {
          const condicion = equipo.grupo === 'G' && equipo.e32 === '1';
          return condicion;
        }) || null;
        // Buscar equipo del grupo H con e32 = "1"
        const unoH = equipos.find(equipo => {
          const condicion = equipo.grupo === 'H' && equipo.e32 === '1';
          return condicion;
        }) || null;
        // Buscar equipo del grupo I con e32 = "1"
        const unoI = equipos.find(equipo => {
          const condicion = equipo.grupo === 'I' && equipo.e32 === '1';
          return condicion;
        }) || null;
        // Buscar equipo del grupo J con e32 = "1"
        const unoJ = equipos.find(equipo => {
          const condicion = equipo.grupo === 'J' && equipo.e32 === '1';
          return condicion;
        }) || null;
        // Buscar equipo del grupo K con e32 = "1"
        const unoK = equipos.find(equipo => {
          const condicion = equipo.grupo === 'K' && equipo.e32 === '1';
          return condicion;
        }) || null;
        // Buscar equipo del grupo L con e32 = "1"
        const unoL = equipos.find(equipo => {
          const condicion = equipo.grupo === 'L' && equipo.e32 === '1';
          return condicion;
        }) || null;

        //Segundos lugares
        // Buscar equipo del grupo A con e32 = "2"
        const dosA = equipos.find(equipo => {
          const condicion = equipo.grupo === 'A' && equipo.e32 === '2';
          return condicion;
        }) || null;
        // Buscar equipo del grupo B con e32 = "2"
        const dosB = equipos.find(equipo => {
          const condicion = equipo.grupo === 'B' && equipo.e32 === '2';
          return condicion;
        }) || null;
        // Buscar equipo del grupo C con e32 = "2"
        const dosC = equipos.find(equipo => {
          const condicion = equipo.grupo === 'C' && equipo.e32 === '2';
          return condicion;
        }) || null;
        // Buscar equipo del grupo D con e32 = "2"
        const dosD = equipos.find(equipo => {
          const condicion = equipo.grupo === 'D' && equipo.e32 === '2';
          return condicion;
        }) || null;
        // Buscar equipo del grupo E con e32 = "2"
        const dosE = equipos.find(equipo => {
          const condicion = equipo.grupo === 'E' && equipo.e32 === '2';
          return condicion;
        }) || null;
        // Buscar equipo del grupo F con e32 = "2"
        const dosF = equipos.find(equipo => {
          const condicion = equipo.grupo === 'F' && equipo.e32 === '2';
          return condicion;
        }) || null;
        // Buscar equipo del grupo G con e32 = "2"
        const dosG = equipos.find(equipo => {
          const condicion = equipo.grupo === 'G' && equipo.e32 === '2';
          return condicion;
        }) || null;
        // Buscar equipo del grupo H con e32 = "2"
        const dosH = equipos.find(equipo => {
          const condicion = equipo.grupo === 'H' && equipo.e32 === '2';
          return condicion;
        }) || null;
        // Buscar equipo del grupo I con e32 = "2"
        const dosI = equipos.find(equipo => {
          const condicion = equipo.grupo === 'I' && equipo.e32 === '2';
          return condicion;
        }) || null;
        // Buscar equipo del grupo J con e32 = "2"
        const dosJ = equipos.find(equipo => {
          const condicion = equipo.grupo === 'J' && equipo.e32 === '2';
          return condicion;
        }) || null;
        // Buscar equipo del grupo K con e32 = "2"
        const dosK = equipos.find(equipo => {
          const condicion = equipo.grupo === 'K' && equipo.e32 === '2';
          return condicion;
        }) || null;
        // Buscar equipo del grupo L con e32 = "2"
        const dosL = equipos.find(equipo => {
          const condicion = equipo.grupo === 'L' && equipo.e32 === '2';
          return condicion;
        }) || null;

        //Mejores terceros
        // Buscar cualquier equipo con e32 = "3-1"
        const tresUno = equipos.find(equipo => {
          const condicion = equipo.e32 === '3-1';
          return condicion;
        }) || null;                
        // Buscar cualquier equipo con e32 = "3-2"
        const tresDos = equipos.find(equipo => {
          const condicion = equipo.e32 === '3-2';
          return condicion;
        }) || null;
        // Buscar cualquier equipo con e32 = "3-3"
        const tresTres = equipos.find(equipo => {
          const condicion = equipo.e32 === '3-3';
          return condicion;
        }) || null;
        // Buscar cualquier equipo con e32 = "3-4"
        const tresCuatro = equipos.find(equipo => {
          const condicion = equipo.e32 === '3-4';
          return condicion;
        }) || null;
        // Buscar cualquier equipo con e32 = "3-5"
        const tresCinco = equipos.find(equipo => {
          const condicion = equipo.e32 === '3-5';
          return condicion;
        }) || null;
        // Buscar cualquier equipo con e32 = "3-6"
        const tresSeis = equipos.find(equipo => {
          const condicion = equipo.e32 === '3-6';
          return condicion;
        }) || null;
        // Buscar cualquier equipo con e32 = "3-7"
        const tresSiete = equipos.find(equipo => {
          const condicion = equipo.e32 === '3-7';
          return condicion;
        }) || null;
        // Buscar cualquier equipo con e32 = "3-8"
        const tresOcho = equipos.find(equipo => {
          const condicion = equipo.e32 === '3-8';
          return condicion;
        }) || null;

        // Octavos de final
        // Equipo 1
        const o1 = equipos.find(equipo => {
          const condicion = equipo.of === '1';
          return condicion;
        }) || null;
        // Equipo 2
        const o2 = equipos.find(equipo => {
          const condicion = equipo.of === '2';
          return condicion;
        }) || null;
        // Equipo 3
        const o3 = equipos.find(equipo => {
          const condicion = equipo.of === '3';
          return condicion;
        }) || null;
        // Equipo 4
        const o4 = equipos.find(equipo => {
          const condicion = equipo.of === '4';
          return condicion;
        }) || null;
        // Equipo 5
        const o5 = equipos.find(equipo => {
          const condicion = equipo.of === '5';
          return condicion;
        }) || null;
        // Equipo 6
        const o6 = equipos.find(equipo => {
          const condicion = equipo.of === '6';
          return condicion;
        }) || null;
        // Equipo 7
        const o7 = equipos.find(equipo => {
          const condicion = equipo.of === '7';
          return condicion;
        }) || null;
        // Equipo 8
        const o8 = equipos.find(equipo => {
          const condicion = equipo.of === '8';
          return condicion;
        }) || null;
        // Equipo 9
        const o9 = equipos.find(equipo => {
          const condicion = equipo.of === '9';
          return condicion;
        }) || null;
        // Equipo 10
        const o10 = equipos.find(equipo => {
          const condicion = equipo.of === '10';
          return condicion;
        }) || null;
        // Equipo 11
        const o11 = equipos.find(equipo => {
          const condicion = equipo.of === '11';
          return condicion;
        }) || null;
        // Equipo 12
        const o12 = equipos.find(equipo => {
          const condicion = equipo.of === '12';
          return condicion;
        }) || null;
        // Equipo 13
        const o13 = equipos.find(equipo => {
          const condicion = equipo.of === '13';
          return condicion;
        }) || null;
        // Equipo 14
        const o14 = equipos.find(equipo => {
          const condicion = equipo.of === '14';
          return condicion;
        }) || null;
        // Equipo 15
        const o15 = equipos.find(equipo => {
          const condicion = equipo.of === '15';
          return condicion;
        }) || null;
        // Equipo 16
        const o16 = equipos.find(equipo => {
          const condicion = equipo.of === '16';
          return condicion;
        }) || null;

        // Cuartos de final
        // Equipo 1
        const c1 = equipos.find(equipo => {
          const condicion = equipo.cf === '1';
          return condicion;
        }) || null;
        // Equipo 2
        const c2 = equipos.find(equipo => {
          const condicion = equipo.cf === '2';
          return condicion;
        }) || null;
        // Equipo 3
        const c3 = equipos.find(equipo => {
          const condicion = equipo.cf === '3';
          return condicion;
        }) || null;
        // Equipo 4
        const c4 = equipos.find(equipo => {
          const condicion = equipo.cf === '4';
          return condicion;
        }) || null;
        // Equipo 5
        const c5 = equipos.find(equipo => {
          const condicion = equipo.cf === '5';
          return condicion;
        }) || null;
        // Equipo 6
        const c6 = equipos.find(equipo => {
          const condicion = equipo.cf === '6';
          return condicion;
        }) || null;
        // Equipo 7
        const c7 = equipos.find(equipo => {
          const condicion = equipo.cf === '7';
          return condicion;
        }) || null;
        // Equipo 8
        const c8 = equipos.find(equipo => {
          const condicion = equipo.cf === '8';
          return condicion;
        }) || null;
        
        // Semifinal
        // Equipo 1
        const s1 = equipos.find(equipo => {
          const condicion = equipo.sf === '1';
          return condicion;
        }) || null;
        // Equipo 2
        const s2 = equipos.find(equipo => {
          const condicion = equipo.sf === '2';
          return condicion;
        }) || null;
        // Equipo 3
        const s3 = equipos.find(equipo => {
          const condicion = equipo.sf === '3';
          return condicion;
        }) || null;
        // Equipo 4
        const s4 = equipos.find(equipo => {
          const condicion = equipo.sf === '4';
          return condicion;
        }) || null;

        // Gran Final
        // Equipo 1
        const f1 = equipos.find(equipo => {
          const condicion = equipo.gf === '1';
          return condicion;
        }) || null;
        // Equipo 2
        const f2 = equipos.find(equipo => {
          const condicion = equipo.gf === '2';
          return condicion;
        }) || null;

        return { 
          unoA, 
          unoB, 
          unoC, 
          unoD, 
          unoE, 
          unoF, 
          unoG, 
          unoH, 
          unoI, 
          unoJ, 
          unoK, 
          unoL, 
          dosA, 
          dosB, 
          dosC, 
          dosD, 
          dosE, 
          dosF, 
          dosG, 
          dosH, 
          dosI, 
          dosJ, 
          dosK, 
          dosL, 
          tresUno, 
          tresDos,
          tresTres, 
          tresCuatro, 
          tresCinco, 
          tresSeis, 
          tresSiete, 
          tresOcho,
          o1, 
          o2,
          o3,
          o4,
          o5,
          o6,
          o7,
          o8,
          o9,
          o10,
          o11,
          o12,
          o13,
          o14,
          o15,
          o16,
          c1, 
          c2,
          c3,
          c4,
          c5,
          c6,
          c7,
          c8,
          s1, 
          s2,
          s3,
          s4,
          f1, 
          f2,          
        };
      })
    );
  }
  
}

