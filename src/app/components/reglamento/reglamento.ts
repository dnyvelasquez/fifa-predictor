import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-reglamento',
  standalone: true,
  imports: [
    MatCardModule,
    MatDividerModule,
    MatTableModule
  ],
  templateUrl: './reglamento.html',
  styleUrls: ['./reglamento.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Reglamento {}

