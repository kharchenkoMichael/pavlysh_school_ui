import {
  AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild,
  computed, signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PublicRozkladService } from '../../services/public-rozklad.service';
import { DAYS, DAY_NAMES, DAY_SHORT, Entry, Run } from '../../models/rozklad-perehlyad.models';

/** У якому розрізі дивимось розклад — ті самі три, що і в адмінці. */
export type View = 'groups' | 'teachers' | 'rooms';

const VIEW_LABEL: Record<View, string> = {
  groups: 'Класи', teachers: 'Вчителі', rooms: 'Кабінети',
};

/** Уроки одного тижня циклу в одній клітинці. */
interface WeekPart {
  week: number;
  entries: Entry[];
}

/**
 * Клітинка сітки. `same` каже, чи однакові обидва тижні циклу — коли так,
 * пишеться один рядок без позначок; коли ні, обидва тижні видно окремо,
 * з підписом «чис.»/«знам.».
 */
interface Slot {
  same: boolean;
  weeks: WeekPart[];
}

/** Ключем, що виводимо в сітку одного класу/вчителя/кабінету. */
interface Grid {
  key: string;
  title: string;
  lessons: number[];
  cells: Map<string, Slot>;   // "день:урок" → що тут
}

/**
 * Косметичний пароль сторінки — не авторизація, а фільтр від випадкових
 * відвідувачів. Дані на сторінці — статичний файл (`assets/rozklad-latest.json`),
 * і будь-хто, хто знає адресу файлу, однаково може відкрити його напряму;
 * пароль лише не пускає випадкового відвідувача на саму сторінку.
 */
const PASSWORD = '2026rozklad2027';
const STORAGE_KEY = 'rozklad-perehlyad-vidkryto';

@Component({
  selector: 'app-rozklad-perehlyad',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './rozklad-perehlyad.component.html',
  styleUrls: ['./rozklad-perehlyad.component.scss'],
})
export class RozkladPerehlyadComponent implements OnInit, AfterViewChecked, OnDestroy {
  readonly days = DAYS;
  readonly dayNames = DAY_NAMES;
  readonly dayShort = DAY_SHORT;
  readonly viewLabel = VIEW_LABEL;
  readonly views: View[] = ['groups', 'teachers', 'rooms'];

  readonly unlocked = signal(false);
  readonly passwordDraft = signal('');
  readonly passwordWrong = signal(false);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly run = signal<Run | null>(null);
  readonly entries = signal<Entry[]>([]);

  readonly view = signal<View>('groups');
  /** Порожньо — усі відразу; інакше назва одного класу/вчителя/кабінету. */
  readonly picked = signal<string>('');
  /** Який тиждень циклу показуємо. `0` — обидва разом. */
  readonly week = signal<number>(0);

  readonly weeks = computed(() => Math.max(1, this.run()?.weeks ?? 1));

  constructor(private rozklad: PublicRozkladService) {}

  ngOnInit(): void {
    if (localStorage.getItem(STORAGE_KEY) === '1') {
      this.unlocked.set(true);
      this.load();
    }
  }

  tryUnlock(): void {
    if (this.passwordDraft().trim() === PASSWORD) {
      this.unlocked.set(true);
      this.passwordWrong.set(false);
      localStorage.setItem(STORAGE_KEY, '1');
      this.load();
    } else {
      this.passwordWrong.set(true);
    }
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.rozklad.snapshot().subscribe({
      next: ({ run, entries }) => {
        this.run.set(run);
        this.entries.set(entries);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Не вдалося завантажити файл розкладу.');
        this.loading.set(false);
      },
    });
  }

  setView(view: View): void {
    this.view.set(view);
    this.picked.set('');
  }

  /** Уроки, звужені до вибраного тижня циклу. `0` — усі, обидва тижні. */
  private readonly shown = computed(() => {
    const pick = this.week();
    return pick === 0 ? this.entries()
      : this.entries().filter(entry => (entry.week ?? 1) === pick);
  });

