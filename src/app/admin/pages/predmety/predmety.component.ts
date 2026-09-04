import { Component, OnInit, inject } from '@angular/core';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { Column, DovidnykTableComponent } from '../../shared/dovidnyk-table/dovidnyk-table.component';
import { CrudState } from '../../shared/crud-state';
import { DovidnykyService } from '../../services/dovidnyky.service';
import { ROOM_KINDS, Subject } from '../../models/rozklad.models';

/**
 * Предмети.
 *
 * `Синоніми` — не декорація: за ними предмет упізнається в картках
 * учителів на сайті («Алгебра», «Геометрія» → Математика) і в чужому
 * CSV торішнього розкладу. Не впізнаний предмет означає, що рядок
 * розкладу не зіставиться й оцінка порахується без нього.
 */
@Component({
  selector: 'app-rozklad-predmety',
  standalone: true,
  imports: [DovidnykTableComponent, ConfirmDialogComponent],
  templateUrl: './predmety.component.html',
  styleUrls: ['../../shared/page.scss'],
})
export class PredmetyComponent implements OnInit {
  private dovidnyky = inject(DovidnykyService);

  readonly crud = new CrudState<Subject>({
    list: () => this.dovidnyky.subjects(),
    create: value => this.dovidnyky.createSubject(value),
    update: (id, value) => this.dovidnyky.updateSubject(id, value),
    remove: id => this.dovidnyky.deleteSubject(id),
    describe: subject => `предмет «${subject.name}»`,
  });

  readonly columns: Column[] = [
    { key: 'name', label: 'Назва', required: true, width: '22%' },
    { key: 'code', label: 'Код', required: true, width: '12%',
      hint: 'Латинкою, без пробілів. На нього посилаються правила' },
    { key: 'room_kind', label: 'Потрібен кабінет', type: 'select',
      options: ROOM_KINDS, width: '18%' },
    { key: 'is_hard', label: 'Складний', type: 'checkbox', width: '9%',
      hint: 'Складні предмети правило ставить у першу половину дня' },
    { key: 'aliases', label: 'Синоніми', type: 'tags', width: '28%',
      placeholder: 'Алгебра, Геометрія',
      hint: 'Через кому. За ними предмет упізнається в чужих даних' },
    { key: 'sort_order', label: '№', type: 'number', width: '7%' },
    { key: 'is_active', label: 'Діє', type: 'checkbox', width: '4%',
      hint: 'Вимкни, коли предмет більше не викладають — видалити не можна, '
        + 'бо торішнє навантаження й далі на нього посилається' },
  ];

  readonly blank = {
    name: '', code: '', room_kind: 'any', is_hard: false, aliases: '', sort_order: 0,
    is_active: true,
  };

  ngOnInit(): void {
    this.crud.load();
  }
}
