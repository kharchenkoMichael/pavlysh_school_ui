import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Пускати в адмінку лише зі живим сеансом.
 *
 * Це зручність, а не захист: лінивий чанк можна завантажити руками, а
 * маршрут — відкрити напряму. Дані захищає API, який без токена нічого
 * не віддає. Тут ми лише не показуємо порожній екран тому, хто все одно
 * нічого не отримає.
 *
 * Токен перевіряємо на бекенді, а не читаємо з пам'яті: він міг протухнути,
 * поки вкладка лежала відкритою.
 */
export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const toLogin = () => router.createUrlTree(['/rozklad/vhid'], {
    queryParams: { povernutysia: state.url },
  });

  if (!auth.token) {
    return toLogin();
  }

  return auth.check().pipe(
    map(() => true),
    catchError(() => {
      auth.logout();
      return of(toLogin());
    }),
  );
};
