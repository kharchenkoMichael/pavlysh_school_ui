import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

/** Опис одного стовпчика довідника. */
export interface Column {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'checkbox' | 'select' | 'tags' | 'range';
  options?: { value: any; label: string }[];
  width?: string;
  hint?: string;
  required?: boolean;
  /** Показуємо, але не даємо змінити (наприклад, назву класу). */
  readonly?: boolean;
  placeholder?: string;
  /**
   * Тільки для `type: 'range'`: старе поле-лічильник («уроків на день»),
   * яке цей стовпчик замінює. Під час редагування якщо масив (`key`)
   * порожній, діапазон підказує себе з нього як 1..N; під час збереження
   * лічильник завжди обнуляється — `key` стає єдиним джерелом правди,
   * щоб не тримати два способи сказати те саме, які можуть розійтися.
   */
  legacyKey?: string;
}

export interface SaveEvent {
  id: number | null;          // null — це новий запис
  value: Record<string, any>;
}

/**
 * Таблиця довідника з редагуванням просто в рядку.
 *
 * Один компонент замість чотирьох майже однакових сторінок. Правки
 * робляться в рядку, а не в модальному вікні: завуч вносить десятки
 * дрібних змін поспіль, і закривати діалог після кожної — це втома
 * на рівному місці.
 */
@Component({
  selector: 'app-dovidnyk-table',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './dovidnyk-table.component.html',
  styleUrls: ['./dovidnyk-table.component.scss'],
})
export class DovidnykTableComponent {
  @Input({ required: true }) columns: Column[] = [];
  @Input({ required: true }) rows: any[] = [];
  @Input() canAdd = true;
  @Input() canDelete = true;
  @Input() addLabel = 'Додати';
  @Input() emptyText = 'Порожньо.';
  /** Значення за замовчуванням для нового рядка. */
  @Input() blank: Record<string, any> = {};
  @Input() busy = false;

  @Output() save = new EventEmitter<SaveEvent>();
  @Output() remove = new EventEmitter<any>();

  readonly editingId = signal<number | null>(null);
  readonly adding = signal(false);
  draft: Record<string, any> = {};

  startEdit(row: any): void {
    this.adding.set(false);
    this.editingId.set(row.id);
    this.draft = { ...row };
    // теги редагуються рядком через кому — так швидше, ніж окремим полем
    for (const column of this.columns) {
      if (column.type === 'tags') {
        this.draft[column.key] = (row[column.key] ?? []).join(', ');
      }
      if (column.type === 'range') {
        const [from, to] = this.rangeOf(row, column);
        this.draft[column.key + '__from'] = from;
        this.draft[column.key + '__to'] = to;
      }
    }
  }

  /** Межі діапазону: з масиву, а як його нема — зі старого лічильника (1..N). */
  private rangeOf(row: any, column: Column): [number | null, number | null] {
    const arr = row[column.key];
    if (Array.isArray(arr) && arr.length) {
      return [Math.min(...arr), Math.max(...arr)];
    }
    const legacy = column.legacyKey ? row[column.legacyKey] : null;
    return legacy ? [1, legacy] : [null, null];
  }

  startAdd(): void {
    this.editingId.set(null);
    this.adding.set(true);
    this.draft = { ...this.blank };
  }

  cancel(): void {
    this.editingId.set(null);
    this.adding.set(false);
    this.draft = {};
  }

  commit(): void {
    const value: Record<string, any> = {};
    for (const column of this.columns) {
      if (column.readonly && this.editingId() !== null) { continue; }
      if (column.type === 'range') {
        const from = this.draft[column.key + '__from'];
        const to = this.draft[column.key + '__to'];
        const filled = (n: any) => n !== null && n !== undefined && n !== '';
        value[column.key] = filled(from) && filled(to)
          ? Array.from({ length: Number(to) - Number(from) + 1 }, (_, i) => Number(from) + i)
          : null;
        // Діапазон — єдине джерело правди: старий лічильник завжди
        // обнуляється разом із ним, щоб не лишався застарілим і не
        // розходився з тим, що завуч щойно ввів.
        if (column.legacyKey) { value[column.legacyKey] = null; }
        continue;
      }
      let raw = this.draft[column.key];
      if (column.type === 'tags') {
        raw = String(raw ?? '')
          .split(',')
          .map(part => part.trim())
          .filter(Boolean);
      }
      if (column.type === 'number') {
        raw = raw === '' || raw === null || raw === undefined ? null : Number(raw);
      }
      if (column.type === 'checkbox') {
        raw = !!raw;
      }
      value[column.key] = raw;
    }
    this.save.emit({ id: this.editingId(), value });
    this.cancel();
  }

  /** Чи заповнені всі обов'язкові поля — щоб не слати заявно биті дані. */
  get valid(): boolean {
    return this.columns
      .filter(column => column.required)
      .every(column => {
        const value = this.draft[column.key];
        return value !== null && value !== undefined && String(value).trim() !== '';
      });
  }

  show(row: any, column: Column): string {
    if (column.type === 'range') {
      const [from, to] = this.rangeOf(row, column);
      return from === null ? 'уся сітка' : `${from}–${to}`;
    }
    const value = row[column.key];
    if (value === null || value === undefined || value === '') { return '—'; }
    if (column.type === 'checkbox') { return value ? 'так' : 'ні'; }
    if (column.type === 'tags') {
      return Array.isArray(value) && value.length ? value.join(', ') : '—';
    }
    if (column.type === 'select') {
      return column.options?.find(option => option.value === value)?.label ?? String(value);
    }
    return String(value);
  }
}
