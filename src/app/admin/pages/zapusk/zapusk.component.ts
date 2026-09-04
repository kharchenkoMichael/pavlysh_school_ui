import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiError } from '../../services/api.service';
import { RozkladService } from '../../services/rozklad.service';
import {
  Run, RunMode, ValidateResult,
} from '../../models/rozklad.models';

const CSV_SAMPLE = 'klas,den,urok,predmet,vchytel,zmina,hrupa\n'
  + '5-Б,pn,1,Математика,Харченко М.О.,z1,\n'
  + '5-Б,pn,2,Інформатика,Харченко М.О.,z1,A\n'
  + '5-Б,pn,2,Інформатика,Шевченко А.А.,z1,B\n';

/**
 * Запуск розрахунку.
 *
 * Три режими, і головний із них — не «скласти з нуля». Завучу потрібен
 * не новий розклад, а свій без вікон: завантажити торішній, побачити його
 * оцінку числом і покращити, переставивши мінімум уроків.
 */
@Component({
  selector: 'app-rozklad-zapusk',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './zapusk.component.html',
  styleUrls: ['./zapusk.component.scss', '../../shared/page.scss'],
})
export class ZapuskComponent implements OnInit {
  private rozklad = inject(RozkladService);
  private router = inject(Router);

  readonly sample = CSV_SAMPLE;

  mode: RunMode = 'build';
  title = '';
  timeLimit = 120;
  basedOn: number | null = null;
  keepWeight = 20;
  /**
   * Скільки тижнів у циклі. Питаємо лише для «скласти з нуля»: оцінка
   * й покращення успадковують довжину циклу від самого розкладу, і
   * вибирати її окремо там означало б дати змогу помилитися.
   */
  weeks = 2;

  readonly runs = signal<Run[]>([]);
  readonly check = signal<ValidateResult | null>(null);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  /** Що вийшло з останнього завантаження CSV. */
  readonly imported = signal<Run | null>(null);
  readonly importing = signal(false);
  readonly importError = signal<string | null>(null);
  csvText = '';
  fileName = '';

  /** Розклади, від яких можна відштовхнутися: завантажені й складені. */
  readonly sources = computed(
    () => this.runs().filter(run => run.status === 'done'
      && (run.mode === 'imported' || run.mode === 'build' || run.mode === 'improve')));

  readonly needsSource = computed(
    () => this.mode === 'evaluate' || this.mode === 'improve');

  readonly blockers = computed(
    () => this.check()?.problems.filter(problem => problem.level === 'error') ?? []);

  ngOnInit(): void {
    this.reload();
    this.recheck();
  }

  /**
   * Перевірити дані — саме на тій довжині циклу, яку зараз вибрано.
   *
   * Інакше сторінка показувала б помилки іншої задачі: на тижневому
   * циклі половини годин округлюються вгору, і клас, який на двох
   * тижнях уміщається без запасу, «не влазить».
   */
  recheck(): void {
    this.rozklad.validate(this.weeks).subscribe({
      next: result => this.check.set(result),
      error: () => this.check.set(null),
    });
  }

  reload(): void {
    this.rozklad.runs(30).subscribe({
      next: runs => {
        this.runs.set(runs);
        if (this.basedOn === null) {
          this.basedOn = this.sources()[0]?.id ?? null;
        }
      },
      error: (error: ApiError) => this.error.set(error.message),
    });
  }

  pickFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) { return; }
    this.fileName = file.name;
    const reader = new FileReader();
    reader.onload = () => { this.csvText = String(reader.result ?? ''); };
    reader.readAsText(file, 'utf-8');
  }

  upload(): void {
    if (!this.csvText.trim()) { return; }
    this.importing.set(true);
    this.importError.set(null);
    this.imported.set(null);

    this.rozklad.importCsv(this.csvText, this.fileName || 'Наявний розклад').subscribe({
      next: run => {
        this.imported.set(run);
        this.importing.set(false);
        this.csvText = '';
        this.fileName = '';
        // Одразу пропонуємо саме його — заради нього CSV і завантажували
        this.basedOn = run.id;
        if (this.mode === 'build') { this.mode = 'evaluate'; }
        this.reload();
      },
      error: (error: ApiError) => {
        this.importError.set(error.message);
        this.importing.set(false);
      },
    });
  }

  start(): void {
    this.busy.set(true);
    this.error.set(null);
    this.rozklad.start({
      mode: this.mode,
      title: this.title.trim() || null,
      time_limit: this.timeLimit,
      based_on_run_id: this.needsSource() ? this.basedOn : null,
      keep_weight: this.mode === 'improve' ? this.keepWeight : null,
      // Для решти режимів довжину циклу вирішує сам розклад, від якого
      // рахують; надіслати своє число означало б посваритися з ним.
      weeks: this.mode === 'build' ? this.weeks : null,
    }).subscribe({
      // id одразу йде в адресу: розрахунок триває хвилини, і випадковий F5
      // не має його загубити
      next: run => this.router.navigate(['/rozklad/rezultat', run.id]),
      error: (error: ApiError) => {
        this.error.set(error.message);
        this.busy.set(false);
      },
    });
  }

  runLabel(run: Run): string {
    const modes: Record<string, string> = {
      build: 'складений', evaluate: 'оцінка',
      improve: 'покращений', imported: 'завантажений',
    };
    const penalty = run.penalty === null || run.penalty === undefined
      ? '' : `, штраф ${run.penalty}`;
    return `№${run.id} · ${modes[run.mode] ?? run.mode}${penalty}`
      + (run.title ? ` · ${run.title}` : '');
  }
}
