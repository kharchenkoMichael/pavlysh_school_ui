import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiError } from '../../services/api.service';
import { DovidnykyService } from '../../services/dovidnyky.service';
import { NavantazhenniaService } from '../../services/navantazhennia.service';
import {
  DAYS, Employee, GroupTimetable, Load, Shift, Subject, TEACHER_LIMIT,
  TeacherCandidate, teacherLabel,
} from '../../models/rozklad.models';

/** Скільки уроків у зміні, поки довідник змін не приїхав. */
const DEFAULT_LESSONS = 7;

interface Cell {
  group: GroupTimetable;
  subject: Subject;
  load?: Load;
}

/**
 * Навантаження — матриця клас × предмет.
 *
 * Це те, що завуч заповнює найдовше, тож усе тут заради швидкості:
 * години вводяться просто в клітинці й зберігаються на виході з поля,
 * рядок копіюється в паралельний клас однією кнопкою, а підсумки по
 * рядках, стовпцях і вчителях рахуються на льоту — перебір видно одразу,
 * а не після запуску солвера.
 */
@Component({
  selector: 'app-rozklad-navantazhennia',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './navantazhennia.component.html',
  styleUrls: ['./navantazhennia.component.scss', '../../shared/page.scss'],
})
export class NavantazhenniaComponent implements OnInit {
  private dovidnyky = inject(DovidnykyService);
  private loads = inject(NavantazhenniaService);

  readonly teacherLimit = TEACHER_LIMIT;

