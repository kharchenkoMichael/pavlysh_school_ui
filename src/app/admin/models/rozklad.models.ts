/**
 * Типи під схеми бекенду (`app/schemas/timetable.py`).
 *
 * Назви полів — як в API, без перекладу в camelCase: інакше кожне
 * звернення до відповіді довелося б перекладати туди й назад, а помилка
 * в одній літері спливала б лише під час виконання.
 */

export type RuleLevel = 'hard' | 'soft';
export type RunMode = 'build' | 'evaluate' | 'improve' | 'imported';
export type RunStatus = 'running' | 'done' | 'failed';

/**
 * Понад стільки годин на тиждень — уже забагато для однієї людини.
 *
 * Живе тут, а не в сторінці навантаження, бо це саме число підсвічує
 * перевантаженого вчителя і на сторінці «Учителі». Два різні пороги
 * означали б, що на одному екрані людина перевантажена, а на другому ні.
 */
export const TEACHER_LIMIT = 24;

/** Дні тижня так, як їх називає бекенд. */
export const DAYS = ['pn', 'vt', 'sr', 'cht', 'pt'] as const;
export type Day = (typeof DAYS)[number];

export const DAY_NAMES: Record<string, string> = {
  pn: 'Понеділок', vt: 'Вівторок', sr: 'Середа', cht: 'Четвер', pt: "П'ятниця",
};

export const DAY_SHORT: Record<string, string> = {
  pn: 'Пн', vt: 'Вт', sr: 'Ср', cht: 'Чт', pt: 'Пт',
};

/**
 * Типи кабінетів. Значення — як у солвері, підписи — для людини.
 *
 * `informatics_inshyi` — інформатика в іншому корпусі, і це окремий тип,
 * а не третій кабінет типу `informatics`: туди ходять 2-А, 2-Б і 3-А,
 * і в спільному переліку солвер отримав би право поставити туди старші
 * класи, які через двір не ходять.
 */
export const ROOM_KINDS: { value: string; label: string }[] = [
  { value: 'any', label: 'Звичайний кабінет' },
  { value: 'pochatkova', label: 'Кабінет молодшої школи (1–4)' },
  { value: 'informatics', label: 'Кабінет інформатики' },
  { value: 'informatics_inshyi', label: 'Інформатики (інший корпус)' },
  { value: 'physics', label: 'Кабінет фізики' },
  { value: 'chemistry', label: 'Кабінет хімії' },
  { value: 'workshop', label: 'Майстерня' },
  { value: 'gym', label: 'Спортзал' },
];

export function roomKindLabel(kind?: string | null): string {
  return ROOM_KINDS.find(k => k.value === kind)?.label ?? kind ?? '—';
}

// ── довідники ───────────────────────────────────────────────

export interface Year {
  id: number;
  name: string;
  is_current: boolean;
}

/** Запис навантаження, якому перенос року не знайшов учителя. */
export interface LoadGap {
  group_name: string;
  subject_name: string;
}

/** Класний керівник, якого перенос перевів на нове місце (4→1, 11→5). */
export interface ClassTeacherMove {
  group_name: string;
  teacher_name: string;
}

/** Що зробила кнопка «Створити новий рік» (`PLAN_ROKY.md`, розділ 2). */
export interface YearRolloverResult {
  year: Year;
  groups_created: string[];
  groups_graduated: string[];
  loads_created: number;
  loads_without_teacher: LoadGap[];
  rooms_copied: number;
  room_assignments_copied: number;
  rules_copied: number;
  shifts_copied: number;
  prefs_copied: number;
  class_teacher_moves: ClassTeacherMove[];
}

export interface Shift {
  id: number;
  code: string;
  name: string;
  starts_at?: string | null;
  lessons: number;
  bells?: string[] | null;
  sort_order: number;
}

/**
 * Закріплення кабінету — за вчителем, за предметом, або за обома.
 *
 * **Пріоритет, а не заборона:** спершу той, за ким кабінет закріплений,
 * потім хто веде той самий предмет, потім будь-хто. Кабінет із
 * закріпленням не стає чиєюсь власністю — коли двоє закріплених
 * стоять одночасно, той, хто програв, іде в інший вільний.
 */
export interface RoomAssignment {
  id: number;
  room_id: number;
  employee_id?: number | null;
  subject_id?: number | null;
  teacher_name?: string | null;
  subject_name?: string | null;
}

