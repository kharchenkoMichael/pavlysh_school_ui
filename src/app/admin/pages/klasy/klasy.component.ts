import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { map } from 'rxjs/operators';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { Column, DovidnykTableComponent } from '../../shared/dovidnyk-table/dovidnyk-table.component';
import { CrudState } from '../../shared/crud-state';
import { ApiError } from '../../services/api.service';
import { DovidnykyService } from '../../services/dovidnyky.service';
import {
  Employee, GroupTimetable, Shift, teacherLabel,
} from '../../models/rozklad.models';

/** Класи: паралель, класний керівник, зміна. Головний екран щоденної роботи. */
@Component({
  selector: 'app-rozklad-klasy',
  standalone: true,
  imports: [FormsModule, DovidnykTableComponent, ConfirmDialogComponent],
  templateUrl: './klasy.component.html',
  styleUrls: ['./klasy.component.scss', '../../shared/page.scss'],
})
export class KlasyComponent implements OnInit {
  private dovidnyky = inject(DovidnykyService);

  newName = '';

  readonly shifts = signal<Shift[]>([]);
  readonly columns = signal<Column[]>([]);
  readonly addError = signal<string | null>(null);

  readonly crud = new CrudState<GroupTimetable>({
    // Порожнє `in_timetable` означає «так»: класи заведені на публічній
    // частині нічого про розклад не знають. Але поки воно лишалося порожнім,
    // відкриття рядка на редагування показувало зняту галочку — і клас
    // тихо вимикався з розрахунку. Тому нормалізуємо одразу на вході.
    list: () => this.dovidnyky.groups().pipe(map(groups => groups.map(group => ({
      ...group,
      in_timetable: group.in_timetable !== false,
    })))),
    update: (id, value) => this.dovidnyky.updateGroup(id, value),
    remove: id => this.dovidnyky.deleteGroup(id) as any,
    describe: group => `клас ${group.name}`,
  });

  /** Класи, що беруть участь у розкладі. Решта — лише в списку. */
  private readonly inTimetable = computed(
    () => this.crud.rows().filter(group => group.in_timetable !== false));

  readonly teachers = signal<Employee[]>([]);

  /** Класи без класного керівника — у них не буде години класного керівника. */
  readonly withoutClassTeacher = computed(
    () => this.inTimetable().filter(g => !g.class_teacher_id).map(g => g.name));

  ngOnInit(): void {
    this.crud.load();
    // Стовпчики залежать і від змін, і від педагогів, тож будуються
    // після обох. Приїхати вони можуть у будь-якому порядку — тому
    // не «після другого», а після кожного.
    this.dovidnyky.shifts().subscribe({
      next: shifts => {
        this.shifts.set(shifts);
        this.buildColumns(shifts);
      },
      error: () => this.buildColumns([]),
    });
    this.dovidnyky.allEmployees().subscribe({
      next: page => {
        this.teachers.set([...page.items].sort(
          (a, b) => teacherLabel(a).localeCompare(teacherLabel(b), 'uk')));
        this.buildColumns(this.shifts());
      },
    });
  }

  private buildColumns(shifts: Shift[]): void {
    this.columns.set([
      { key: 'name', label: 'Клас', width: '9%', readonly: true },
      { key: 'parallel', label: 'Паралель', type: 'number', width: '8%' },
      {
        key: 'class_teacher_id', label: 'Класний керівник', type: 'select',
        width: '20%',
        hint: 'Веде годину класного керівника — у п\'ятницю після '
            + 'останнього уроку, у своєму кабінеті',
        options: [
          { value: null, label: '— не вказано —' },
          ...this.teachers().map(person => ({
            value: person.id, label: teacherLabel(person),
          })),
        ],
      },
      {
        key: 'shift_code', label: 'Зміна', type: 'select', width: '15%',
        hint: 'Порожньо — зміну підбере програма',
        options: [
          { value: null, label: 'підбере програма' },
          ...shifts.map(shift => ({ value: shift.code, label: shift.name })),
        ],
      },
      { key: 'lessons', label: 'Уроки', type: 'range', width: '13%', legacyKey: 'max_lessons',
        hint: 'З якого уроку по який учиться клас, напр. 4–8 для тих, хто '
            + 'приходить пізніше. Порожньо — уся сітка зміни' },
      { key: 'in_timetable', label: 'Рахувати', type: 'checkbox', width: '10%',
        hint: 'Чи ставити цей клас у розклад. Зніміть, щоб виключити його '
            + 'з розрахунку, не видаляючи — так прибирають, наприклад, '
            + 'початкову школу, якщо її розклад складає хтось інший' },
    ]);
  }

  addGroup(): void {
    const name = this.newName.trim();
    if (!name) { return; }
    this.addError.set(null);
    this.dovidnyky.createGroup(name).subscribe({
      next: () => {
        this.newName = '';
        this.crud.load();
      },
      error: (error: ApiError) => this.addError.set(error.message),
    });
  }
}