  readonly groups = signal<GroupTimetable[]>([]);
  readonly subjects = signal<Subject[]>([]);
  readonly employees = signal<Employee[]>([]);
  readonly shifts = signal<Shift[]>([]);
  readonly rows = signal<Load[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  /** Клітинка, яку зараз налаштовують детально: учитель, підгрупи. */
  readonly picked = signal<Cell | null>(null);

  /**
   * Кандидати на вчителя для відкритої клітинки — від бекенду, спершу
   * ті, хто веде предмет, серед них найменш завантажені спершу.
   * Порожньо, поки запис ще не заведений (нема `load.id`, нема кого
   * запитати) — тоді дропдаун падає назад на `teachersFor()`.
   */
  readonly candidates = signal<TeacherCandidate[]>([]);

  private byKey = computed(() => {
    const map = new Map<string, Load>();
    for (const load of this.rows()) {
      // Зведена група стоїть у клітинці кожного свого класу — це один
      // урок, який бачать обидва класи, а не два різні записи.
      for (const groupId of load.group_ids) {
        map.set(`${groupId}:${load.subject_id}`, load);
      }
    }
    return map;
  });

  readonly visibleGroups = computed(
    () => this.groups().filter(group => group.in_timetable !== false));

  /** Предмети, які досі пропонуються — вимкнені («Діє» = ні) не заважають. */
  readonly visibleSubjects = computed(
    () => this.subjects().filter(subject => subject.is_active !== false));

  /** Години в класі за тиждень і скільки їх уміщає сітка. */
  readonly perGroup = computed(() => {
    const totals = new Map<number, number>();
    for (const load of this.rows()) {
      for (const groupId of load.group_ids) {
        totals.set(groupId, (totals.get(groupId) ?? 0) + load.hours_per_week);
      }
    }
    return totals;
  });

  readonly perSubject = computed(() => {
    const totals = new Map<number, number>();
    for (const load of this.rows()) {
      // Так само по класах, як і в рядку: інакше підсумок стовпця
      // не збігався б із сумою клітинок, які видно очима.
      totals.set(load.subject_id,
                 (totals.get(load.subject_id) ?? 0)
                 + load.hours_per_week * load.group_ids.length);
    }
    return totals;
  });

  /**
   * Години в кожного вчителя.
   *
   * Поділений клас рахується двічі — і це правильно: обидві підгрупи йдуть
   * одночасно, отже кожен із двох учителів справді проводить свої години.
   */
  readonly perTeacher = computed(() => {
    const totals = new Map<number, number>();
    const add = (id: number | null | undefined, hours: number) => {
      if (id) { totals.set(id, (totals.get(id) ?? 0) + hours); }
    };
    for (const load of this.rows()) {
      add(load.teacher_id, load.hours_per_week);
      if (load.split) { add(load.teacher2_id, load.hours_per_week); }
    }
    return [...totals.entries()]
      .map(([id, hours]) => ({
        id, hours,
        label: teacherLabel(this.employees().find(person => person.id === id)),
      }))
      .sort((a, b) => b.hours - a.hours);
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.busy.set(true);
    forkJoin({
      groups: this.dovidnyky.groups(),
      subjects: this.dovidnyky.subjects(),
      employees: this.dovidnyky.allEmployees(),
      loads: this.loads.list(),
      // Зміни потрібні лише заради одного числа — скільки уроків у сітці.
      // Але саме на ньому тримається підсумок «перебір / не перебір»,
      // тож брати його з голови не можна.
      shifts: this.dovidnyky.shifts(),
    }).subscribe({
      next: ({ groups, subjects, employees, loads, shifts }) => {
        this.groups.set(groups);
        this.subjects.set(subjects);
        this.employees.set(employees.items ?? []);
        this.rows.set(loads);
        this.shifts.set(shifts);
        this.resyncPicked();
        this.busy.set(false);
      },
      error: (error: ApiError) => {
        this.error.set(error.message);
        this.busy.set(false);
      },
    });
  }

  /**
   * Оновити відкрите віконце свіжими даними.
   *
   * Інакше після «поділити на підгрупи» поле другого вчителя не з'явилося б,
   * доки не закриєш і не відкриєш клітинку знову: у віконці лишався б знімок,
   * зроблений на момент відкриття.
   */
  private resyncPicked(): void {
    const cell = this.picked();
    if (!cell) { return; }
    const load = this.cell(cell.group, cell.subject);
    this.picked.set({ ...cell, load });
    this.refreshCandidates(load);
  }

  /** Запросити кандидатів у бекенда — тільки коли запис уже заведений. */
  private refreshCandidates(load: Load | undefined): void {
    if (!load) { this.candidates.set([]); return; }
    this.loads.candidates(load.id).subscribe({
      next: list => this.candidates.set(list),
      error: () => this.candidates.set([]),
    });
  }

  cell(group: GroupTimetable, subject: Subject): Load | undefined {
    return this.byKey().get(`${group.id}:${subject.id}`);
  }

  hours(group: GroupTimetable, subject: Subject): number | null {
    return this.cell(group, subject)?.hours_per_week ?? null;
  }

  /**
   * Години очима людини: 18,5 з комою, 18 без хвоста.
   *
   * Завуч рахує тарифікацію тижнями й пише «18,5». Показувати «18.5»
   * латиною або «37 за цикл» означало б змусити його рахувати в голові
   * те, що програма вже знає.
   */
  show(value: number | null | undefined): string {
    if (value === null || value === undefined) { return ''; }
    return Number.isInteger(value)
      ? String(value)
      : value.toFixed(1).replace('.', ',');
  }

  /**
   * Чи це урок, який ведуть кільком класам разом.
   *
   * Клітинка тоді підписана «+ 5-Б»: правити її можна з будь-якого класу
   * групи, і зміна стосується всіх — про це краще знати до, а не після.
   */
  merged(group: GroupTimetable, subject: Subject): string {
    const load = this.cell(group, subject);
    if (!load || load.group_ids.length < 2) { return ''; }
    const others = (load.group_names ?? [])
      .filter(name => name !== group.name);
    return others.length ? `+ ${others.join(' + ')}` : '';
  }

  /** Підпис учителя під годинами — щоб було видно, хто веде, без кліків. */
  who(group: GroupTimetable, subject: Subject): string {
    const load = this.cell(group, subject);
    if (!load) { return ''; }
    if (load.split) {
      return `${this.shortName(load.teacher_name)} / ${this.shortName(load.teacher2_name)}`;
    }
    return this.shortName(load.teacher_name);
  }

  private shortName(name?: string | null): string {
    return name ? name.split(' ')[0] : '?';
  }

  /** Клітинка заповнена годинами, але вчителя (чи другої підгрупи) нема. */
  hasGap(group: GroupTimetable, subject: Subject): boolean {
    const load = this.cell(group, subject);
    if (!load) { return false; }
    return !load.teacher_name || (load.split && !load.teacher2_name);
  }

  /**
   * Учитель призначений, але вже звільнений («Учителі», is_active = false).
   *
   * Інша річ, ніж прогалина: тут є на кого дивитись, просто вже не на
   * кого — рано чи пізно ці години треба комусь передати.
   */
  hasInactiveTeacher(group: GroupTimetable, subject: Subject): boolean {
    const load = this.cell(group, subject);
    if (!load) { return false; }
    const inactive = (id?: number | null) => {
      if (!id) { return false; }
      const person = this.employees().find(e => e.id === id);
      return !!person && person.is_active === false;
    };
    return inactive(load.teacher_id) || (load.split && inactive(load.teacher2_id));
  }

  /**
   * Зміна годин у клітинці.
   *
   * Нуль або порожньо — запис прибирається: інакше в навантаженні
   * лишалися б предмети по нуль годин, які нічого не означають, але
   * потрапляють у перевірки.
   */
  setHours(group: GroupTimetable, subject: Subject, raw: string): void {
    const value = raw === '' ? 0 : Number(String(raw).replace(',', '.'));
    if (Number.isNaN(value) || value < 0) { return; }
    // Половина буває, третина ні. Сервер таке теж не прийме, але сказати
    // це на місці краще, ніж почути 422 після натискання.
    if (Math.round(value * 2) !== value * 2) {
      this.error.set(`${this.show(value)} год/тиждень — буває лише ціле або `
        + `половина. Дробова година означає, що предмет іде через тиждень.`);
      return;
    }
    this.error.set(null);
    const load = this.cell(group, subject);

    if (!load && value > 0) {
      this.send(this.loads.create({
        group_ids: [group.id], subject_id: subject.id, hours_per_week: value,
        teacher_id: null, teacher2_id: null, split: false,
      }));
      return;
    }
    if (load && value === 0) {
      this.send(this.loads.remove(load.id));
      return;
    }
    if (load && value !== load.hours_per_week) {
      this.send(this.loads.update(load.id, { hours_per_week: value }));
    }
  }

  pick(group: GroupTimetable, subject: Subject): void {
    const load = this.cell(group, subject);
    this.picked.set({ group, subject, load });
    this.refreshCandidates(load);
  }

  closePicker(): void {
    this.picked.set(null);
    this.candidates.set([]);
  }

  /**
   * Учитель у дропдауні: кандидати з бекенда, коли запис уже заведений
   * (з навантаженням і позначкою «веде предмет»), інакше — старий
   * клієнтський здогад лише за карткою (`teachersFor`), бо питати
   * бекенд про запис, якого ще нема, нема як.
   */
  teacherOptions(cell: Cell): { id: number; label: string }[] {
    if (cell.load && this.candidates().length) {
      return this.candidates().map(c => ({
        id: c.id,
        label: `${c.name} — ${this.show(c.hours_per_week)} год`
          + (c.matches_subject ? '' : ' (не за карткою)'),
      }));
    }
    return this.teachersFor(cell.subject).map(p => ({ id: p.id, label: this.label(p) }));
  }

  saveCell(cell: Cell, patch: Partial<Load>): void {
    if (cell.load) {
      this.send(this.loads.update(cell.load.id, patch));
    } else {
      this.send(this.loads.create({
        group_ids: [cell.group.id], subject_id: cell.subject.id, hours_per_week: 1,
        teacher_id: null, teacher2_id: null, split: false, ...patch,
      } as any));
    }
  }

  removeCell(cell: Cell): void {
    if (cell.load) { this.send(this.loads.remove(cell.load.id)); }
    this.closePicker();
  }

  /**
   * Скопіювати рядок у паралельний клас.
   *
   * 5-А і 5-Б майже завжди мають однакове навантаження, і набирати його
   * двічі — марна робота. Наявні записи цільового класу не чіпаємо:
   * затерти вже введене було б гірше, ніж не скопіювати.
   */
  copyRow(from: GroupTimetable, toId: number): void {
    const to = this.groups().find(group => group.id === Number(toId));
    if (!to || to.id === from.id) { return; }

    const requests = this.rows()
      // Зведені групи не копіюємо: урок 5-А + 5-Б уже стосується обох
      // класів, і копія зробила б із нього два різні уроки.
      .filter(load => load.group_ids.length === 1 && load.group_ids[0] === from.id)
      .filter(load => !this.byKey().has(`${to.id}:${load.subject_id}`))
      .map(load => this.loads.create({
        group_ids: [to.id], subject_id: load.subject_id,
        hours_per_week: load.hours_per_week,
        teacher_id: load.teacher_id ?? null, teacher2_id: load.teacher2_id ?? null,
        split: load.split,
      }));

    if (!requests.length) {
      this.error.set(`У класу ${to.name} вже заповнені ті самі предмети.`);
      return;
    }
    this.busy.set(true);
    forkJoin(requests).subscribe({
      next: () => this.load(),
      error: (error: ApiError) => {
        this.error.set(error.message);
        this.busy.set(false);
      },
    });
  }

  /** Учителі цього предмета — першими, решта — нижче. */
  teachersFor(subject: Subject): Employee[] {
    const names = [subject.name, ...(subject.aliases ?? [])]
      .map(name => name.toLowerCase());
    const matches = (person: Employee) => (person.subjects ?? [])
      .some(item => names.includes(String(item).toLowerCase()));
    return [...this.employees()].sort((a, b) =>
      Number(matches(b)) - Number(matches(a)) || a.last_name.localeCompare(b.last_name));
  }

  label(person: Employee): string {
    return teacherLabel(person);
  }

  /**
   * Скільки уроків на тиждень уміщає сітка цього класу.
   *
   * П'ять днів на **стільки уроків, скільки в зміні**, а не на шість
   * навмання. У Павлиській школі сітка 1–7, тож клас без власного
   * обмеження вміщає 35 уроків; шістка в коді давала 30 і робила
   * половину класів «переповненими» на рівному місці.
   *
   * `max_lessons` класу звужує це число, але не розширює: клас не може
   * сидіти довше, ніж триває зміна.
   */
  capacity(group: GroupTimetable): number {
    const shift = this.shifts().find(item => item.code === group.shift_code)
      ?? this.shifts()[0];
    const lessons = shift?.lessons ?? DEFAULT_LESSONS;
    return DAYS.length * Math.min(group.max_lessons ?? lessons, lessons);
  }

  private send(request: any): void {
    this.busy.set(true);
    this.error.set(null);
    request.subscribe({
      next: () => this.load(),
      error: (error: ApiError) => {
        this.error.set(error.message);
        this.busy.set(false);
      },
    });
  }
}
