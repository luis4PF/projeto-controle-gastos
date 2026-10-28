import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ACCESS_TOKEN_KEY, USER_JSON_KEY } from '../constants/storage-keys';
import { AuthResponse, LoginRequest, User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly tokenSignal = signal<string | null>(this.readToken());
  private readonly userSignal = signal<User | null>(this.readUser());

  readonly accessToken = this.tokenSignal.asReadonly();
  readonly currentUser = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.tokenSignal());

  login(body: LoginRequest): Observable<User> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, body)
      .pipe(
        tap((res) => this.persist(res.accessToken, res.user)),
        map((res) => res.user),
        catchError((e) => throwError(() => e))
      );
  }

  loadProfile(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/auth/me`).pipe(
      tap((user) => {
        this.userSignal.set(user);
        sessionStorage.setItem(USER_JSON_KEY, JSON.stringify(user));
      })
    );
  }

  logout(): void {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(USER_JSON_KEY);
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    void this.router.navigateByUrl('/login');
  }

  private persist(token: string, user: User): void {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    sessionStorage.setItem(USER_JSON_KEY, JSON.stringify(user));
    this.tokenSignal.set(token);
    this.userSignal.set(user);
  }

  private readToken(): string | null {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  }

  private readUser(): User | null {
    const raw = sessionStorage.getItem(USER_JSON_KEY);
    if (!raw) return null;
    try {
      const u = JSON.parse(raw) as User;
      return u;
    } catch {
      return null;
    }
  }
}
