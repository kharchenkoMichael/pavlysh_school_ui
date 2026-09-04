import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Додає токен до запитів у наш API.
 *
 * Саме перехоплювач, а не заголовки в кожному сервісі: інакше про токен
 * доведеться пам'ятати в кожному новому виклику, і забути можна буде
 * рівно один раз — тихо.
 *
 * Стороннім адресам не додаємо нічого: токен не має їздити туди, куди
 * його не просили.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthService).token;
  if (!token || !request.url.startsWith(environment.apiUrl)) {
    return next(request);
  }
  return next(request.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  }));
};
