import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { ApiError } from '../../services/api.service';
import { DovidnykyService } from '../../services/dovidnyky.service';
import { NavantazhenniaService } from '../../services/navantazhennia.service';
import {
  DAYS, DAY_SHORT, Employee, Load, Shift, Subject, TEACHER_LIMIT, TeacherPref,
  teacherLabel,
} from '../../models/rozklad.models';

interface Row {
  employee: Employee;
  label: string;
  subjects: string[];
  pref?: TeacherPref;
  /**
   * Годин на тиждень за навантаженням цього року.
   *
   * Не з картки педагога, а з того, що йому справді розписано: саме це
   * число завуч і тримає в голові, коли розставляє години. Учитель без
   * жодної години — не помилка (адміністрація, підтримка), тому тут нуль,
   * а не порожньо: різниця між «нуль годин» і «ще не порахували» видима.
   */
  hours: number;
  /** Класи, у яких він веде — щоб було видно, звідки ті години. */
  groups: string[];
}

/**
 * Учителі та їхні побажання.
 *
 * Список педагогів — той самий, що на публічній сторінці «Наша команда»:
 * другого списку в школі немає й не має бути. Тут до нього додаються
 * лише речі, потрібні розкладу: коли вчителя точно немає, яку зміну він
 * просить, скільки уроків на день витримує.
 *
 * Скрізь прізвище з ініціалами. У школі три Сірі, дві з них Наталії
 * і різняться лише по батькові.
 */
@Component({
  selector: 'app-rozklad-vchyteli',
  standalone: true,
  imports: [FormsModule, ConfirmDialogComponent],
  templateUrl: './vchyteli.component.html',
  styleUrls: ['./vchyteli.component.scss', '../../shared/page.scss'],
})
export class VchyteliComponent implements OnInit {
  private dovidnyky = inject(DovidnykyService);
  private loads = inject(NavantazhenniaService);

  readonly days = DAYS;
  readonly dayShort = DAY_SHORT;

  /**
   * Понад стільки годин на тиждень — уже забагато для однієї людини.
   *
   * Те саме число, що й на сторінці навантаження: два різні пороги
   * означали б, що вчитель на одному екрані перевантажений, а на
   * другому ні.
   */
  readonly teacherLimit = TEACHER_LIMIT;

