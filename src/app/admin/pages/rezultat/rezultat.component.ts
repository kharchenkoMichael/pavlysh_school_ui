import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import { ApiError } from '../../services/api.service';
import { DovidnykyService } from '../../services/dovidnyky.service';
import { PravylaService } from '../../services/pravyla.service';
import { RozkladService } from '../../services/rozklad.service';
import {
  AssignRoomsResult, DAYS, DAY_SHORT, Entry, PlaceClassHoursResult, ProgressPoint,
  Run, RuleSpec, Shift, Subject, roomKindLabel,
} from '../../models/rozklad.models';

/**
 * Розміри графіка збіжності у власних координатах SVG.
 *
 * Бібліотеки для графіків у проєкті немає, і заводити її заради двох
 * ліній не варто: `<polyline>` у `viewBox` розтягується під будь-яку
 * ширину сам, без жодного пакета. `INSET` — щоб лінія, яка лягла на
 * саме дно чи стелю, не зрізалася об край.
 */
const CHART_W = 640;
const CHART_H = 180;
const INSET = 6;

interface Curve {
  /**
   * Готові рядки для `points`, **по одному відрізку на прохід**.
   *
   * Не одна ламана на всю криву: у двох проходів різні масштаби штрафу
   * (тиждень проти циклу), і з'єднувати їх лінією означало б намалювати
   * стрибок, схожий на різке погіршення, якого не було.
   */
  penalty: string[];
  bound: string[];
  last: ProgressPoint;
  lo: number;
  hi: number;
  seconds: number;
  gap: number | null;
  /** Той самий розрив у відсотках від штрафу — легше зловити «досить». */
  gapPct: number | null;
  proved: boolean;
  /** Скільки секунд штраф не змінюється — те саме «плато» на око. */
  stableFor: number;
  /** Який прохід іде зараз і скільки їх усього трапилося. */
  stage: number;
  stages: number;
}

/** Уроки одного тижня циклу в одній клітинці. */
interface WeekSlot {
  week: number;
  entries: Entry[];
}

/**
 * Клітинка сітки — те, що стоїть у цей день і цей урок.
 *
 * `same` каже, чи однакові обидва тижні циклу. Це і є чисельник
 * зі знаменником: коли однакові, урок пишеться один раз без позначок;
 * коли ні — двома рядками, і саме ця різниця найцікавіша.
 */
interface Slot {
  same: boolean;
  weeks: WeekSlot[];
}

interface Grid {
  key: string;
  title: string;
  subtitle: string;
  shift: string;
  lessons: number[];
  cells: Map<string, Slot>;
  /** Вікна — лише для вчителів: саме вони найпереконливіші. */
  gaps?: number;
}

/**
 * Позначка «тут програма щось стерпіла».
 *
 * `kind` — той самий вид правила, що й у солвері й на сторінці «Правила»,
 * щоб завуч упізнав його, а не розгадував.
 */
interface Mark {
  kind: string;
  text: string;
}

/** У якому розрізі дивимось розклад. */
export type View = 'groups' | 'teachers' | 'rooms';

/** Який тиждень циклу показувати. `0` — обидва разом. */
export type WeekPick = 0 | 1 | 2;

/**
 * Результат розрахунку.
 *
 * Головне число тут — вікна у вчителів. Воно найзрозуміліше й
 * найпереконливіше в розмові: «було 14 вікон, стало 3» пояснює користь
 * краще за будь-який сумарний штраф.
 */