  /** Підпис одного уроку — предмет, підгрупа, клас, учитель. */
  private signOf(entry: Entry): string {
    return [entry.subject_name, entry.teacher_name, entry.group_name, entry.subgroup]
      .join('|');
  }

  /** Чи однаковий набір уроків в обох тижнях циклу. */
  private identical(weeks: WeekPart[]): boolean {
    if (this.week() !== 0 || this.weeks() === 1) { return true; }
    if (weeks.length < 2) { return false; }
    const sign = (list: Entry[]) => list.map(entry => this.signOf(entry)).sort().join('§');
    const first = sign(weeks[0].entries);
    return weeks.every(part => sign(part.entries) === first);
  }

  /** Уроки одного слота (день:урок) → клітинка, розкладена по тижнях. */
  private toSlot(entries: Entry[]): Slot {
    const byWeek = new Map<number, Entry[]>();
    for (const entry of entries) {
      const week = entry.week ?? 1;
      byWeek.set(week, [...(byWeek.get(week) ?? []), entry]);
    }
    const ordered = [...byWeek.entries()]
      .sort(([a], [b]) => a - b)
      .map(([week, list]) => ({ week, entries: list }));
    const same = this.identical(ordered);
    if (same || this.week() !== 0) {
      return { same: true, weeks: ordered.length ? [ordered[0]] : [] };
    }
    // Тиждень без уроку тут дописуємо порожнім — інакше «є лише в
    // чисельнику» виглядало б так само, як «однаково в обидва тижні».
    const full = Array.from({ length: this.weeks() }, (_, index) => index + 1)
      .map(week => ordered.find(part => part.week === week) ?? { week, entries: [] });
    return { same: false, weeks: full };
  }

  /** Ім'я «того боку», яким підписані клітинки — залежно від розрізу. */
  private entityName(entry: Entry, view: View): string | null {
    switch (view) {
      case 'groups': return entry.group_name ?? null;
      case 'teachers': return entry.teacher_name ?? null;
      case 'rooms': return entry.room_name ?? null;
    }
  }

  /** Усі назви поточного розрізу — стала множина, незалежна від тижня. */
  readonly options = computed<string[]>(() => {
    const view = this.view();
    const names = new Set<string>();
    for (const entry of this.entries()) {
      const name = this.entityName(entry, view);
      if (name) { names.add(name); }
    }
    return [...names].sort((a, b) => a.localeCompare(b, 'uk', { numeric: true }));
  });

  /** Скільки уроків найбільше стрічається — межа сітки знизу. */
  private readonly maxLesson = computed(
    () => Math.max(1, ...this.entries().map(entry => entry.lesson)));

  readonly lessons = computed(
    () => Array.from({ length: this.maxLesson() }, (_, index) => index + 1));

  /** Підпис клітинки для однієї конкретної обраної сутності (день×урок). */
  grid = computed<Grid | null>(() => {
    const picked = this.picked();
    if (!picked) { return null; }
    const view = this.view();
    const raw = new Map<string, Entry[]>();
    for (const entry of this.shown()) {
      if (this.entityName(entry, view) !== picked) { continue; }
      const key = `${entry.day}:${entry.lesson}`;
      raw.set(key, [...(raw.get(key) ?? []), entry]);
    }
    const cells = new Map<string, Slot>();
    for (const [key, list] of raw) { cells.set(key, this.toSlot(list)); }
    return { key: picked, title: picked, lessons: this.lessons(), cells };
  });

  cell(day: string, lesson: number): Slot | null {
    return this.grid()?.cells.get(`${day}:${lesson}`) ?? null;
  }

  /**
   * Зведена таблиця «усі одразу»: рядки — уроки понеділка, потім
   * вівторка, і так до п'ятниці; колонки — самі класи/вчителі/кабінети.
   */
  readonly rows = computed(() => {
    const list: { day: string; lesson: number }[] = [];
    for (const day of DAYS) {
      for (const lesson of this.lessons()) {
        list.push({ day, lesson });
      }
    }
    return list;
  });

