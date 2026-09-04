import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { Column, DovidnykTableComponent } from '../../shared/dovidnyk-table/dovidnyk-table.component';
import { CrudState } from '../../shared/crud-state';
import { ApiError } from '../../services/api.service';
import { DovidnykyService } from '../../services/dovidnyky.service';
import {
  Employee, ROOM_KINDS, Room, Subject, teacherLabel,
} from '../../models/rozklad.models';

/**
 * Кабінети.
 *
 * Тут два різні питання, і плутати їх не можна.
 *
 * **Скільки кабінетів кожного типу** — це жорстка межа: одночасних
 * уроків інформатики не буває більше, ніж кабінетів інформатики,
 * і трьох учителів у два кабінети не посадиш, скільки не переставляй.
 *
 * **За ким кабінет закріплений** — це пріоритет, а не заборона: спершу
 * закріплений, потім хто веде той самий предмет, потім будь-хто.
 * Коли двоє закріплених за одним кабінетом стоять одночасно, той, хто
 * програв, іде в інший вільний звичайний. У торішньому розкладі таких
 * випадків 201 із 1388 уроків, і жоден із них не помилка.
 */
@Component({
  selector: 'app-rozklad-kabinety',
  standalone: true,
  imports: [FormsModule, DovidnykTableComponent, ConfirmDialogComponent],
  templateUrl: './kabinety.component.html',
  styleUrls: ['./kabinety.component.scss', '../../shared/page.scss'],
})
export class KabinetyComponent implements OnInit {
  private dovidnyky = inject(DovidnykyService);

  readonly crud = new CrudState<Room>({
    list: () => this.dovidnyky.rooms(),
    create: value => this.dovidnyky.createRoom(value),
    update: (id, value) => this.dovidnyky.updateRoom(id, value),
    remove: id => this.dovidnyky.deleteRoom(id),
    describe: room => `кабінет «${room.name}»`,
  });

  readonly teachers = signal<Employee[]>([]);
  readonly subjects = signal<Subject[]>([]);
  readonly linkError = signal<string | null>(null);

  /** Який кабінет зараз дописуємо. `null` — жоден. */
  readonly adding = signal<number | null>(null);
  draftTeacher: number | null = null;
  draftSubject: number | null = null;

  readonly teacherLabel = teacherLabel;

  readonly columns: Column[] = [
    { key: 'name', label: 'Назва', required: true, width: '28%' },
    { key: 'kind', label: 'Тип', type: 'select', options: ROOM_KINDS, width: '20%',
      hint: 'Має збігатися з типом, який потребує предмет' },
    { key: 'corpus', label: 'Корпус', width: '12%',
      hint: 'Головний, бібліотечний, музичний, хімічний — щоб розрізнити '
          + 'три «кабінети математики»' },
    { key: 'capacity', label: 'Місткість', type: 'number', width: '8%',
      hint: 'Скільки класів одночасно вміщає сам кабінет — 1, якщо не '
          + 'великий спортзал чи подібне' },
    { key: 'max_parallel', label: 'До паралелі', type: 'number', width: '9%',
      hint: 'Найстарша паралель, якій дозволено цей кабінет — порожньо, '
          + 'якщо всім (напр. другий спортзал тільки для 1–5 класів: тут 5)' },
    { key: 'dedicated_groups', label: 'Свій для класів', type: 'tags', width: '13%',
      hint: 'Назви класів через кому, яким кабінет належить виключно — '
          + 'клас завжди вчиться саме тут, а не інколи потрапляє в чужий '
          + 'вільний. Порожньо — кабінет цього типу спільний, як завжди' },
    { key: 'is_active', label: 'Діє', type: 'checkbox', width: '5%' },
    { key: 'sort_order', label: 'Порядок', type: 'number', width: '5%' },
  ];

  readonly blank = {
    name: '', kind: 'any', corpus: null, capacity: 1, max_parallel: null,
    dedicated_groups: [], is_active: true, sort_order: 0,
  };

  ngOnInit(): void {
    this.crud.load();
    // `allEmployees`, а не перша сторінка: педагогів сорок, а сторінка
    // віддає сто — але межа тут не в кількості, а в тому, що просити
    // більше сотні бекенд не дає, і саме на цьому сторінка вчителів
    // колись показувала порожній список.
    this.dovidnyky.allEmployees().subscribe({
      next: page => this.teachers.set(
        [...page.items].sort((a, b) => teacherLabel(a).localeCompare(
          teacherLabel(b), 'uk'))),
    });
    this.dovidnyky.subjects().subscribe({
      next: list => this.subjects.set(list),
    });
  }

  /** Скільки кабінетів кожного типу — головне число цієї сторінки. */
  countByKind(): { label: string; count: number }[] {
    return ROOM_KINDS.map(kind => ({
      label: kind.label,
      count: this.crud.rows().filter(room => room.kind === kind.value && room.is_active).length,
    })).filter(item => item.count > 0);
  }

  /** Кабінети, за якими нікого не закріплено — їх варто бачити окремо. */
  readonly unassigned = computed(
    () => this.crud.rows().filter(room => !(room.assignments?.length)));

  startAdd(room: Room): void {
    this.linkError.set(null);
    this.adding.set(room.id);
    this.draftTeacher = null;
    this.draftSubject = null;
  }

  cancelAdd(): void {
    this.adding.set(null);
  }

  addLink(room: Room): void {
    if (!this.draftTeacher && !this.draftSubject) {
      this.linkError.set('Закріплення має вказувати вчителя, предмет або обох.');
      return;
    }
    this.linkError.set(null);
    this.dovidnyky.createRoomAssignment({
      room_id: room.id,
      employee_id: this.draftTeacher,
      subject_id: this.draftSubject,
    }).subscribe({
      // Перечитуємо весь список, а не дописуємо рядок на місці: підписи
      // («Ткаченко Л.І.», «Географія») складає бекенд, і збирати їх тут
      // удруге означало б тримати другий, потайки розбіжний, спосіб.
      next: () => { this.adding.set(null); this.crud.load(); },
      error: (error: ApiError) => this.linkError.set(error.message),
    });
  }

  removeLink(id: number): void {
    this.dovidnyky.deleteRoomAssignment(id).subscribe({
      next: () => this.crud.load(),
      error: (error: ApiError) => this.linkError.set(error.message),
    });
  }
}
