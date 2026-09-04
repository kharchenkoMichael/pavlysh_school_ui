import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiError } from '../../services/api.service';
import { PravylaService } from '../../services/pravyla.service';
import { Rule, RuleSpec } from '../../models/rozklad.models';

type Mode = 'hard' | 'soft' | 'off';

interface Row {
  rule: Rule;
  spec?: RuleSpec;
  mode: Mode;
}

/**
 * Правила складання розкладу.
 *
 * Найважливіше тут — не перемикачі, а пояснення. Завуч має бачити, що
 * правило не вигадане програмістом: «складні предмети зранку» спирається
 * на санітарний регламент, а не на чиюсь думку. Саме з цим документом
 * потім іде розмова про розклад.
 *
 * Пояснення приходять із бекенда разом із каталогом — щоб додане в солвері
 * правило не довелося описувати ще й тут.
 */
@Component({
  selector: 'app-rozklad-pravyla',
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet],
  templateUrl: './pravyla.component.html',
  styleUrls: ['./pravyla.component.scss', '../../shared/page.scss'],
})
export class PravylaComponent implements OnInit {
  private pravyla = inject(PravylaService);

  readonly rows = signal<Row[]>([]);
  readonly catalog = signal<RuleSpec[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly saved = signal<string | null>(null);

  /**
   * Три купки замість одного списку.
   *
   * Перше питання завуча — «що тут виконується залізно, а що можна
   * посунути». Поки правила лежали одним списком, відповісти на нього
   * можна було, лише перечитавши всі.
   */
  readonly hardRows = computed(() => this.rows().filter(row => row.mode === 'hard'));
  readonly softRows = computed(() => this.rows()
    .filter(row => row.mode === 'soft')
    .sort((a, b) => b.rule.weight - a.rule.weight));
  readonly offRows = computed(() => this.rows().filter(row => row.mode === 'off'));

  /** Правила, які солвер уміє, а в довіднику школи їх ще немає. */
  readonly missing = computed(() => {
    const known = new Set(this.rows().map(row => row.rule.kind));
    return this.catalog().filter(spec => spec.kind !== 'keep_existing'
      && !known.has(spec.kind));
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.busy.set(true);
    forkJoin({
      rules: this.pravyla.list(),
      catalog: this.pravyla.catalog(),
    }).subscribe({
      next: ({ rules, catalog }) => {
        const specs = new Map(catalog.map(spec => [spec.kind, spec]));
        this.catalog.set(catalog);
        this.rows.set(rules.map(rule => ({
          rule,
          spec: specs.get(rule.kind),
          mode: this.modeOf(rule),
        })));
        this.busy.set(false);
      },
      error: (error: ApiError) => {
        this.error.set(error.message);
        this.busy.set(false);
      },
    });
  }

  private modeOf(rule: Rule): Mode {
    if (!rule.enabled) { return 'off'; }
    return rule.level === 'hard' ? 'hard' : 'soft';
  }

  /** Жорсткі за самою природою — фізика, а не побажання — не перемикаються. */
  fixed(row: Row): boolean {
    return !!row.spec?.hard_only;
  }

  setMode(row: Row, mode: Mode): void {
    if (this.fixed(row) || row.mode === mode) { return; }
    this.patch(row, {
      enabled: mode !== 'off',
      level: mode === 'hard' ? 'hard' : 'soft',
    });
  }

  setWeight(row: Row, weight: number): void {
    if (weight === row.rule.weight) { return; }
    this.patch(row, { weight });
  }

  /** Параметри правила: до якого уроку, скільки поспіль, які предмети. */
  paramKeys(row: Row): string[] {
    return Object.keys(row.rule.params ?? {});
  }

  paramLabel(key: string): string {
    const labels: Record<string, string> = {
      lesson: 'до якого уроку',
      n: 'скільки поспіль можна',
      lessons: 'на яких уроках (через кому)',
      subjects: 'для яких предметів (коди через кому)',
      tolerance: 'допустима різниця, учнів',
      slots: 'слоти (день:урок, через кому)',
      group: 'клас (назва), порожньо — для всіх класів',
      groups: 'класи (назви через кому), якщо їх кілька',
      exclude: 'крім цих класів (назви через кому)',
      employee: 'вчитель (прізвище і ініціали, як у картці)',
    };
    return labels[key] ?? key;
  }

  paramValue(row: Row, key: string): string {
    const value = (row.rule.params ?? {})[key];
    return Array.isArray(value) ? value.join(', ') : String(value ?? '');
  }

  setParam(row: Row, key: string, raw: string): void {
    const before = (row.rule.params ?? {})[key];
    const value = Array.isArray(before)
      ? raw.split(',').map(part => part.trim()).filter(Boolean)
        .map(part => (/^\d+$/.test(part) ? Number(part) : part))
      : (raw === '' ? null : (/^-?\d+$/.test(raw) ? Number(raw) : raw));
    this.patch(row, { params: { ...(row.rule.params ?? {}), [key]: value } });
  }

  private patch(row: Row, body: Partial<Rule>): void {
    this.busy.set(true);
    this.error.set(null);
    this.pravyla.update(row.rule.id, body).subscribe({
      next: updated => {
        this.rows.update(rows => rows.map(item => item.rule.id === updated.id
          ? { ...item, rule: updated, mode: this.modeOf(updated) }
          : item));
        this.busy.set(false);
        this.saved.set(row.rule.name);
        setTimeout(() => this.saved.set(null), 1500);
      },
      error: (error: ApiError) => {
        this.error.set(error.message);
        this.busy.set(false);
      },
    });
  }

  /**
   * Завести правила, які солвер уміє, а в школі їх ще немає.
   *
   * Так у програму можна дописати правило, і завуч побачить його тут
   * сам — без міграцій і без «зайдіть до розробника».
   */
  addMissing(): void {
    const specs = this.missing();
    if (!specs.length) { return; }
    this.busy.set(true);
    this.error.set(null);

    forkJoin(specs.map((spec, index) => this.pravyla.create({
      code: spec.kind, name: spec.name, kind: spec.kind,
      level: spec.level, weight: spec.weight, params: spec.params,
      comment: spec.comment, enabled: true, sort_order: 100 + index,
    }))).subscribe({
      next: () => this.load(),
      error: (error: ApiError) => {
        this.error.set(error.message);
        this.busy.set(false);
      },
    });
  }

  // ── своє правило ─────────────────────────────────────────
  //
  // Чого тут **не** можна, і сказати це чесно варто: вигадати
  // принципово новий вид обмеження без коду не вийде — солвер має
  // уміти його рахувати. Зате можна взяти будь-яке з тих, що він уміє,
  // і завести стільки копій із власними параметрами, скільки треба.
  // На практиці саме це й потрібно: звільнити ще один слот під нараду,
  // заборонити хімію останнім уроком, дозволити три уроки поспіль
  // замість двох. Кожне таке — окремий рядок, який видно й можна
  // вимкнути, а не правка в коді.

  /** Чи відкрита форма додавання. */
  readonly adding = signal(false);
  draft: { kind: string; name: string; level: 'hard' | 'soft'; weight: number;
           params: Record<string, string> } = this.blankDraft();

  private blankDraft() {
    return { kind: '', name: '', level: 'soft' as const, weight: 5,
             params: {} as Record<string, string> };
  }

  /** Види правил, які взагалі можна завести своїм рядком. */
  readonly addable = computed(() => this.catalog().filter(
    spec => !['keep_existing', 'keep_core'].includes(spec.kind)));

  /** Параметри вибраного виду — форма будується з каталогу солвера. */
  readonly draftParams = computed(() => {
    const spec = this.catalog().find(item => item.kind === this.draft.kind);
    return Object.keys(spec?.params ?? {});
  });

  startAdd(): void {
    this.draft = this.blankDraft();
    this.adding.set(true);
    this.error.set(null);
  }

  cancelAdd(): void {
    this.adding.set(false);
  }

  /** Вибрали вид — підставляємо його назву, вагу й параметри як заготовку. */
  pickKind(kind: string): void {
    const spec = this.catalog().find(item => item.kind === kind);
    this.draft.kind = kind;
    if (!spec) { return; }
    this.draft.name = spec.name;
    this.draft.level = spec.level;
    this.draft.weight = spec.weight;
    this.draft.params = {};
    for (const [key, value] of Object.entries(spec.params ?? {})) {
      this.draft.params[key] = Array.isArray(value)
        ? value.join(', ') : String(value ?? '');
    }
  }

  hintFor(kind: string): string {
    return this.catalog().find(item => item.kind === kind)?.comment ?? '';
  }

  saveNew(): void {
    const spec = this.catalog().find(item => item.kind === this.draft.kind);
    if (!spec) { this.error.set('Виберіть, що це за правило.'); return; }
    if (!this.draft.name.trim()) {
      this.error.set('Дайте правилу назву — за нею ви його знайдете.');
      return;
    }

    // Параметри розбираються за зразком із каталогу: де там список —
    // ділимо кому, де число — читаємо числом. Інакше «pt:7» стало б
    // числом, а «7» лишилося б рядком, і солвер мовчки нічого не зробив.
    const params: Record<string, any> = {};
    for (const [key, sample] of Object.entries(spec.params ?? {})) {
      const raw = (this.draft.params[key] ?? '').trim();
      if (Array.isArray(sample)) {
        params[key] = raw.split(',').map(part => part.trim()).filter(Boolean)
          .map(part => (/^\d+$/.test(part) ? Number(part) : part));
      } else if (raw === '') {
        params[key] = null;
      } else {
        params[key] = /^-?\d+$/.test(raw) ? Number(raw) : raw;
      }
    }

    // `code` унікальний у базі, а видів у школи буває кілька копій —
    // тому до виду дописується час. Людина його не бачить: у списку
    // стоїть назва, яку вона сама й написала.
    const code = `${this.draft.kind}_${Date.now().toString(36)}`;
    this.busy.set(true);
    this.error.set(null);
    this.pravyla.create({
      code, kind: this.draft.kind, name: this.draft.name.trim(),
      level: this.draft.level, weight: this.draft.weight,
      params, comment: spec.comment, enabled: true, sort_order: 200,
    }).subscribe({
      next: () => { this.adding.set(false); this.load(); },
      error: (error: ApiError) => {
        this.error.set(error.message);
        this.busy.set(false);
      },
    });
  }

  /**
   * Чи це правило завела людина, а не сідер.
   *
   * Видно по коду: сідер називає правило кодом його виду
   * (`reserved_slots`), а своє отримує вид плюс час створення. Тому
   * видалити можна лише те, що додали руками: базовий набір програми
   * прибирати не варто — його вимикають перемикачем, і тоді видно, що
   * саме вимкнено.
   */
  isOwn(row: Row): boolean {
    return row.rule.code !== row.rule.kind;
  }

  remove(row: Row): void {
    this.busy.set(true);
    this.error.set(null);
    this.pravyla.remove(row.rule.id).subscribe({
      next: () => this.load(),
      error: (error: ApiError) => {
        this.error.set(error.message);
        this.busy.set(false);
      },
    });
  }

  /** Повернути правилу значення з каталогу солвера. */
  reset(row: Row): void {
    if (!row.spec) { return; }
    this.patch(row, {
      level: row.spec.level,
      weight: row.spec.weight,
      params: { ...row.spec.params },
      enabled: true,
    });
  }
}
