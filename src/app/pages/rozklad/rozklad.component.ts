import {
  Component, DestroyRef, ElementRef, Injector, OnInit, ViewChild, afterNextRender, computed, inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { RozkladData, RozkladLesson, WeekType } from '../../models/rozklad.models';
import { ROZKLAD_2026_2027 } from '../../data/rozklad-2026-2027';

/** Чий розклад дивимось: класу чи вчителя. */
type Mode = 'klas' | 'vchytel';

/** Один рядок у клітинці: предмет і вчитель (для класу) чи клас і предмет (для вчителя). */
interface Item {
  title: string;
  sub: string;
  /** «I гр.», коли клас ділиться на групи. */
  tag?: string;
}

/**
 * Клітинка сітки. Коли чисельник і знаменник однакові — `weekly`; коли ні
 * (`split`), обидва тижні показуються в одній клітинці, окремими половинами.
 */
interface Cell {
  split: boolean;
  weekly: Item[];
  N: Item[];
  D: Item[];
}

/** Що зараз за годинником Києва — усе, від чого залежить підсвітка. */
interface Clock {
  time: string;
  /** Котрий тиждень підсвічувати; null — навчальний рік скінчився. */
  week: WeekType | null;
  weekText: string;
  /** Дати пн–пт показаного тижня, «29 вер.». */
  dates: string[] | null;
  holidays: boolean[];
  /** Стовпчик сьогоднішнього дня, коли сьогодні навчальний день. */
  today: number | null;
  todayHoliday: boolean;
  /** Котрий урок іде, скільки його минуло (0…1) і хвилин до кінця. */
  lesson: number | null;
  progress: number;
  percent: number;
  left: number;
  /** Котрий урок наступний — на перерві чи зранку. */
  next: number | null;
  over: boolean;
}

const DAY_NAMES = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця"];
const WEEK_NAME: Record<WeekType, string> = { N: 'чисельник', D: 'знаменник' };
const DAY_MS = 864e5;
const STORAGE_KEY = 'rozklad-vybir';

const TZ = (() => {
  try {
    new Intl.DateTimeFormat('uk', { timeZone: 'Europe/Kyiv' });
    return 'Europe/Kyiv';
  } catch {
    return 'Europe/Kiev';
  }
})();
const PARTS = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric',
  hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23',
});
const LONG_DATE = new Intl.DateTimeFormat('uk-UA', { timeZone: 'UTC', day: 'numeric', month: 'long' });
const SHORT_DATE = new Intl.DateTimeFormat('uk-UA', { timeZone: 'UTC', day: 'numeric', month: 'short' });

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const pad = (n: number) => String(n).padStart(2, '0');
const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Годинник школи на момент `ms`: який тиждень (чисельник/знаменник), який
 * сьогодні стовпчик і котрий урок іде. На вихідних показуємо наступний
 * тиждень, на канікулах — перший навчальний після них.
 */
function clockAt(data: RozkladData, ms: number): Clock {
  const p: Record<string, number> = {};
  for (const x of PARTS.formatToParts(new Date(ms))) {
    if (x.type !== 'literal') p[x.type] = +x.value;
  }
  const todayMs = Date.UTC(p['year'], p['month'] - 1, p['day']);
  const dow = new Date(todayMs).getUTCDay() || 7;
  const thisMon = todayMs - (dow - 1) * DAY_MS;
  const target = dow >= 6 ? thisMon + 7 * DAY_MS : thisMon;

  const { weeks, vacations } = data.calendar;
  const keys = Object.keys(weeks).sort();
  const first = keys[0];
  const last = keys[keys.length - 1];

  let ref: number | null = null;
  if (iso(target) <= last) {
    ref = Math.max(target, Date.parse(first));
    while (ref !== null && !weeks[iso(ref)]) {
      ref += 7 * DAY_MS;
      if (iso(ref) > last) ref = null;
    }
  }
  const week = ref === null ? null : weeks[iso(ref)];

  let weekText = 'Навчальний рік завершено';
  if (ref !== null && week) {
    const name = WEEK_NAME[week];
    if (weeks[iso(target)] === null) {
      const v = vacations.find(x => iso(target) >= x.from && iso(target) <= x.to);
      weekText = `Канікули${v ? ' до ' + LONG_DATE.format(Date.parse(v.to)) : ''} · далі ${name}`;
    } else if (ref !== target) {
      weekText = `Навчання з ${LONG_DATE.format(ref)} · ${name}`;
    } else if (target === thisMon) {
      weekText = `Цей тиждень — ${name}`;
    } else {
      weekText = `Наступний тиждень — ${name}`;
    }
  }

  const holidaySet = new Set(data.calendar.holidays);
  const days = [0, 1, 2, 3, 4];
  const holidays = days.map(i => ref !== null && holidaySet.has(iso(ref + i * DAY_MS)));
  const isStudyDay = dow <= 5 && ref === thisMon;
  const todayHoliday = isStudyDay && holidays[dow - 1];
  const today = isStudyDay && !todayHoliday ? dow - 1 : null;

  const clock: Clock = {
    time: `${pad(p['hour'])}:${pad(p['minute'])}`,
    week,
    weekText,
    dates: ref === null ? null : days.map(i => SHORT_DATE.format(ref! + i * DAY_MS)),
    holidays,
    today,
    todayHoliday,
    lesson: null,
    progress: 0,
    percent: 0,
    left: 0,
    next: null,
    over: false,
  };
  if (today === null) return clock;

  const now = p['hour'] * 60 + p['minute'] + p['second'] / 60;
  const bells = data.bells.map(([a, b]) => [minutes(a), minutes(b)]);
  const i = bells.findIndex(([a, b]) => now >= a && now < b);
  if (i >= 0) {
    const [a, b] = bells[i];
    clock.lesson = i + 1;
    clock.progress = (now - a) / (b - a);
    clock.percent = Math.round(clock.progress * 100);
    clock.left = Math.ceil(b - now);
  } else {
    const j = bells.findIndex(([a]) => a > now);
    clock.next = j >= 0 ? j + 1 : null;
    clock.over = j < 0;
  }
  return clock;
}

