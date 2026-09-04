import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Token, User } from '../models/rozklad.models';

/**
 * Вхід в адмінку.
 *
 * Токен лежить у sessionStorage, а не в localStorage: він має пережити
 * перезавантаження сторінки (розрахунок триває хвилини, і губити його
 * через випадковий F5 не можна), але не має лишатися у браузері після
 * закриття вкладки на чужому комп'ютері.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'rozklad.token';
  private readonly USER_KEY = 'rozklad.user';

  private readonly _user = signal<User | null>(this.restoreUser());
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);

  constructor(private http: HttpClient) {}

  get token(): string | null {
    return sessionStorage.getItem(this.TOKEN_KEY);
  }

  login(username: string, password: string): Observable<Token> {
    return this.http
      .post<Token>(`${environment.apiUrl}/auth/login`, { username, password })
      .pipe(tap(token => this.remember(token)));
  }

  logout(): void {
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);
    this._user.set(null);
  }

  /** Чи ще живий сеанс — питаємо бекенд, бо токен міг протухнути. */
  check(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/auth/me`)
      .pipe(tap(user => this._user.set(user)));
  }

  changePassword(oldPassword: string, newPassword: string): Observable<User> {
    return this.http.post<User>(`${environment.apiUrl}/auth/password`, {
      old_password: oldPassword,
      new_password: newPassword,
    });
  }

  private remember(token: Token): void {
    sessionStorage.setItem(this.TOKEN_KEY, token.access_token);
    sessionStorage.setItem(this.USER_KEY, JSON.stringify(token.user));
    this._user.set(token.user);
  }

  private restoreUser(): User | null {
    if (!sessionStorage.getItem(this.TOKEN_KEY)) { return null; }
    try {
      return JSON.parse(sessionStorage.getItem(this.USER_KEY) ?? 'null');
    } catch {
      return null;
    }
  }
}
