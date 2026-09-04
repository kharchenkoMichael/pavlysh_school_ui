import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { InUseDetail } from '../models/rozklad.models';

/**
 * Помилка API, придатна до показу людині.
 *
 * `usedBy` заповнюється для 409: бекенд віддає не просто «не можна»,
 * а список, де саме запис використовується. Ковтати його не можна —
 * саме він пояснює, чому видалення заборонено.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly usedBy: string[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isConflict(): boolean { return this.status === 409; }
  get isAuth(): boolean { return this.status === 401; }
}

/**
 * Базовий шар над HttpClient: адреса, параметри, єдина обробка помилок.
 *
 * Токен додає перехоплювач (`auth.interceptor.ts`), тут про нього нічого
 * не знають.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  get<T>(path: string, params?: Record<string, any>): Observable<T> {
    return this.http.get<T>(this.url(path), { params: this.params(params) })
      .pipe(catchError(this.explain));
  }

  getText(path: string): Observable<string> {
    return this.http.get(this.url(path), { responseType: 'text' })
      .pipe(catchError(this.explain));
  }

  post<T>(path: string, body?: any, params?: Record<string, any>): Observable<T> {
    return this.http.post<T>(this.url(path), body ?? {}, { params: this.params(params) })
      .pipe(catchError(this.explain));
  }

  patch<T>(path: string, body: any): Observable<T> {
    return this.http.patch<T>(this.url(path), body).pipe(catchError(this.explain));
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.url(path)).pipe(catchError(this.explain));
  }

  private url(path: string): string {
    return `${this.base}${path.startsWith('/') ? path : '/' + path}`;
  }

  private params(source?: Record<string, any>): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(source ?? {})) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return params;
  }

  /** HTTP-помилка → зрозумілий людині текст. */
  private explain = (error: HttpErrorResponse) => {
    if (error.status === 0) {
      return throwError(() => new ApiError(
        0, 'Немає зв\'язку з сервером. Перевір, чи він запущений.'));
    }

    const detail = error.error?.detail;

    if (error.status === 409 && detail && typeof detail === 'object') {
      const conflict = detail as InUseDetail;
      return throwError(() => new ApiError(
        409, conflict.message ?? 'Запис використовується.', conflict.used_by ?? []));
    }

    // 422 від FastAPI — масив із полем і причиною
    if (Array.isArray(detail)) {
      const text = detail
        .map(item => `${(item.loc ?? []).slice(1).join('.')}: ${item.msg}`)
        .join('; ');
      return throwError(() => new ApiError(error.status, text || 'Дані не пройшли перевірку.'));
    }

    const message = typeof detail === 'string' ? detail
      : error.status === 401 ? 'Потрібен вхід.'
      : error.status === 404 ? 'Не знайдено.'
      : `Помилка ${error.status}.`;
    return throwError(() => new ApiError(error.status, message));
  };
}
