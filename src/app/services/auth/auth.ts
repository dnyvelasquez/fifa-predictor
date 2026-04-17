import { Injectable } from '@angular/core';
import { Observable, from, of, map, catchError, switchMap, throwError } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { SupabaseClientService } from '../core/supabase-client';

export interface AuthResponse {
  data?: any;
  error?: string;
}

export interface User {
  id: string;
  email: string;
  fullName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private FUNCTION_URL = environment.functionAuthUrl;

  constructor(
    private supabaseClient: SupabaseClientService,
    private http: HttpClient
  ) {
    this.supabaseClient = supabaseClient;
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return from(
      this.supabaseClient.auth().signInWithPassword({ email, password })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          return { error: error.message };
        }
        return { data: data.user };
      })
    );
  }

  logout(): Observable<AuthResponse> {
    return from(this.supabaseClient.auth().signOut()).pipe(
      map(({ error }) => {
        if (error) {
          return { error: error.message };
        }
        return { data: 'Sesión cerrada correctamente' };
      })
    );
  }

  getSession$() {
    return from(this.supabaseClient.auth().getSession()).pipe(
      map(({ data }) => data.session ?? null)
    );
  }

  isAuthenticated$() {
    return this.getSession$().pipe(map((session) => !!session));
  }

  validarUsuario(): Observable<any> {
    return from(this.supabaseClient.auth().getSession()).pipe(
      switchMap((sessionRes) => {
        const token = sessionRes.data.session?.access_token;
        if (!token) {
          return of({ error: 'No hay sesión activa' });
        }
        return this.http.get(this.FUNCTION_URL, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      }),
      catchError(err => of({ error: err.message }))
    );
  }

  createUser(email: string, password: string, fullName?: string) {
    return from(this.supabaseClient.auth().getSession()).pipe(
      switchMap(({ data }) => {
        const token = data.session?.access_token;
        if (!token) return throwError(() => new Error('No autenticado'));

        return this.http.post(
          environment.functionCreateUserUrl,
          { email, password, fullName },
          {
            headers: new HttpHeaders({
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            })
          }
        );
      })
    );
  }

  listUsers(page = 1, perPage = 20, q = '') {
    return from(this.supabaseClient.auth().getSession()).pipe(
      switchMap(({ data }) => {
        const token = data.session?.access_token;
        if (!token) return of({ error: 'No autenticado' });
        const url = `${environment.functionListUsersUrl}?page=${page}&perPage=${perPage}&q=${encodeURIComponent(q)}`;
        return this.callFn(url, { headers: { Authorization: `Bearer ${token}` } });
      }),
      catchError(err => of({ error: err?.message || 'Error listando usuarios' }))
    );
  }

  deleteUser(userId: string) {
    return from(this.supabaseClient.auth().getSession()).pipe(
      switchMap(({ data }) => {
        const token = data.session?.access_token;
        if (!token) return of({ error: 'No autenticado' });
        return this.http.post(
          environment.functionDeleteUserUrl,
          { userId },
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );
      }),
      catchError(err => of({ error: err?.message || 'Error eliminando usuario' }))
    );
  }

  async getAccessToken(): Promise<string | null> {
    const { data } = await this.supabaseClient.auth().getSession();
    return data.session?.access_token || null;
  }

  async refreshSession(): Promise<string | null> {
    const { data } = await this.supabaseClient.auth().refreshSession();
    return data.session?.access_token || null;
  }

  private callFn<T = any>(url: string, init?: RequestInit): Observable<T> {
    return from(this.supabaseClient.auth().getSession()).pipe(
      switchMap(async ({ data }) => {
        let token = data.session?.access_token;
        
        if (!token) {
          await new Promise(r => setTimeout(r, 200));
          token = (await this.supabaseClient.auth().getSession()).data.session?.access_token ?? undefined;
        }
        
        if (!token) {
          throw new Error('No autenticado');
        }

        const headers = new Headers(init?.headers);
        headers.set('Authorization', `Bearer ${token}`);
        if (!headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json');
        }

        const res1 = await fetch(url, { ...init, headers });
        
        if (res1.status !== 401) {
          if (!res1.ok) {
            throw new Error(await res1.text());
          }
          return (await res1.json()) as T;
        }

        const refreshedToken = await this.refreshSession();
        if (!refreshedToken) {
          throw new Error('Sesión expirada');
        }

        const headers2 = new Headers(init?.headers);
        headers2.set('Authorization', `Bearer ${refreshedToken}`);
        if (!headers2.has('Content-Type')) {
          headers2.set('Content-Type', 'application/json');
        }

        const res2 = await fetch(url, { ...init, headers: headers2 });
        if (!res2.ok) {
          throw new Error(await res2.text());
        }
        return (await res2.json()) as T;
      })
    );
  }
}