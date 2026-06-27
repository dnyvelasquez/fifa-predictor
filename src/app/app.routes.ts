import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Equipos } from './components/equipos/equipos';
import { TablaPuntajes } from './components/tabla-puntajes/tabla-puntajes';
import { Reglamento } from './components/reglamento/reglamento';
import { Fixture } from './components/fixture/fixture';
import { Juegos } from './components/juegos/juegos';
import { Login } from './components/login/login';
import { Admin } from './components/admin/admin';
import { Puntajes } from './components/puntajes/puntajes';
import { IngresarJuego } from './components/ingresar-juego/ingresar-juego';
import { Usuarios } from './components/usuarios/usuarios';
import { Participantes } from './components/participantes/participantes';
import { Asignacion } from './components/asignacion/asignacion';
import { authGuard } from '../app/auth-guard';
import { guestGuard } from './guest-guard';

export const routes: Routes = [
  
  { path: '', component: Home, pathMatch: 'full' }, 
  { path: 'tabla-puntajes', component: TablaPuntajes },
  { path: 'equipos', component: Equipos },
  { path: 'juegos', component: Juegos },
  { path: 'reglamento', component: Reglamento },
  { path: 'fixture', component: Fixture },
  
  { path: 'login', component: Login, canActivate: [guestGuard] },

  { path: 'admin', component: Admin, canActivate: [authGuard] },
  { path: 'puntajes', component: Puntajes, canActivate: [authGuard] },
  { path: 'usuarios', component: Usuarios, canActivate: [authGuard] },
  { path: 'ingresar-juego', component: IngresarJuego, canActivate: [authGuard] },
  { path: 'participantes', component: Participantes, canActivate: [authGuard] },
  { path: 'asignacion', component: Asignacion, canActivate: [authGuard] },

  { path: '**', redirectTo: '' }

];