import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../../services/auth/auth';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,    
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatToolbarModule,
    RouterModule
  ],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Admin {
  
  private authService = inject(AuthService);
  private router = inject(Router);
  
  readonly menuItems = [
    { path: '/puntajes', icon: 'leaderboard', label: 'Puntajes' },
    { path: '/ingresar-juego', icon: 'sports_soccer', label: 'Ingresar Juego' },
    { path: '/clasificacion', icon: 'format_list_numbered', label: 'Clasificación' },
    { path: '/participantes', icon: 'people', label: 'Participantes' },
    { path: '/asignacion', icon: 'dashboard_customize', label: 'Asignación' },
    { path: '/nuevo-usuario', icon: 'person_add', label: 'Nuevo Usuario' },
    { path: '/borrar-usuario', icon: 'person_remove', label: 'Borrar Usuario' }
  ];
  
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
  
  trackByPath(index: number, item: { path: string }): string {
    return item.path;
  }
}

// import { Component } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { Router, RouterModule } from '@angular/router';
// import { Injectable } from '@angular/core';
// import { MatCardModule } from '@angular/material/card';
// import { MatDividerModule } from '@angular/material/divider';
// import { MatIconModule } from '@angular/material/icon';
// import { MatButtonModule } from '@angular/material/button';
// import { MatMenuModule } from '@angular/material/menu';
// import { MatToolbarModule } from '@angular/material/toolbar';
// import { AuthService } from '../../services/auth/auth';

// @Injectable({
//   providedIn: 'root'
// })

// @Component({
//   selector: 'app-admin',
//   standalone: true,
//   imports: [
//     CommonModule,    
//     MatCardModule,
//     MatDividerModule,
//     MatIconModule,
//     MatButtonModule,
//     MatMenuModule,
//     MatToolbarModule,
//     RouterModule
//   ],
//   templateUrl: './admin.html',
//   styleUrls: ['./admin.css']
// })

// export class Admin {

//   constructor(private authService: AuthService, private router: Router) {}

//   logout(): void {
//     this.authService.logout();
//     this.router.navigate(['/login']);
//   }  

// }