  readonly rows = signal<Row[]>([]);
  readonly shifts = signal<Shift[]>([]);
  readonly subjects = signal<Subject[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly search = signal('');

  /** Форма «Найняти вчителя» — відкрита чи згорнута. */
  readonly hiring = signal(false);
  hireDraft = this.blankHire();
  readonly hireError = signal<string | null>(null);

  private blankHire() {
    return { last_name: '', first_name: '', middle_name: '', position: '', subjects: '' };
  }

  /** Кого зараз редагуємо і чорновик його побажань. */
  readonly editing = signal<number | null>(null);
  draft: {
    unavailable: string[];
    max_lessons_per_day: number | null;
    comment: string;
  } = { unavailable: [], max_lessons_per_day: null, comment: '' };

  /**
   * Кого зараз звільняють чи повертають — підтвердження лише на звільнення
   * (впливає на публічний сайт), повернення не питає нічого зайвого.
   */
  readonly pending = signal<Row | null>(null);

  readonly visible = computed(() => {
    const needle = this.search().trim().toLowerCase();
    if (!needle) { return this.rows(); }
    return this.rows().filter(row =>
      row.label.toLowerCase().includes(needle) ||
      row.subjects.some(subject => subject.toLowerCase().includes(needle)));
  });

  /** Скільки уроків найбільше — межа сітки для клітинок «коли немає». */
  readonly lessonNumbers = computed(() => {
    const most = Math.max(6, ...this.shifts().map(shift => shift.lessons));
    return Array.from({ length: most }, (_, index) => index + 1);
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.busy.set(true);
    forkJoin({
      employees: this.dovidnyky.allEmployees(),
      prefs: this.dovidnyky.prefs(),
      shifts: this.dovidnyky.shifts(),
      subjects: this.dovidnyky.subjects(),
      loads: this.loads.list(),
    }).subscribe({
      next: ({ employees, prefs, shifts, subjects, loads }) => {
        const byEmployee = new Map(prefs.map(pref => [pref.employee_id, pref]));

        // Години рахуються і першому вчителю, і другому: у поділеного
        // класу обидва ведуть свою підгрупу повні години, а не по
        // половині кожен. Тому це не ділення, а два незалежні записи.
        const hours = new Map<number, number>();
        const groups = new Map<number, Set<string>>();
        const add = (id: number | null | undefined, load: Load) => {
          if (!id) { return; }
          hours.set(id, (hours.get(id) ?? 0) + (load.hours_per_week ?? 0));
          const here = groups.get(id) ?? new Set<string>();
          for (const name of load.group_names ?? []) { here.add(name); }
          groups.set(id, here);
        };
        for (const load of loads) {
          add(load.teacher_id, load);
          add(load.teacher2_id, load);
        }

        this.rows.set((employees.items ?? []).map(employee => ({
          employee,
          label: teacherLabel(employee),
          subjects: employee.subjects ?? [],
          pref: byEmployee.get(employee.id),
          hours: hours.get(employee.id) ?? 0,
          groups: [...(groups.get(employee.id) ?? [])].sort(
            (a, b) => a.localeCompare(b, 'uk', { numeric: true })),
        })));
        this.shifts.set(shifts);
        this.subjects.set(subjects);
        this.busy.set(false);
      },
      error: (error: ApiError) => {
        this.error.set(error.message);
        this.busy.set(false);
      },
    });
  }

  startEdit(row: Row): void {
    this.editing.set(row.employee.id);
    this.draft = {
      unavailable: [...(row.pref?.unavailable ?? [])],
      max_lessons_per_day: row.pref?.max_lessons_per_day ?? null,
      comment: row.pref?.comment ?? '',
    };
  }

  cancelEdit(): void {
    this.editing.set(null);
  }

  /** Клітинка «вчителя немає» — день і номер уроку в одному рядку: «pn:3». */
  toggleSlot(day: string, lesson: number): void {
    const key = `${day}:${lesson}`;
    const index = this.draft.unavailable.indexOf(key);
    if (index >= 0) {
      this.draft.unavailable.splice(index, 1);
    } else {
      this.draft.unavailable.push(key);
    }
  }

  isBusy(day: string, lesson: number): boolean {
    return this.draft.unavailable.includes(`${day}:${lesson}`);
  }

  savePref(row: Row): void {
    this.busy.set(true);
    this.error.set(null);
    this.dovidnyky.savePref({
      employee_id: row.employee.id,
      unavailable: this.draft.unavailable,
      max_lessons_per_day: this.draft.max_lessons_per_day || null,
      comment: this.draft.comment || null,
    }).subscribe({
      next: () => {
        this.editing.set(null);
        this.load();
      },
      error: (error: ApiError) => {
        this.error.set(error.message);
        this.busy.set(false);
      },
    });
  }

  prefSummary(row: Row): string {
    const parts: string[] = [];
    const count = row.pref?.unavailable?.length ?? 0;
    if (count) { parts.push(`недоступний ${count} ${count === 1 ? 'урок' : 'уроків'}`); }
    if (row.pref?.max_lessons_per_day) {
      parts.push(`не більше ${row.pref.max_lessons_per_day} уроків на день`);
    }
    return parts.join(' · ') || '—';
  }

  /**
   * Звільнити — не видалити.
   *
   * Педагог лишається в базі з усім торішнім навантаженням (`is_active`,
   * той самий прийом, що й у `Room`/`Subject`); зникає лише з публічної
   * сторінки «Наша команда» і з підказок, кому запропонувати нову годину.
   * Справжнього видалення тут більше немає навмисно: воно однаково
   * впало б — навантаження, хай і торішнє, тримає педагога назавжди.
   */
  askDeactivate(row: Row): void {
    this.pending.set(row);
  }

  confirmDeactivate(): void {
    const row = this.pending();
    if (!row) { return; }
    this.busy.set(true);
    this.dovidnyky.updateEmployee(row.employee.id, { is_active: false }).subscribe({
      next: () => {
        this.pending.set(null);
        this.load();
      },
      error: (error: ApiError) => {
        this.busy.set(false);
        this.pending.set(null);
        this.error.set(error.message);
      },
    });
  }

  cancelDeactivate(): void {
    this.pending.set(null);
  }

  /** Повернути — без підтвердження, це не руйнівна дія. */
  reactivate(row: Row): void {
    this.busy.set(true);
    this.dovidnyky.updateEmployee(row.employee.id, { is_active: true }).subscribe({
      next: () => this.load(),
      error: (error: ApiError) => {
        this.busy.set(false);
        this.error.set(error.message);
      },
    });
  }

  startHire(): void {
    this.hireDraft = this.blankHire();
    this.hireError.set(null);
    this.hiring.set(true);
  }

  cancelHire(): void {
    this.hiring.set(false);
  }

  /**
   * Найняти нового вчителя.
   *
   * Той самий список, що на «Наша команда» — новий рядок з'являється
   * і там-таки. Фото, біографію та інше — заповнить сам педагог чи
   * той, хто веде публічну частину сайту; тут лише те, що потрібно
   * розкладу.
   */
  hire(): void {
    const { last_name, first_name, middle_name, position, subjects } = this.hireDraft;
    if (!last_name.trim() || !first_name.trim() || !position.trim()) {
      this.hireError.set('Прізвище, ім\'я та посада — обов\'язкові.');
      return;
    }
    this.busy.set(true);
    this.hireError.set(null);
    this.dovidnyky.createEmployee({
      last_name: last_name.trim(),
      first_name: first_name.trim(),
      middle_name: middle_name.trim() || null,
      position: position.trim(),
      subjects: subjects.split(',').map(part => part.trim()).filter(Boolean),
    }).subscribe({
      next: () => {
        this.hiring.set(false);
        this.load();
      },
      error: (error: ApiError) => {
        this.busy.set(false);
        this.hireError.set(error.message);
      },
    });
  }
}
