import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ParticipanteDialog } from '../participante-dialog/participante-dialog';
import { ParticipantesService, Participante } from '../../services/participantes';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,    
    MatCardModule,
    MatDividerModule,
    MatTableModule,
    AsyncPipe, 
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})

export class Home {
  
  displayedColumns: string[] = ['nombre', 'puntaje'];
  participantes$: Observable<Participante[]>;

  
  constructor(private participantesService: ParticipantesService, private dialog: MatDialog) {
    this.participantes$ = this.participantesService.getParticipantesConPuntaje();
  }

  abrirDetalleParticipante(participante: Participante): void {
    this.dialog.open(ParticipanteDialog, {
      width: 'auto',
      maxWidth: '90vw',
      data: participante,
      panelClass: 'participante-dialog-panel'
    });
  }
}







// import { Component } from '@angular/core';
// import { MatCardModule } from '@angular/material/card';
// import { MatDividerModule } from '@angular/material/divider';
// import { MatTableModule } from '@angular/material/table';
// import { CommonModule } from '@angular/common';
// import { AsyncPipe } from '@angular/common';
// import { Observable } from 'rxjs';
// import { Service, Participante } from '../../services/data';
// import { MatIconModule } from '@angular/material/icon';

// @Component({
//   selector: 'app-home',
//   standalone: true,
//   imports: [
//     CommonModule,    
//     MatCardModule,
//     MatDividerModule,
//     MatTableModule ,
//     AsyncPipe, 
//     MatIconModule
//   ],
//   templateUrl: './home.html',
//   styleUrls: ['./home.css']
// })

// export class Home {
  
//   displayedColumns: string[] = ['nombre', 'puntaje'];
//   participantes$: Observable<Participante[]>;

  
//   constructor(private service: Service) {

//     this.participantes$ = this.service.getParticipantesConPuntaje();
//   }


// }


