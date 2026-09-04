import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Підтвердження дії, яку важко повернути.
 *
 * `usedBy` — те, що бекенд віддає з 409: перелік місць, де запис
 * згадується. Ковтати його не можна. «Ковальова Л. М. веде 18 годин
 * у 4 класах» пояснює відмову, а просто «не можна видалити» — ні.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss'],
})
export class ConfirmDialogComponent {
  @Input() title = 'Підтвердити';
  @Input() message = '';
  @Input() usedBy: string[] = [];
  @Input() confirmLabel = 'Так';
  @Input() cancelLabel = 'Скасувати';
  /** true — показуємо лише пояснення й кнопку «Зрозуміло». */
  @Input() blocked = false;
  @Input() busy = false;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
