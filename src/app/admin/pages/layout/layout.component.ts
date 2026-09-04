import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DovidnykyService } from '../../services/dovidnyky.service';
import { Year } from '../../models/rozklad.models';

interface NavItem {
  path: string;
  label: string;
  hint: string;
}

@Component({
  selector: 'app-rozklad-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
})
export class LayoutComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private dovidnyky = inject(DovidnykyService);

  readonly user = this.auth.user;
  readonly menuOpen = signal(false);

  /**
   * Перемикач року — видно на кожній сторінці адмінки.
   *
   * Перемикання — це `activateYear` на бекенді (робить рік поточним),
   * після чого сторінка перезавантажується цілком: усі списки на всіх
   * сторінках фільтруються за «поточним» роком на сервері, а не за
   * параметром в кожному запиті, тож найпростіший спосіб примусити
   * все побачене оновитися — почати наново.
   */
  readonly years = signal<Year[]>([]);
  readonly yearBusy = signal(false);
  // Шаблон не може містити стрілкову функцію (`.find(y => …)`) в біндингу —
  // тому обраний рік рахується тут, а не інлайном у HTML.
  readonly currentYearId = computed(() => this.years().find(y => y.is_current)?.id);

  /**
   * Порядок — за ходом роботи: спершу довідники, потім навантаження,
   * потім правила, і аж тоді запуск. Так само описаний і план.
   */
  readonly nav: NavItem[] = [
    { path: 'roky', label: 'Роки', hint: 'Навчальний рік і перенос' },
    { path: 'ohliad', label: 'Огляд', hint: 'Стан даних перед розрахунком' },
    { path: 'vchyteli', label: 'Учителі', hint: 'Педагоги та їхні побажання' },
    { path: 'klasy', label: 'Класи', hint: 'Паралель, класний керівник, зміна' },
    { path: 'kabinety', label: 'Кабінети', hint: 'Скільки й яких' },
    { path: 'predmety', label: 'Предмети', hint: 'Назви та синоніми' },
    { path: 'navantazhennia', label: 'Навантаження', hint: 'Клас × предмет × учитель' },
    { path: 'pravyla', label: 'Правила', hint: 'Що обов\'язково, що бажано' },
    { path: 'zapusk', label: 'Розрахунок', hint: 'Скласти, оцінити, покращити' },
  ];

  ngOnInit(): void {
    // Публічний сайт лишає під шапку 70px відступу зверху. В адмінці
    // шапки немає, тож і відступ зайвий.
    document.body.classList.add('rozklad-open');
    this.dovidnyky.years().subscribe({
      next: years => this.years.set(years),
      error: () => this.years.set([]),
    });
  }

  setYear(yearId: string): void {
    const id = Number(yearId);
    const year = this.years().find(y => y.id === id);
    if (!year || year.is_current || this.yearBusy()) { return; }
    this.yearBusy.set(true);
    this.dovidnyky.activateYear(id).subscribe({
      // Перезавантаження, а не роут: сторінки фільтрують дані за роком
      // на бекенді, і найнадійніше побачити це — почати наново.
      next: () => window.location.reload(),
      error: () => this.yearBusy.set(false),
    });
  }

  ngOnDestroy(): void {
    document.body.classList.remove('rozklad-open');
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/rozklad/vhid']);
  }

  toggleMenu(): void {
    this.menuOpen.update(open => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