@Component({
  selector: 'app-rozklad-rezultat',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './rezultat.component.html',
  styleUrls: ['./rezultat.component.scss', '../../shared/page.scss'],
})
export class RezultatComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private rozklad = inject(RozkladService);
  private pravyla = inject(PravylaService);
  private dovidnyky = inject(DovidnykyService);

  readonly days = DAYS;
  readonly dayShort = DAY_SHORT;
  readonly roomKindLabel = roomKindLabel;

  readonly run = signal<Run | null>(null);
  readonly entries = signal<Entry[]>([]);
  readonly specs = signal<RuleSpec[]>([]);
  readonly error = signal<string | null>(null);
  readonly waited = signal(0);
  readonly view = signal<View>('groups');

  /**
   * Який тиждень циклу дивимось. За замовчуванням обидва: саме різниця
   * між ними — те, заради чого на двотижневий розклад узагалі дивляться.
   */
  readonly week = signal<WeekPick>(0);

  /** Скільки тижнів у цьому розкладі. Один — вибирати нічого. */
  readonly weeks = computed(
    () => Math.max(1, ...this.entries().map(entry => entry.week ?? 1)));

  /** Скільки клітинок різняться між тижнями — головне число двотижневого. */
  readonly differing = computed(() => {
    let count = 0;
    for (const grid of this.groupGrids()) {
      for (const slot of grid.cells.values()) {
        if (!slot.same) { count++; }
      }
    }
    return count;
  });

  /** Точки кривої збіжності. Лишаються на екрані й після кінця прогону. */
  readonly points = signal<ProgressPoint[]>([]);
  readonly stopping = signal(false);

  /**
   * Шкала штрафу на графіку.
   *
   * `linear` — чесні пропорції: видно, наскільки саме впав штраф.
   * `log` — видно **хвіст**: на початку штраф падає з тисяч до сотень
   * і в лінійній шкалі решта прогону зливається в пряму лінію біля
   * низу, хоч насправді там ще триває рух. Логарифм розтягує цей кінець,
   * і плато стає плато, а не оптичною ілюзією.
   */
  readonly scale = signal<'linear' | 'log'>('linear');

  /** Тікає щосекунди — щоб «не зменшувався N с» рахувався живо. */
  private readonly tick = signal(0);
  /** Коли прийшла остання точка: між точками час іде, а крива стоїть. */
  private readonly pointsAt = signal(Date.now());

  private polling?: Subscription;
  private curveSub?: Subscription;
  private ticker?: any;
  /** Поки true — опитуємо криву. Окремо від `running()`: та ще null на старті. */
  private readonly live = signal(true);

  readonly running = computed(() => this.run()?.status === 'running');

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.pravyla.catalog().subscribe({ next: specs => this.specs.set(specs) });
    this.watch(id);
  }

  ngOnDestroy(): void {
    this.polling?.unsubscribe();
    this.curveSub?.unsubscribe();
    this.live.set(false);
    clearInterval(this.ticker);
  }

  private watch(id: number): void {
    // Годинник тикає окремо від опитування: без нього екран виглядав би
    // застиглим усі дві хвилини розрахунку, а «штраф не змінюється N с»
    // рахувався б стрибками — від точки до точки, а не щосекунди.
    //
    // Порожню відповідь не записуємо: бекенд прибирає криву, щойно прогін
    // завершився, і без цієї перевірки графік зникав би саме тоді, коли
    // на нього найцікавіше дивитись — наприкінці.
    this.ticker = setInterval(() => {
      this.waited.update(value => value + 1);
      this.tick.update(value => value + 1);
    }, 1000);

    this.curveSub = this.rozklad.watchProgress(id, () => this.live()).subscribe({
      next: points => {
        if (points.length) {
          this.points.set(points);
          this.pointsAt.set(Date.now());
        }
      },
      error: () => {},
    });

    this.polling = this.rozklad.waitFor(id, run => this.run.set(run)).subscribe({
      next: run => {
        clearInterval(this.ticker);
        this.live.set(false);
        this.run.set(run);
        if (run.status === 'done') { this.loadEntries(id); }
      },
      error: (error: ApiError) => {
        clearInterval(this.ticker);
        this.live.set(false);
        this.error.set(error.message);
      },
    });
  }

  /**
   * Крива збіжності: дві лінії на спільній осі часу.
   *
   * Обидві вертикально стискаються в той самий діапазон — від найменшої
   * межі до найбільшого штрафу. Малювати кожну у своєму масштабі було б
   * гарніше й брехливіше: зійшлися лінії чи ні, видно лише коли вони
   * міряні однією лінійкою.
   */
  readonly curve = computed<Curve | null>(() => {
    const points = this.points();
    if (points.length < 2) { return null; }
    const values = points
      .flatMap(point => [point.penalty, point.bound])
      .filter((value): value is number => value !== null && value !== undefined);
    if (!values.length) { return null; }

    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const span = hi - lo || 1;
    const seconds = points[points.length - 1].seconds || 1;

    const x = (point: ProgressPoint) => (point.seconds / seconds) * CHART_W;

    // Логарифм зі зсувом на `lo`: межа стартує біля нуля, а log(0) не
    // існує. `+1` робить найнижчу точку одиницею, тобто нулем логарифма,
    // і шкала лишається монотонною від дна до стелі.
    const log = this.scale() === 'log';
    const stelia = Math.log10(span + 1);
    const chastka = (value: number) => log
      ? Math.log10(value - lo + 1) / stelia
      : (value - lo) / span;
    const y = (value: number) =>
      CHART_H - INSET - chastka(value) * (CHART_H - 2 * INSET);

    // Окремий відрізок на кожен прохід — див. коментар до `Curve.penalty`.
    const stages = [...new Set(points.map(point => point.stage ?? 1))].sort();
    const lines = (pick: (point: ProgressPoint) => number | null | undefined) =>
      stages
        .map(stage => points
          .filter(point => (point.stage ?? 1) === stage)
          .filter(point => pick(point) !== null && pick(point) !== undefined)
          .map(point => `${x(point).toFixed(1)},${y(pick(point)!).toFixed(1)}`)
          .join(' '))
        .filter(segment => segment.length > 0);

    const last = points[points.length - 1];
    const gap = last.penalty !== null && last.bound !== null
      ? last.penalty - last.bound : null;
    // У відсотках від штрафу — тим самим числом, яким рахує CP-SAT свій
    // `relative_gap_limit`. Абсолютний розрив нічого не каже сам по собі:
    // 365 балів — це багато при штрафі 1343 (27%) і дрібниця при 12000.
    const gapPct = gap !== null && last.penalty
      ? Math.round((gap / last.penalty) * 100) : null;

    // Скільки штраф стоїть на місці — те, заради чого на графік і дивляться.
    // Рахуємо в межах поточного проходу: на стику штраф міняється завжди,
    // бо це вже інша задача, і зараховувати той стрибок як «зрушення»
    // означало б щоразу обнуляти плато на рівному місці.
    const stage = last.stage ?? 1;
    const here = points.filter(point => (point.stage ?? 1) === stage);
    let since = last.seconds;
    for (let i = here.length - 1; i >= 0; i--) {
      if (here[i].penalty !== last.penalty) { break; }
      since = here[i].seconds;
    }
    // Годинник іде далі, навіть коли крива стоїть — а стоїть вона саме
    // тоді, коли на неї найважливіше дивитись. Тому до «часу останньої
    // точки мінус час останнього падіння» додаємо ще й те, що минуло
    // від приходу тієї точки. `tick()` читається, щоб перерахувалося
    // щосекунди, а не тільки коли приїде нова точка.
    this.tick();
    const zastylo = this.running()
      ? (Date.now() - this.pointsAt()) / 1000 : 0;

    return {
      penalty: lines(point => point.penalty),
      bound: lines(point => point.bound),
      last, lo, hi, gap, gapPct, stage,
      stages: stages.length,
      seconds: Math.round(seconds),
      proved: gap !== null && gap <= 0,
      stableFor: Math.round(last.seconds - since + zastylo),
    };
  });

  /**
   * Спинити розрахунок і забрати найкращий знайдений розклад.
   *
   * Відповідь приходить одразу, а сам солвер спиняється на межі
   * внутрішнього кроку — тому кнопка гасне, а сторінка й далі чекає
   * на `done`, як чекала б і після кінця часу.
   */
  stopSearch(): void {
    const run = this.run();
    if (!run) { return; }
    const stage = this.curve()?.stage ?? 1;
    this.stopping.set(true);
    this.rozklad.stop(run.id).subscribe({
      // Зупинка на першому проході обриває тільки його: другий почнеться
      // наново, і кнопка має знову стати натискною. Ловимо це по появі
      // точок другого проходу, а не по таймеру.
      next: () => { if (stage === 1) { this.waitForNextStage(stage); } },
      error: (error: ApiError) => {
        this.error.set(error.message);
        this.stopping.set(false);
      },
    });
  }

  private waitForNextStage(stopped: number): void {
    const timer = setInterval(() => {
      const stage = this.curve()?.stage ?? stopped;
      if (stage > stopped || !this.running()) {
        this.stopping.set(false);
        clearInterval(timer);
      }
    }, 1000);
  }

  private loadEntries(id: number): void {
    // Предмети потрібні лише заради `is_hard`: без нього не сказати,
    // де складний предмет стоїть пізно.
    forkJoin({
      entries: this.rozklad.entries(id),
      subjects: this.dovidnyky.subjects(),
      shifts: this.dovidnyky.shifts(),
    }).subscribe({
      next: ({ entries, subjects, shifts }) => {
        this.entries.set(entries);
        this.subjects.set(subjects);
        this.shifts.set(shifts);
      },
      error: (error: ApiError) => this.error.set(error.message),
    });
  }

  ruleName(kind: string): string {
    return this.specs().find(spec => spec.kind === kind)?.name ?? kind;
  }

  /** Скільки уроків у сітці — беремо з найпізнішого уроку, що трапився. */
  private lessonsOf(shift: string): number[] {
    const most = Math.max(1, ...this.entries()
      .filter(entry => entry.shift_code === shift)
      .map(entry => entry.lesson));
    return Array.from({ length: most }, (_, index) => index + 1);
  }

  /**
   * Уроки, звужені до вибраного тижня.
   *
   * Це єдине місце, де вибір тижня діє: далі всі три розрізи будуються
   * з того самого списку, і жоден із них не мусить про тижні знати.
   */
  private readonly shown = computed(() => {
    const pick = this.week();
    const all = this.entries();
    return pick === 0 ? all : all.filter(entry => (entry.week ?? 1) === pick);
  });

  readonly groupGrids = computed<Grid[]>(() => {
    const byGroup = new Map<string, Entry[]>();
    for (const entry of this.shown()) {
      const key = `${entry.shift_code}|${entry.group_name ?? entry.group_id}`;
      byGroup.set(key, [...(byGroup.get(key) ?? []), entry]);
    }

    return [...byGroup.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'uk'))
      .map(([key, entries]) => {
        const [shift, name] = key.split('|');
        return {
          key,
          title: name,
          subtitle: this.shiftName(shift),
          shift,
          lessons: this.lessonsOf(shift),
          cells: this.toCells(entries),
        };
      });
  });

  readonly teacherGrids = computed<Grid[]>(() => {
    const byTeacher = new Map<string, Entry[]>();
    for (const entry of this.shown()) {
      if (!entry.teacher_name) { continue; }
      const key = entry.teacher_name;
      byTeacher.set(key, [...(byTeacher.get(key) ?? []), entry]);
    }

    return [...byTeacher.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'uk'))
      .map(([name, entries]) => {
        // Учитель може працювати в обох змінах — показуємо все в одній сітці,
        // а зміну підписуємо в клітинці
        const shift = entries[0].shift_code;
        return {
          key: name,
          title: name,
          subtitle: this.hoursLabel(entries.length),
          shift,
          lessons: this.lessonsOf(shift),
          cells: this.toCells(entries),
          gaps: this.countGaps(entries),
        };
      });
  });

  /**
   * Розріз кабінетів.
   *
   * Уроки без кабінету сюди не потрапляють, і це навмисно: порожня
   * сітка «—» серед справжніх кабінетів читалася б як «кабінет вільний
   * цілий тиждень», а насправді означає «кабінет цим урокам ще не
   * призначено». Скільки їх, видно окремим числом.
   */
  readonly roomGrids = computed<Grid[]>(() => {
    const byRoom = new Map<string, Entry[]>();
    for (const entry of this.shown()) {
      if (!entry.room_name) { continue; }
      byRoom.set(entry.room_name, [...(byRoom.get(entry.room_name) ?? []), entry]);
    }

    return [...byRoom.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'uk'))
      .map(([name, entries]) => ({
        key: name,
        title: name,
        subtitle: this.hoursLabel(entries.length),
        shift: entries[0].shift_code,
        lessons: this.lessonsOf(entries[0].shift_code),
        cells: this.toCells(entries),
      }));
  });

  /** Уроків, яким кабінета не призначено. Нуль — усе розкладено. */
  readonly withoutRoom = computed(
    () => this.entries().filter(entry => !entry.room_name).length);

  /** Усі сітки поточного розрізу, до вибору конкретного. */
  private readonly allGrids = computed<Grid[]>(() => {
    switch (this.view()) {
      case 'teachers': return this.teacherGrids();
      case 'rooms': return this.roomGrids();
      default: return this.groupGrids();
    }
  });

  /**
   * Кого саме дивимось. Порожньо — усіх.
   *
   * Двадцять три класи одним полотном годяться, щоб окинути оком; але
   * коли завуч питає «а що в 7-Б у середу», гортати їх усі — марна
   * робота. Тому поруч із вкладками є вибір конкретного.
   */
  readonly picked = signal<string>('');

  /** Що можна вибрати в поточному розрізі. */
  readonly options = computed(
    () => this.allGrids().map(grid => ({ key: grid.key, title: grid.title })));

  readonly grids = computed<Grid[]>(() => {
    const picked = this.picked();
    const all = this.allGrids();
    if (!picked) { return all; }
    // Вибране могло зникнути — учитель без уроків у цьому тижні,
    // кабінет, якому нічого не дісталося. Показати порожнечу було б
    // гірше, ніж показати все: людина подумала б, що розклад зник.
    const here = all.filter(grid => grid.key === picked);
    return here.length ? here : all;
  });

  /** Вкладка міняється — вибір скидається: у розрізах різні переліки. */
  setView(view: View): void {
    this.view.set(view);
    this.picked.set('');
  }

  /**
   * Скільки годин **на тиждень** — і завжди на тиждень.
   *
   * Уроки в базі лежать за цикл, і показувати їх так було чесно, але
   * марно: завуч тарифікує тижнями й тримає в голові «18,5», а не
   * «37 за цикл». Тому число ділиться на довжину циклу тут, один раз,
   * а не перераховується в голові щоразу.
   *
   * Половини лишаються половинами: 33,5 год/тиждень — звичайна річ,
   * це 33 години один тиждень і 34 другий. Округлити означало б
   * показати години, яких нема.
   */
  private hoursLabel(count: number): string {
    // Коли дивимось один тиждень, `count` уже тижневий — ділити нічого.
    const perWeek = this.week() === 0 ? count / this.weeks() : count;
    const shown = Number.isInteger(perWeek)
      ? String(perWeek)
      : perWeek.toFixed(1).replace('.', ',');
    return `${shown} год/тиждень`;
  }

  /**
   * Вікно — вільний урок між двома зайнятими в один день.
   *
   * Тиждень циклу входить у ключ дня, і це не дрібниця: без нього
   * уроки вівторка чисельника й вівторка знаменника зливалися в один
   * день, дірки одного затулялися уроками другого, і вікон виходило
   * менше, ніж є насправді.
   */
  private countGaps(entries: Entry[]): number {
    const byDay = new Map<string, number[]>();
    for (const entry of entries) {
      const key = `${entry.shift_code}|${entry.week ?? 1}|${entry.day}`;
      byDay.set(key, [...(byDay.get(key) ?? []), entry.lesson]);
    }
    let gaps = 0;
    for (const lessons of byDay.values()) {
      const busy = new Set(lessons);
      const first = Math.min(...lessons);
      const last = Math.max(...lessons);
      for (let lesson = first + 1; lesson < last; lesson++) {
        if (!busy.has(lesson)) { gaps++; }
      }
    }
    return gaps;
  }

  readonly totalGaps = computed(
    () => this.teacherGrids().reduce((sum, grid) => sum + (grid.gaps ?? 0), 0));

  /** Чим підписаний урок у клітинці — залежно від розрізу. */
  private label(entry: Entry): string {
    switch (this.view()) {
      case 'groups': return entry.teacher_name ?? '—';
      case 'teachers': return entry.group_name ?? '—';
      case 'rooms': return `${entry.group_name ?? '—'} · ${entry.teacher_name ?? '—'}`;
    }
  }

  /**
   * Розкласти уроки по клітинках, **не змішуючи тижні**.
   *
   * Ключ клітинки — день і номер уроку, як і був; а от усередині уроки
   * розкладаються по тижнях циклу. Раніше цього не було зовсім: обидва
   * тижні падали в один список, і клітинка з геометрією в чисельнику
   * й музикою в знаменнику показувала обидва предмети так, ніби вони
   * йдуть одночасно.
   */
  private toCells(entries: Entry[]): Map<string, Slot> {
    const byKey = new Map<string, Map<number, Entry[]>>();
    for (const entry of entries) {
      const key = `${entry.day}:${entry.lesson}`;
      const weeks = byKey.get(key) ?? new Map<number, Entry[]>();
      const week = entry.week ?? 1;
      weeks.set(week, [...(weeks.get(week) ?? []), entry]);
      byKey.set(key, weeks);
    }

    const cells = new Map<string, Slot>();
    for (const [key, weeks] of byKey) {
      const ordered = [...weeks.entries()]
        .sort(([a], [b]) => a - b)
        .map(([week, list]) => ({ week, entries: list }));
      const same = this.identical(ordered);
      if (same) {
        // Однакові тижні — **один** рядок, а не два однакові.
        //
        // Малювалося двічі: клітинка знала, що тижні збігаються, але
        // все одно перебирала обидва. «Навчання грамоти, Бобрик А.В.»
        // стояло в понеділок двічі поспіль, і читалося це як два уроки
        // підряд, яких немає.
        cells.set(key, { same, weeks: [this.collapse(ordered)] });
        continue;
      }
      // Тиждень, у якому уроку немає, дописуємо порожнім — інакше
      // клітинка «геометрія тільки в чисельнику» виглядала б так само,
      // як «геометрія в обидва тижні», і саме та різниця, заради якої
      // сюди дивляться, знову зникла б.
      const full = this.week() !== 0
        ? ordered
        : Array.from({ length: this.weeks() }, (_, index) => index + 1)
            .map(week => ordered.find(part => part.week === week)
              ?? { week, entries: [] });
      cells.set(key, { same, weeks: full });
    }
    return cells;
  }

  /**
   * Чи стоїть у всіх тижнях циклу те саме.
   *
   * Порівнюємо предмет, учителя, підгрупу й клас — тобто те, що видно
   * в клітинці. `id` уроку тут не годиться: у двох тижнів він завжди
   * різний, і жодна клітинка ніколи не вважалася б однаковою.
   *
   * Урок, що стоїть лише в одному тижні з двох, однаковим не є — і це
   * теж чисельник зі знаменником, просто друга половина порожня.
   */
  /**
   * Звести однакові тижні в один рядок, не загубивши кабінет.
   *
   * Урок може бути той самий, а кабінет — різний: учитель без власної
   * кімнати щотижня дістає ту, яка вільна. Свістунов А.С. веде англійську
   * в 1-А в понеділок першим і в чисельнику сидить у кабінеті зарубіжної,
   * а в знаменнику — в кабінеті 1-А. Показати одну з двох означало б
   * збрехати рівно наполовину, тому пишемо обидві через скісну.
   */
  private collapse(weeks: WeekSlot[]): WeekSlot {
    const sign = (entry: Entry) => [entry.subject_name, entry.teacher_name,
                                    entry.group_name, entry.subgroup].join('|');
    const entries = weeks[0].entries.map(entry => {
      const rooms = new Set<string>();
      for (const part of weeks) {
        for (const other of part.entries) {
          if (sign(other) === sign(entry) && other.room_name) {
            rooms.add(other.room_name);
          }
        }
      }
      return rooms.size > 1
        ? { ...entry, room_name: [...rooms].join(' / ') }
        : entry;
    });
    return { week: weeks[0].week, entries };
  }

  private identical(weeks: WeekSlot[]): boolean {
    // Коли дивимось один конкретний тиждень, порівнювати нема з чим:
    // друга половина відфільтрована, і позначати кожну клітинку як
    // «різні тижні» означало б підсвітити геть увесь розклад.
    if (this.week() !== 0 || this.weeks() === 1) { return true; }
    // Урок лише в одному тижні з двох — це теж чисельник зі знаменником,
    // просто друга половина порожня.
    if (weeks.length < 2) { return false; }
    const sign = (list: Entry[]) => list
      .map(entry => [entry.subject_name, entry.teacher_name,
                     entry.group_name, entry.subgroup].join('|'))
      .sort()
      .join('§');
    const first = sign(weeks[0].entries);
    return weeks.every(week => sign(week.entries) === first);
  }

  cell(grid: Grid, day: string, lesson: number): Slot | null {
    return grid.cells.get(`${day}:${lesson}`) ?? null;
  }

  /** Підпис тижня в клітинці. Порожньо, коли розрізняти нема чого. */
  weekMark(week: number): string {
    return week === 1 ? 'чис.' : 'знам.';
  }

  who(entry: Entry): string {
    return this.label(entry);
  }

  private shiftName(code: string): string {
    return this.shifts().find(shift => shift.code === code)?.name ?? code;
  }

  breakdownRows(): { kind: string; name: string; value: number }[] {
    const breakdown = this.run()?.breakdown ?? {};
    return Object.entries(breakdown)
      .map(([kind, value]) => ({ kind, name: this.ruleName(kind), value }))
      .sort((a, b) => b.value - a.value);
  }

  /**
   * Чи має сенс рахувати якість цього розкладу.
   *
   * Це має сенс лише для **завантаженого** розкладу: складений програмою
   * штраф уже має, рахувати його вдруге означало б отримати те саме
   * число довшим шляхом. Перевіряємо `mode`, а не «штрафу ще нема» —
   * бо завантажений розклад можна оцінювати повторно (29.08.2026: дані
   * поправили, оцінку хочуть перерахувати), і після першої оцінки штраф
   * уже буде, а розклад лишиться так само завантаженим.
   */
  readonly canEvaluate = computed(() => {
    const run = this.run();
    return !!run && run.status === 'done' && run.mode === 'imported';
  });

  readonly evaluating = signal(false);

  /**
   * Перейменування розрахунку.
   *
   * Назва — єдине, що тут написала людина, і єдине, що правиться.
   * Штраф, статус і самі уроки не редагуються ніде: розрахунок є
   * виміром, і підправлений вимір гірший за відсутній.
   */
  readonly renaming = signal(false);
  draftTitle = '';

  startRename(): void {
    this.draftTitle = this.run()?.title ?? '';
    this.renaming.set(true);
  }

  saveTitle(): void {
    const run = this.run();
    if (!run) { return; }
    this.rozklad.rename(run.id, { title: this.draftTitle.trim() }).subscribe({
      next: updated => {
        // Оновлюємо тільки назву: у відповіді на PATCH немає уроків
        // і розкладки штрафу, і замінити нею весь запуск означало б
        // стерти з екрана те, заради чого на нього дивляться.
        this.run.set({ ...run, title: updated.title });
        this.renaming.set(false);
      },
      error: (error: ApiError) => this.error.set(error.message),
    });
  }

  // ── чому саме тут штраф ──────────────────────────────────
  //
  // Сумарне число нічого не пояснює: «4238» не каже, де саме програма
  // поступилася. Тому те, що видно в сітці, підписується прямо
  // в клітинці — але **вимикається**: коли розклад дивляться, щоб його
  // прочитати, ці підписи тільки заважають.
  //
  // 🔴 Тут не перерахунок штрафу, а його **пояснення на місці**. Число
  // рахує солвер, і воно єдине правильне; підписи показують ті самі
  // правила там, де їх видно очима. Правила, які не вміщаються в одну
  // клітинку (рівність навантаження по днях, справедливість між
  // учителями), позначок не мають — і вигадувати їх не варто.

  readonly showMarks = signal(false);

  readonly subjects = signal<Subject[]>([]);
  readonly shifts = signal<Shift[]>([]);

  private readonly hardSubjects = computed(
    () => new Set(this.subjects().filter(s => s.is_hard).map(s => s.name)));

  /** Із якого уроку складний предмет уже вважається пізнім. */
  private readonly LATE_FROM = 5;

  /**
   * Позначки для кожного уроку: id уроку → чому тут штраф.
   *
   * Рахується з самих уроків, без солвера: усе це — властивості
   * розкладу, які видно й людині.
   */
  readonly marks = computed(() => {
    const marks = new Map<number, Mark[]>();
    if (!this.showMarks()) { return marks; }
    const hard = this.hardSubjects();
    const add = (entry: Entry, kind: string, text: string) => {
      marks.set(entry.id, [...(marks.get(entry.id) ?? []), { kind, text }]);
    };

    // Складний предмет пізно і два складні поспіль — по класу й дню.
    const byDay = new Map<string, Entry[]>();
    for (const entry of this.entries()) {
      const key = `${entry.group_id}|${entry.week ?? 1}|${entry.day}`;
      byDay.set(key, [...(byDay.get(key) ?? []), entry]);
    }

    for (const here of byDay.values()) {
      const sorted = [...here].sort((a, b) => a.lesson - b.lesson);
      const seen = new Map<string, Entry[]>();
      for (const entry of sorted) {
        const name = entry.subject_name ?? '';
        if (hard.has(name) && entry.lesson >= this.LATE_FROM) {
          add(entry, 'hard_subjects_early',
              `складний предмет ${entry.lesson}-м уроком`);
        }
        seen.set(name, [...(seen.get(name) ?? []), entry]);
      }

      for (let i = 1; i < sorted.length; i++) {
        const before = sorted[i - 1];
        const now = sorted[i];
        if (now.lesson !== before.lesson + 1) { continue; }
        if (hard.has(now.subject_name ?? '') && hard.has(before.subject_name ?? '')) {
          add(now, 'alternate_hard', 'другий складний предмет поспіль');
        }
      }

      for (const [name, list] of seen) {
        // Підгрупи того самого предмета в один урок — це один урок,
        // а не два: інакше вся інформатика була б «двічі на день».
        const slots = new Set(list.map(entry => entry.lesson));
        if (slots.size > 1) {
          for (const entry of list) {
            add(entry, 'subject_once_per_day', `${name} двічі за день`);
          }
        }
      }
    }

    return marks;
  });

  marksFor(entry: Entry): Mark[] {
    return this.marks().get(entry.id) ?? [];
  }

  /**
   * Вікна вчителя в цій сітці — щоб підписати саме порожню клітинку.
   *
   * Ключ «день:урок», як і в клітинок. Вікно є лише в розрізі вчителів:
   * у класу вікон немає за жорстким правилом, а кабінет порожній —
   * це не втрата, а вільна кімната.
   */
  gapsOf(grid: Grid): Set<string> {
    const empty = new Set<string>();
    if (!this.showMarks() || this.view() !== 'teachers') { return empty; }
    for (const day of DAYS) {
      const busy = grid.lessons.filter(
        lesson => (grid.cells.get(`${day}:${lesson}`)?.weeks ?? [])
          .some(part => part.entries.length));
      if (busy.length < 2) { continue; }
      for (let lesson = busy[0] + 1; lesson < busy[busy.length - 1]; lesson++) {
        if (!busy.includes(lesson)) { empty.add(`${day}:${lesson}`); }
      }
    }
    return empty;
  }

  /** Скільки чого позначено — легенда під перемикачем. */
  readonly markTally = computed(() => {
    const counts = new Map<string, number>();
    for (const list of this.marks().values()) {
      for (const mark of list) {
        counts.set(mark.kind, (counts.get(mark.kind) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([kind, count]) => ({ kind, count, name: this.ruleName(kind) }))
      .sort((a, b) => b.count - a.count);
  });

  /**
   * Порахувати якість завантаженого розкладу — нічого в ньому не рухаючи.
   *
   * **Оновлює цей самий запуск** (рішення автора, 29.08.2026), а не
   * заводить новий: бекенд для `mode=imported` пише штраф і розбивку
   * назад у той-таки рядок і повертає той самий `id`. Тому тут не
   * навігація на нову сторінку, а повторний `watch()` того самого —
   * рівно так само, як після першого відкриття сторінки.
   */
  evaluate(): void {
    const run = this.run();
    if (!run || this.evaluating()) { return; }
    this.evaluating.set(true);
    this.error.set(null);
    this.rozklad.start({
      mode: 'evaluate',
      title: `Якість: ${run.title ?? '№' + run.id}`,
      time_limit: 120,
      based_on_run_id: run.id,
    }).subscribe({
      next: created => {
        this.evaluating.set(false);
        if (created.id === run.id) {
          this.watch(created.id);
        } else {
          // Захист про всяк випадок: якщо джерело колись виявиться не
          // завантаженим розкладом, бекенд поверне новий запуск — тоді
          // й переходимо на його сторінку, як робилося раніше.
          this.router.navigate(['../..', 'rezultat', created.id],
                                { relativeTo: this.route });
        }
      },
      error: (error: ApiError) => {
        this.error.set(error.message);
        this.evaluating.set(false);
      },
    });
  }

  readonly placingHours = signal(false);
  readonly hoursResult = signal<PlaceClassHoursResult | null>(null);

  /**
   * Поставити годину класного керівника — окрема дія, і саме **перед**
   * «Проставити кабінети», а не після (рішення автора, 31.08.2026):
   * якщо звільнити слот довелося обміном двох наявних уроків, обидва
   * лишаються без кабінету, і саме наступна розстановка кабінетів має
   * це підхопити, а не застаріле значення з попереднього прогону.
   */
  placeClassHours(): void {
    const run = this.run();
    if (!run || this.placingHours()) { return; }
    this.placingHours.set(true);
    this.error.set(null);
    this.hoursResult.set(null);
    this.rozklad.placeClassHours(run.id).subscribe({
      next: result => {
        this.placingHours.set(false);
        this.hoursResult.set(result);
        this.loadEntries(run.id);
      },
      error: (error: ApiError) => {
        this.error.set(error.message);
        this.placingHours.set(false);
      },
    });
  }

  readonly assigningRooms = signal(false);
  readonly roomsResult = signal<AssignRoomsResult | null>(null);

  /**
   * Проставити кабінети готовому розкладу — окрема дія після побудови.
   *
   * Кнопка з'являється, лише коли в розкладі є уроки без кабінету
   * (`withoutRoom() > 0`): для вже розставленого розкладу (завантаженого
   * чи вже пройденого цією дією) повторний виклик не шкодить, але й
   * показувати кнопку нема сенсу.
   */
  assignRooms(): void {
    const run = this.run();
    if (!run || this.assigningRooms()) { return; }
    this.assigningRooms.set(true);
    this.error.set(null);
    this.roomsResult.set(null);
    this.rozklad.assignRooms(run.id).subscribe({
      next: result => {
        this.assigningRooms.set(false);
        this.roomsResult.set(result);
        this.loadEntries(run.id);
      },
      error: (error: ApiError) => {
        this.error.set(error.message);
        this.assigningRooms.set(false);
      },
    });
  }

  downloadCsv(): void {
    const run = this.run();
    if (!run) { return; }
    this.rozklad.csv(run.id).subscribe({
      next: text => {
        // BOM, щоб Excel не показав кирилицю кракозябрами
        const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `rozklad-${run.id}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
      },
      error: (error: ApiError) => this.error.set(error.message),
    });
  }

  print(): void {
    window.print();
  }
}
