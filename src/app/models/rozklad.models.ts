/**
 * Типи загальної сторінки розкладу `/rozklad`.
 *
 * Дані — статичний `assets/rozklad/2026-2027.json`, який збирає
 * `school/tools/rozklad/data/2026-2027/zatverdzhenyi.py`: уроки — з
 * затвердженого паперового розкладу, учителі — з навантаження в базі.
 */

/** Чисельник або знаменник. */
export type WeekType = 'N' | 'D';

export interface RozkladLesson {
  /** Клас, «5-А». */
  c: string;
  /** День: 0 — понеділок … 4 — п'ятниця. */
  d: number;
  /** Номер уроку, з 1. */
  n: number;
  /** Предмет. */
  s: string;
  /** Учителі (id). Двоє — клас ділиться між ними на групи. */
  t: number[];
  /** Лише в чисельнику чи лише в знаменнику; нема — щотижня. */
  w?: WeekType;
  /** Група класу, коли групи в цей час на різних предметах. */
  g?: 'I' | 'II';
}

export interface RozkladTeacher {
  id: number;
  /** «Харченко М.О.» */
  name: string;
  /** «Харченко Михайло Олександрович» */
  full: string;
}

export interface RozkladData {
  year: string;
  source: string;
  /** Дзвінки: [початок, кінець] для кожного уроку, «08:30». */
  bells: [string, string][];
  calendar: {
    /** Понеділок тижня → чисельник, знаменник чи канікули (null). */
    weeks: Record<string, WeekType | null>;
    vacations: { from: string; to: string }[];
    holidays: string[];
  };
  classes: string[];
  teachers: RozkladTeacher[];
  lessons: RozkladLesson[];
}
