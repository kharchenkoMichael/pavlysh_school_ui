import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiError } from '../../services/api.service';
import { DovidnykyService } from '../../services/dovidnyky.service';
import { Year, YearRolloverResult } from '../../models/rozklad.models';

/**
 * Навчальні роки: перемикач і перенос (`PLAN_ROKY.md`, розділ 2).
 *
 * Сторінка навмисно самодостатня: після переносу результат показується
 * тут-таки, у звіті. Інші сторінки (класи, навантаження, кабінети…)
 * поки не фільтрують за роком — це наступний крок, ще не зроблений,
 * тож перемикач тут змінює, який рік «поточний» для нових записів,
 * але список того, що бачать інші сторінки, поки не звужує.
 */
@Component({
  selector: 'app-rozklad-roky',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './roky.component.html',
  styleUrls: ['./roky.component.scss'],
})
export class RokyComponent implements OnInit {
  private dovidnyky = inject(DovidnykyService);

  readonly years = signal<Year[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<YearRolloverResult | null>(null);

  name = '';
  firstGradeCount = 0;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.dovidnyky.years().subscribe({
      next: years => {
        this.years.set(years);
        if (!this.name) { this.name = this.suggestName(years); }
      },
      error: (error: ApiError) => this.error.set(error.message),
    });
  }

  activate(year: Year): void {
    if (year.is_current || this.busy()) { return; }
    this.busy.set(true);
    this.error.set(null);
    this.dovidnyky.activateYear(year.id).subscribe({
      next: () => { this.busy.set(false); this.load(); },
      error: (error: ApiError) => { this.busy.set(false); this.error.set(error.message); },
    });
  }

  rollover(): void {
    const name = this.name.trim();
    if (!name || this.busy()) { return; }
    this.busy.set(true);
    this.error.set(null);
    this.result.set(null);
    this.dovidnyky.rolloverYear(name, this.firstGradeCount || 0).subscribe({
      next: result => {
        this.busy.set(false);
        this.result.set(result);
        this.name = '';
        this.firstGradeCount = 0;
        this.load();
      },
      error: (error: ApiError) => { this.busy.set(false); this.error.set(error.message); },
    });
  }

  /** Наступний за поточним: «2025–2026» → «2026–2027». Не вгадав — порожньо. */
  private suggestName(years: Year[]): string {
    const current = years.find(y => y.is_current)?.name ?? '';
    const match = /^(\d{4})–(\d{4})$/.exec(current);
    if (!match) { return ''; }
    const start = Number(match[1]) + 1;
    return `${start}–${start + 1}`;
  }
}
