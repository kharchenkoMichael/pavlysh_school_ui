import { signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiError } from '../services/api.service';
import { SaveEvent } from './dovidnyk-table/dovidnyk-table.component';

export interface CrudOps<T> {
  list: () => Observable<T[]>;
  create?: (value: any) => Observable<T>;
  update?: (id: number, value: any) => Observable<T>;
  remove?: (id: number) => Observable<unknown>;
  /** Як назвати запис у питанні «Видалити …?». */
  describe?: (row: T) => string;
}

/**
 * Стан довідникової сторінки: список, збереження, видалення з поясненням.
 *
 * Винесено з компонентів, бо в чотирьох довідниках ця частина однакова
 * до літери, а найважливіше в ній — те, що легко зробити недбало:
 * відповідь 409 не ковтається, а показується разом зі списком, де саме
 * запис використовується.
 */
export class CrudState<T extends { id: number }> {
  readonly rows = signal<T[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  /** Що збираємося видалити — і чи не заборонив це бекенд. */
  readonly pending = signal<T | null>(null);
  readonly blocked = signal<{ message: string; usedBy: string[] } | null>(null);

  constructor(private ops: CrudOps<T>) {}

  load(): void {
    this.busy.set(true);
    this.ops.list().subscribe({
      next: rows => {
        this.rows.set(rows);
        this.busy.set(false);
      },
      error: (error: ApiError) => {
        this.error.set(error.message);
        this.busy.set(false);
      },
    });
  }

  save(event: SaveEvent): void {
    const request = event.id === null
      ? this.ops.create?.(event.value)
      : this.ops.update?.(event.id, event.value);
    if (!request) { return; }

    this.busy.set(true);
    this.error.set(null);
    request.subscribe({
      next: () => this.load(),
      error: (error: ApiError) => {
        // 409 при збереженні — це «такий запис уже є», а не поломка
        this.error.set(error.isConflict
          ? `${error.message} ${error.usedBy.join(', ')}`.trim()
          : error.message);
        this.busy.set(false);
      },
    });
  }

  askDelete(row: T): void {
    this.error.set(null);
    this.blocked.set(null);
    this.pending.set(row);
  }

  confirmDelete(): void {
    const row = this.pending();
    if (!row || !this.ops.remove) { return; }

    this.busy.set(true);
    this.ops.remove(row.id).subscribe({
      next: () => {
        this.pending.set(null);
        this.load();
      },
      error: (error: ApiError) => {
        this.busy.set(false);
        this.pending.set(null);
        if (error.isConflict) {
          // Не «не вдалося видалити», а перелік, де воно згадується:
          // саме він пояснює, що робити далі.
          this.blocked.set({ message: error.message, usedBy: error.usedBy });
        } else {
          this.error.set(error.message);
        }
      },
    });
  }

  cancelDelete(): void {
    this.pending.set(null);
    this.blocked.set(null);
  }

  describe(row: T | null): string {
    if (!row) { return ''; }
    return this.ops.describe?.(row) ?? `запис №${row.id}`;
  }
}
