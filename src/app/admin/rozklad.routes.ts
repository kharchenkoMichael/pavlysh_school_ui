import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';

/**
 * Маршрути адмінки розкладу.
 *
 * Точка входу лінива (`loadChildren` у `app.routes.ts`), і всередині теж
 * усе через `loadComponent`: адмінка не має потрапляти в бандл, який
 * отримує кожен відвідувач сайту школи.
 *
 * Сторінка входу — поза охоронцем, інакше нікуди буде зайти.
 */
export const rozkladRoutes: Routes = [
  {
    path: 'vhid',
    loadComponent: () => import('./pages/login/login.component')
      .then(m => m.LoginComponent),
    data: { title: 'Вхід — розклад' },
  },
  {
    path: '',
    loadComponent: () => import('./pages/layout/layout.component')
      .then(m => m.LayoutComponent),
    canActivate: [adminGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'ohliad' },
      {
        path: 'roky',
        loadComponent: () => import('./pages/roky/roky.component')
          .then(m => m.RokyComponent),
        data: { title: 'Навчальні роки — розклад' },
      },
      {
        path: 'ohliad',
        loadComponent: () => import('./pages/dashboard/dashboard.component')
          .then(m => m.DashboardComponent),
        data: { title: 'Огляд — розклад' },
      },
      {
        path: 'vchyteli',
        loadComponent: () => import('./pages/vchyteli/vchyteli.component')
          .then(m => m.VchyteliComponent),
        data: { title: 'Учителі — розклад' },
      },
      {
        path: 'klasy',
        loadComponent: () => import('./pages/klasy/klasy.component')
          .then(m => m.KlasyComponent),
        data: { title: 'Класи — розклад' },
      },
      {
        path: 'kabinety',
        loadComponent: () => import('./pages/kabinety/kabinety.component')
          .then(m => m.KabinetyComponent),
        data: { title: 'Кабінети — розклад' },
      },
      {
        path: 'predmety',
        loadComponent: () => import('./pages/predmety/predmety.component')
          .then(m => m.PredmetyComponent),
        data: { title: 'Предмети — розклад' },
      },
      {
        path: 'navantazhennia',
        loadComponent: () => import('./pages/navantazhennia/navantazhennia.component')
          .then(m => m.NavantazhenniaComponent),
        data: { title: 'Навантаження — розклад' },
      },
      {
        path: 'pravyla',
        loadComponent: () => import('./pages/pravyla/pravyla.component')
          .then(m => m.PravylaComponent),
        data: { title: 'Правила — розклад' },
      },
      {
        path: 'zapusk',
        loadComponent: () => import('./pages/zapusk/zapusk.component')
          .then(m => m.ZapuskComponent),
        data: { title: 'Розрахунок — розклад' },
      },
      {
        // id у адресі навмисно: розрахунок триває хвилини, і випадковий F5
        // не має його загубити
        path: 'rezultat/:id',
        loadComponent: () => import('./pages/rezultat/rezultat.component')
          .then(m => m.RezultatComponent),
        data: { title: 'Результат — розклад' },
      },
    ],
  },
];