interface Saved {
  mode?: Mode;
  klas?: string;
  vchytel?: string;
}

function loadSaved(): Saved {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

function save(s: Saved): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* приватне вікно чи заборонене сховище — просто не запам'ятовуємо */
  }
}

/**
 * Загальний розклад: будь-який клас 5–11 чи будь-який учитель, тиждень
 * пн–пт × 7 уроків. Чисельник і знаменник — в одній клітинці, поточний
 * тиждень підсвічено; у навчальний час видно, котрий урок іде і скільки
 * його минуло.
 *
 * Вибір живе в адресі (`?klas=5-Б`, `?vchytel=36`), щоб посилання на свій
 * розклад можна було зберегти чи переслати. `?now=2026-09-29T10:50+03:00` —
 * глянути сторінку «в інший момент».
 *
 * Розклад вбудовано в код сторінки (`data/rozklad-2026-2027.ts`) — жодного
 * запиту ні до бекенда, ні до файлу: сторінка працює на будь-якому
 * статичному хостингу.
 */
@Component({
  selector: 'app-rozklad',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './rozklad.component.html',
  styleUrls: ['./rozklad.component.scss'],
})
export class RozkladComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  @ViewChild('wrap') private wrap?: ElementRef<HTMLElement>;

  readonly dayNames = DAY_NAMES;
  readonly weekName = WEEK_NAME;

  readonly data: RozkladData = ROZKLAD_2026_2027;

  readonly mode = signal<Mode>('klas');
  readonly klas = signal('');
  readonly vchytel = signal('');
  readonly pick = computed(() => (this.mode() === 'klas' ? this.klas() : this.vchytel()));

  private skew = 0;
  private readonly nowMs = signal(Date.now());

  readonly clock = computed(() => clockAt(this.data, this.nowMs()));

  private readonly teacherNames = computed(
    () => new Map(this.data.teachers.map(t => [t.id, t.name])),
  );

  readonly pickTitle = computed(() => {
    if (this.mode() === 'klas') return `${this.klas()} клас`;
    return this.data.teachers.find(t => String(t.id) === this.vchytel())?.full ?? '';
  });

  /** Сітка [урок][день] для вибраного класу чи вчителя. */
  readonly grid = computed<Cell[][]>(() => {
    const data = this.data;
    const byClass = this.mode() === 'klas';
    const pick = this.pick();
    const mine = data.lessons.filter(l => (byClass ? l.c === pick : l.t.includes(+pick)));

    return data.bells.map((_, k) =>
      DAY_NAMES.map((__, d) => {
        const here = mine.filter(l => l.d === d && l.n === k + 1);
        const items = (list: RozkladLesson[]) => (byClass ? this.classItems(list) : this.teacherItems(list));
        const split = here.some(l => l.w);
        return {
          split,
          weekly: split ? [] : items(here),
          N: split ? items(here.filter(l => l.w !== 'D')) : [],
          D: split ? items(here.filter(l => l.w !== 'N')) : [],
        };
      }),
    );
  });

  /** Рядок стану під перемикачами: що йде зараз чи що далі. */
  readonly nowText = computed(() => {
    const c = this.clock();
    if (c.todayHoliday) return 'Сьогодні святковий день — уроків немає';
    if (c.today === null) return '';
    const bells = this.data.bells;
    if (c.lesson) {
      const what = this.describe(c.lesson, c.today, c.week);
      const rest = `ще ${c.left} хв`;
      if (what) return `Зараз ${c.lesson}-й урок — ${what} · ${rest}`;
      return `Зараз ${c.lesson}-й урок · ${this.mode() === 'klas' ? 'у класу уроку немає' : 'вікно'} · ${rest}`;
    }
    if (c.next) {
      const at = bells[c.next - 1][0];
      const head = c.next === 1 ? `Уроки починаються о ${at}` : `Перерва до ${at}`;
      const what = this.describe(c.next, c.today, c.week);
      return what ? `${head} · далі ${what}` : head;
    }
    return 'Уроки на сьогодні закінчились';
  });

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    const override = Date.parse(q.get('now') ?? '');
    this.skew = Number.isNaN(override) ? 0 : override - Date.now();
    this.nowMs.set(Date.now() + this.skew);

    const timer = setInterval(() => this.nowMs.set(Date.now() + this.skew), 1000);
    this.destroyRef.onDestroy(() => clearInterval(timer));

    const data = this.data;
    const saved = loadSaved();
    const hasClass = (c?: string | null) => !!c && data.classes.includes(c);
    const hasTeacher = (t?: string | null) => !!t && data.teachers.some(x => String(x.id) === t);

    this.klas.set(hasClass(q.get('klas')) ? q.get('klas')! : hasClass(saved.klas) ? saved.klas! : data.classes[0]);
    this.vchytel.set(hasTeacher(q.get('vchytel')) ? q.get('vchytel')!
      : hasTeacher(saved.vchytel) ? saved.vchytel! : String(data.teachers[0]?.id ?? ''));
    this.mode.set(hasTeacher(q.get('vchytel')) ? 'vchytel'
      : hasClass(q.get('klas')) ? 'klas' : saved.mode ?? 'klas');
    this.remember();
    // Не setTimeout: з eventCoalescing таблиця з'являється лише на наступному кадрі.
    afterNextRender(() => this.scrollToToday(), { injector: this.injector });
  }

  setMode(mode: Mode): void {
    if (mode === this.mode()) return;
    this.mode.set(mode);
    this.remember();
  }

  setPick(value: string): void {
    (this.mode() === 'klas' ? this.klas : this.vchytel).set(value);
    this.remember();
  }

  /** Половина клітинки підсвічена, коли її тиждень — поточний. */
  isActive(week: WeekType): boolean {
    const w = this.clock()?.week;
    return !w || w === week;
  }

  private classItems(list: RozkladLesson[]): Item[] {
    const names = this.teacherNames();
    return [...list]
      .sort((a, b) => (a.g ?? '').localeCompare(b.g ?? ''))
      .map(l => ({
        title: l.s,
        sub: l.t.map(t => names.get(t) ?? '').join(', '),
        tag: l.g ? `${l.g} гр.` : undefined,
      }));
  }

  /** Для вчителя: класи, де він того самого предмета в той самий час, — одним рядком. */
  private teacherItems(list: RozkladLesson[]): Item[] {
    const merged = new Map<string, Item & { classes: string[] }>();
    for (const l of list) {
      const tag = l.g ? `${l.g} гр.` : undefined;
      const key = `${l.s}|${tag ?? ''}`;
      const item = merged.get(key) ?? { title: '', sub: l.s, tag, classes: [] };
      item.classes.push(l.c);
      merged.set(key, item);
    }
    return [...merged.values()].map(({ classes, ...item }) => ({ ...item, title: classes.join(', ') }));
  }

  /** Короткий опис уроку для рядка стану: «Математика» чи «5-А, Інформатика». */
  private describe(lesson: number, day: number, week: WeekType | null): string {
    const cell = this.grid()[lesson - 1]?.[day];
    if (!cell) return '';
    const items = cell.split ? (week ? cell[week] : [...cell.N, ...cell.D]) : cell.weekly;
    return items
      .map(i => (this.mode() === 'klas' ? i.title : `${i.title}, ${i.sub}`))
      .join(' / ');
  }

  private remember(): void {
    save({ mode: this.mode(), klas: this.klas(), vchytel: this.vchytel() });
    const queryParams: Record<string, string | null> = {
      klas: this.mode() === 'klas' ? this.klas() : null,
      vchytel: this.mode() === 'vchytel' ? this.vchytel() : null,
    };
    this.router.navigate([], {
      relativeTo: this.route, queryParams, queryParamsHandling: 'merge', replaceUrl: true,
    });
  }

  /** На телефоні таблиця ширша за екран — підкрутити до сьогоднішнього дня. */
  private scrollToToday(): void {
    const wrap = this.wrap?.nativeElement;
    const th = wrap?.querySelector<HTMLElement>('th.is-today');
    if (!wrap || !th || wrap.scrollWidth <= wrap.clientWidth) return;
    const sticky = wrap.querySelector<HTMLElement>('th.grid__corner')?.offsetWidth ?? 0;
    wrap.scrollLeft = Math.max(0, th.offsetLeft - sticky - 8);
  }
}
