import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { ApiError } from '../../services/api.service';
import { RozkladService } from '../../services/rozklad.service';
import {
  BLOCKING_KINDS, Run, ValidateResult,
} from '../../models/rozklad.models';

/** Огляд: чи готові дані для розрахунку розкладу. */
@Component({
  selector: 'app-rozklad-dashboard',
  standalone: true,
  imports: [FormsModule, RouterLink, ConfirmDialogComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private rozklad = inject(RozkladService);

  readonly check = signal<ValidateResult | null>(null);
  readonly runs = signal<Run[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  /**
   * Розрахунок, який ось-ось видалять.
   *
   * Через підтвердження, а не одразу: разом із розрахунком зникає й сам
   * розклад — усі його уроки. Це не той випадок, коли промах мишею
   * можна виправити повторним натисканням.
   */
  readonly pending = signal<Run | null>(null);

  /**
   * Те, що справді зупиняє розрахунок — за видом проблеми, а не за рівнем.
   *
   * Раніше сюди йшли всі `error`, і серед них були такі, з якими розклад
   * чудово складається. На реальній школі це виглядало як 19 червоних
   * рядків під заголовком «Заважає порахувати», жоден із яких нічому
   * не заважав, — а справжня причина губилася поміж ними.
   */
  readonly errors = computed(
    () => this.check()?.problems.filter(
      p => p.level === 'error' && BLOCKING_KINDS.includes(p.kind)) ?? []);

  /** Помилки, з якими розклад усе одно складеться. Окремо й тихіше. */
  readonly notBlocking = computed(
    () => this.check()?.problems.filter(
      p => p.level === 'error' && !BLOCKING_KINDS.includes(p.kind)) ?? []);

  readonly warnings = computed(
    () => this.check()?.problems.filter(p => p.level === 'warning') ?? []);

  ngOnInit(): void {
    this.refresh();
    this.loadRuns();
  }

  private loadRuns(): void {
    this.rozklad.runs(8).subscribe({
      next: runs => this.runs.set(runs),
      error: () => this.runs.set([]),
    });
  }

  askDelete(run: Run): void {
    this.pending.set(run);
  }

  confirmDelete(): void {
    const run = this.pending();
    if (!run) { return; }
    this.busy.set(true);
    this.error.set(null);
    this.rozklad.remove(run.id).subscribe({
      next: () => {
        this.pending.set(null);
        this.busy.set(false);
        this.loadRuns();
      },
      error: (error: ApiError) => {
        this.pending.set(null);
        this.error.set(error.message);
        this.busy.set(false);
      },
    });
  }

  refresh(): void {
    this.busy.set(true);
    this.error.set(null);
    this.rozklad.validate().subscribe({
      next: result => {
        this.check.set(result);
        this.busy.set(false);
      },
      error: (error: ApiError) => {
        this.error.set(error.message);
        this.busy.set(false);
      },
    });
  }

  runLabel(run: Run): string {
    const modes: Record<string, string> = {
      build: 'складено', evaluate: 'оцінено',
      improve: 'покращено', imported: 'завантажено',
    };
    return modes[run.mode] ?? run.mode;
  }
}