export interface Room {
  id: number;
  name: string;
  kind: string;
  /** Корпус. Не для солвера — щоб завуч розрізнив три «кабінети математики». */
  corpus?: string | null;
  /** Скільки класів одночасно вміщає сам кабінет (звичайний — один). */
  capacity: number;
  /** Найстарша паралель, якій кабінет дозволений; порожньо — усім. */
  max_parallel?: number | null;
  /** Назви класів, яким кабінет належить виключно; порожньо — спільний. */
  dedicated_groups?: string[] | null;
  sort_order: number;
  is_active: boolean;
  assignments?: RoomAssignment[];
}

export type RoomAssignmentPayload = Pick<RoomAssignment,
  'room_id' | 'employee_id' | 'subject_id'>;

export interface Subject {
  id: number;
  code: string;
  name: string;
  room_kind: string;
  aliases?: string[] | null;
  is_hard: boolean;
  sort_order: number;
  /** Видалити не можна, коли предмет уже десь у навантаженні (навіть
   *  торішньому) — це вимикає його з нових записів, не стираючи старі. */
  is_active: boolean;
}

/** Клас — лише ті поля, що стосуються розкладу. Назву веде публічна частина. */
export interface GroupTimetable {
  id: number;
  name: string;
  parallel?: number | null;
  shift_code?: string | null;
  max_lessons?: number | null;
  lessons?: number[] | null;
  in_timetable?: boolean | null;
  /**
   * Класний керівник. Не довідка: саме він веде годину класного
   * керівника, у своєму кабінеті, у п'ятницю після останнього уроку.
   */
  class_teacher_id?: number | null;
  class_teacher_name?: string | null;
}

export interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  position: string;
  subjects?: string[] | null;
  is_active?: boolean;
}

/**
 * Прізвище й ініціали — і ніколи саме прізвище.
 *
 * У школі три Сірі: Альбіна Віталіївна, Наталія Іванівна і Наталія
 * Олександрівна. Дві останні різняться лише по батькові.
 */
export function teacherLabel(employee?: Employee | null): string {
  if (!employee) { return '—'; }
  const initials = [employee.first_name, employee.middle_name]
    .filter(Boolean)
    .map(part => `${part![0]}.`)
    .join('');
  return `${employee.last_name} ${initials}`.trim();
}

// ── навантаження ────────────────────────────────────────────

export interface Load {
  id: number;
  /**
   * Класи запису. Майже завжди один — і це звичайний випадок. Кількох
   * буває, коли урок ведуть класам разом: трудове 5-А + 5-Б.
   */
  group_ids: number[];
  subject_id: number;
  /**
   * Годин **на тиждень**, і воно буває дробовим: 18,5 — це 18 годин один
   * тиждень і 19 другий. Ціле число уроків за цикл рахує вже бекенд.
   * Дозволена дробова частина одна — половина; 18,3 сервер не прийме.
   */
  hours_per_week: number;
  teacher_id?: number | null;
  teacher2_id?: number | null;
  split: boolean;
  group_names?: string[];
  /** «5-А» або «5-А + 5-Б» — зведена група читається як одна річ. */
  group_name?: string | null;
  subject_name?: string | null;
  teacher_name?: string | null;
  teacher2_name?: string | null;
}

export type LoadPayload = Omit<Load, 'id' | 'group_names' | 'group_name'
  | 'subject_name' | 'teacher_name' | 'teacher2_name'>;

/** Кандидат на порожній слот навантаження — від найпідхожішого. */
export interface TeacherCandidate {
  id: number;
  name: string;
  matches_subject: boolean;
  hours_per_week: number;
}

// ── правила ─────────────────────────────────────────────────

export interface Rule {
  id: number;
  code: string;
  name: string;
  kind: string;
  level: RuleLevel;
  weight: number;
  params?: Record<string, any> | null;
  comment?: string | null;
  enabled: boolean;
  sort_order: number;
}

/** Каталог солвера: що взагалі буває за правила. */
export interface RuleSpec {
  kind: string;
  name: string;
  level: RuleLevel;
  weight: number;
  params: Record<string, any>;
  hard_only: boolean;
  comment: string;
}

export interface TeacherPref {
  id: number;
  employee_id: number;
  unavailable?: string[] | null;
  max_lessons_per_day?: number | null;
  comment?: string | null;
  teacher_name?: string | null;
}

// ── перевірка ───────────────────────────────────────────────

/**
 * Види проблем, які **справді** зупиняють розрахунок.
 *
 * Дзеркалить `STOPPERS` у `app/solver/validate.py`. Рівень `error` сам по
 * собі цього не означає: бувають помилки, з якими розклад складається —
 * і показувати їх під заголовком «Заважає порахувати» означає збрехати
 * про те, що заважає.
 */
export const BLOCKING_KINDS = ['data', 'capacity'];