  private readonly allCells = computed(() => {
    const view = this.view();
    const raw = new Map<string, Entry[]>();
    for (const entry of this.shown()) {
      const name = this.entityName(entry, view);
      if (!name) { continue; }
      const key = `${name}|${entry.day}:${entry.lesson}`;
      raw.set(key, [...(raw.get(key) ?? []), entry]);
    }
    const cells = new Map<string, Slot>();
    for (const [key, list] of raw) { cells.set(key, this.toSlot(list)); }
    return cells;
  });

  allCell(name: string, day: string, lesson: number): Slot | null {
    return this.allCells().get(`${name}|${day}:${lesson}`) ?? null;
  }

  /** Підпис тижня в клітинці. */
  weekMark(week: number): string {
    return week === 1 ? 'чис.' : 'знам.';
  }

  /** Другий бік клітинки — те, що показуємо крім предмета. */
  who(entry: Entry): string {
    switch (this.view()) {
      case 'groups': return entry.teacher_name ?? '—';
      case 'teachers': return entry.group_name ?? '—';
      case 'rooms': return [entry.group_name, entry.teacher_name].filter(Boolean).join(' · ') || '—';
    }
  }

  // ── скрол широкої таблиці зверху й знизу одночасно ──────────
  //
  // Колонок буває під тридцять — низький браузерний скрол видно, лише
  // домотавши до самого низу таблиці. Другий, дзеркальний, стоїть над
  // нею й рухається в парі зі справжнім через ширину-привида того самого
  // розміру, що й таблиця.

  @ViewChild('topScroll') private topScrollRef?: ElementRef<HTMLDivElement>;
  @ViewChild('bottomScroll') private bottomScrollRef?: ElementRef<HTMLDivElement>;
  @ViewChild('wideTable') private wideTableRef?: ElementRef<HTMLTableElement>;

  readonly ghostWidth = signal(0);
  private resizeObserver?: ResizeObserver;
  private observedTable?: HTMLTableElement;
  private syncing = false;

  /**
   * Стежить, яку саме таблицю зараз спостерігає `ResizeObserver`.
   *
   * `@ViewChild` міняється щоразу, як перемикач «один/усі» підміняє
   * шаблон — старої таблиці вже нема в DOM, нову ще не побачено.
   * `ngAfterViewChecked` — єдиний гачок, що спрацьовує після кожної
   * такої підміни, тож перепідключення живе саме тут, а не в
   * одноразовому `AfterViewInit`.
   */
  ngAfterViewChecked(): void {
    const table = this.wideTableRef?.nativeElement;
    if (table === this.observedTable) { return; }
    this.resizeObserver?.disconnect();
    this.observedTable = table;
    if (!table) {
      this.ghostWidth.set(0);
      return;
    }
    if (typeof ResizeObserver === 'undefined') {
      this.ghostWidth.set(table.scrollWidth);
      return;
    }
    this.resizeObserver = new ResizeObserver(() => {
      const width = this.wideTableRef?.nativeElement.scrollWidth ?? 0;
      if (width !== this.ghostWidth()) { this.ghostWidth.set(width); }
    });
    this.resizeObserver.observe(table);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  onTopScroll(): void {
    if (this.syncing || !this.topScrollRef || !this.bottomScrollRef) { return; }
    this.syncing = true;
    this.bottomScrollRef.nativeElement.scrollLeft = this.topScrollRef.nativeElement.scrollLeft;
    this.syncing = false;
  }

  onBottomScroll(): void {
    if (this.syncing || !this.topScrollRef || !this.bottomScrollRef) { return; }
    this.syncing = true;
    this.topScrollRef.nativeElement.scrollLeft = this.bottomScrollRef.nativeElement.scrollLeft;
    this.syncing = false;
  }
}
