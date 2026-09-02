/**
 * Типи для публічної сторінки розкладу — навмисно окремі від адмінських
 * (`app/admin/models/rozklad.models.ts`).
 *
 * Сторінка `/rozklad-perehlyad` статична й самодостатня: жодного
 * бекенд-запиту, жодної залежності від адмінського розділу сайту.
 * Тримати її на тих самих типах, що й адмінка, означало б тягнути за
 * собою весь `app/admin` лише заради двох інтерфейсів.
 */

/** Дні тижня так, як їх називає бекенд. */
export const DAYS = ['pn', 'vt', 'sr', 'cht', 'pt'] as const;

export const DAY_NAMES: Record<string, string> = {
  pn: 'Понеділок', vt: 'Вівторок', sr: 'Середа', cht: 'Четвер', pt: "П'ятниця",
};

export const DAY_SHORT: Record<string, string> = {
  pn: 'Пн', vt: 'Вт', sr: 'Ср', cht: 'Чт', pt: 'Пт',
};

export interface Run {
  id: number;
  title?: string | null;
  mode: string;
  status: string;
  finished_at?: string | null;
  /** Тижнів у циклі розкладу. 1 — тижневий, без чисельника й знаменника. */
  weeks?: number | null;
}

export interface Entry {
  id: number;
  group_id: number;
  subject_id: number;
  employee_id?: number | null;
  shift_code: string;
  day: string;
  week: number;
  lesson: number;
  subgroup?: string | null;
  room_id?: number | null;
  group_name?: string | null;
  subject_name?: string | null;
  teacher_name?: string | null;
  room_name?: string | null;
}