export interface Problem {
  level: 'error' | 'warning';
  /**
   * `data` — довідники не сходяться, рахувати нічого; `capacity` — фізично
   * не влазить; `gaps` — вікно в розкладі класу (не зупиняє).
   */
  kind: string;
  text: string;
}

export interface ValidateResult {
  ok: boolean;
  problems: Problem[];
  groups: number;
  loads: number;
}

/** Відповідь `POST /timetable/runs/{id}/rooms` — розкладка по кабінетах. */
export interface AssignRoomsResult {
  entries: number;
  placed: number;
  unplaced: number;
  by_reason: Record<string, number>;
  problems: Problem[];
}

/** Відповідь `POST /timetable/runs/{id}/class-hours` — година класного керівника. */
export interface PlaceClassHoursResult {
  placed: number;
  weeks: number[];
  without_class_teacher: string[];
  did_not_fit: string[];
  swapped_for_teacher: string[];
  /**
   * Обмін, безпечний і кабінетами (не лише вчителем), але для предмета
   * з окремим кабінетом (інформатика, фізкультура, кабінет молодшої
   * школи) — тому не застосований автоматично. Кожен рядок описує, що
   * саме можна переставити вручну.
   */
  proposed_swaps: string[];
  teacher_conflict: string[];
}

// ── запуски ─────────────────────────────────────────────────

export interface RunRequest {
  mode: RunMode;
  title?: string | null;
  time_limit: number;
  based_on_run_id?: number | null;
  keep_weight?: number | null;
  /** Тижнів у циклі. Для evaluate/improve не шлеться: береться з розкладу. */
  weeks?: number | null;
}

export interface Run {
  id: number;
  created_at?: string | null;
  finished_at?: string | null;
  title?: string | null;
  mode: RunMode;
  status: RunStatus;
  solver_status?: string | null;
  penalty?: number | null;
  seconds?: number | null;
  breakdown?: Record<string, number> | null;
  problems?: Problem[] | null;
  unmatched?: string[] | null;
  time_limit: number;
  /** Тижнів у циклі розкладу. 1 — тижневий, без чисельника й знаменника. */
  weeks?: number | null;
  based_on_run_id?: number | null;
  keep_weight?: number | null;
  kept_lessons?: number | null;
  moved_lessons?: number | null;
  moved_list?: string[] | null;
  report?: string | null;
}

/**
 * Точка кривої збіжності — те, з чого малюється графік під час розрахунку.
 *
 * `penalty` — штраф найкращого знайденого розкладу, `bound` — доведена
 * нижня межа: нижче за неї штраф не опуститься, скільки не рахуй. Поки
 * лінії розходяться, солверу є куди рухатись; зійшлися — оптимум
 * доведено; лягли поруч і не рухаються — плато, і чекати далі марно.
 *
 * Обидва можуть бути `null` на самому початку: межа приїжджає раніше
 * за перший розклад, і кілька перших точок мають лише її.
 */
export interface ProgressPoint {
  seconds: number;
  penalty: number | null;
  bound: number | null;
  /**
   * Який прохід двопрохідної побудови це рахував.
   *
   * 1 — каркас одного тижня (цілі години), 2 — дробові залишки на повній
   * сітці. Вісь часу в них наскрізна, а от штраф — **різних масштабів**:
   * перший міряє тиждень, другий цілий цикл. Тому лінії малюються
   * окремими відрізками, а не однією ламаною: інакше на стику виходив
   * би стрибок, схожий на різке погіршення, якого насправді немає.
   *
   * Однопрохідний розрахунок (тижневий цикл, evaluate, improve) шле 1.
   */
  stage: number;
}

export interface Entry {
  id: number;
  group_id: number;
  subject_id: number;
  employee_id?: number | null;
  shift_code: string;
  day: string;
  /**
   * Тиждень циклу: 1 — чисельник, 2 — знаменник.
   *
   * Бекенд віддавав його від початку, а інтерфейс не мав цього поля
   * зовсім — і сітка складалася ключем «день:урок», через що уроки обох
   * тижнів лягали в одну клітинку одне на одного. Саме там, де розклад
   * найцікавіший, він показував півправди.
   */
  week: number;
  lesson: number;
  subgroup?: string | null;
  room_kind?: string | null;
  room_id?: number | null;
  group_name?: string | null;
  subject_name?: string | null;
  teacher_name?: string | null;
  room_name?: string | null;
}

// ── логін ───────────────────────────────────────────────────

export interface User {
  id: number;
  username: string;
  full_name?: string | null;
  role: string;
}

export interface Token {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

/** 409 від бекенда: що саме заважає видалити. */
export interface InUseDetail {
  message: string;
  used_by: string[];
}
