import { Injectable, inject } from '@angular/core';
import { Observable, timer } from 'rxjs';
import { filter, map, switchMap, take, takeWhile, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import {
  AssignRoomsResult, Entry, PlaceClassHoursResult, ProgressPoint, Run,
  RunRequest, ValidateResult,
} from '../models/rozklad.models';

/**
 * Розрахунок розкладу.
 *
 * Розрахунок триває хвилини, тому HTTP-запит його не чекає: бекенд віддає
 * id одразу, а статус опитується окремо. Тримати відкритий запит на дві
 * хвилини не можна — його обірве будь-який проксі між браузером і сервером.
 */
@Injectable({ providedIn: 'root' })
export class RozkladService {
  private api = inject(ApiService);

  /** Скільки чекати між опитуваннями статусу. */
  private readonly POLL_MS = 2500;

  /**
   * Криву питаємо частіше за статус: статус міняється раз за прогін,
   * а графік має рухатись, поки на нього дивляться.
   */
  private readonly CURVE_MS = 1500;

  /**
   * Чи можна скласти розклад — без запуску солвера.
   *
   * `weeks` передається обов'язково, і за замовчуванням це **два**.
   * Довжина циклу — не дрібниця перевірки, а те, від чого залежить сама
   * відповідь: на тижневому циклі половина години не існує, тож кожні
   * 0,5 округлюються вгору. У 8-х класах це додає 2,5 години, 33,5 стає
   * 36 — і перевірка чесно каже «не влазить у 35». На двотижневому
   * циклі ті самі уроки — 67 годин із 70, і місця вистачає.
   *
   * Тобто перевірка з `weeks=1` над двотижневим розкладом показувала
   * помилку, якої в школі немає.
   */
  validate(weeks = 2): Observable<ValidateResult> {
    return this.api.post('/timetable/validate', {}, { weeks });
  }

  runs(limit = 50): Observable<Run[]> {
    return this.api.get('/timetable/runs/', { limit });
  }

  run(id: number): Observable<Run> {
    return this.api.get(`/timetable/runs/${id}`);
  }

  entries(id: number): Observable<Entry[]> {
    return this.api.get(`/timetable/runs/${id}/entries`);
  }

  csv(id: number): Observable<string> {
    return this.api.getText(`/timetable/runs/${id}/csv`);
  }

  start(body: RunRequest): Observable<Run> {
    return this.api.post('/timetable/runs/', body);
  }

  /**
   * Перейменувати розрахунок або дописати примітку.
   *
   * Числа — штраф, статус, самі уроки — не міняються ніде: розрахунок
   * є виміром, і підправлений вимір гірший за відсутній. Не подобається
   * число — правляться дані й рахується заново.
   */
  rename(id: number, body: { title?: string; report?: string }): Observable<Run> {
    return this.api.patch(`/timetable/runs/${id}`, body);
  }

  remove(id: number): Observable<Run> {
    return this.api.delete(`/timetable/runs/${id}`);
  }

  /** Завантажити наявний розклад. Стає запуском із режимом `imported`. */
  importCsv(csv: string, title?: string): Observable<Run> {
    return this.api.post('/timetable/imports/', { csv, title });
  }

  /**
   * Крива збіжності прогону, що триває.
   *
   * Порожньо — не помилка, а «прогін уже завершився»: живий стан
   * зникає разом із ним, підсумкові числа лишаються в самому запуску.
   */
  progress(id: number): Observable<{ points: ProgressPoint[] }> {
    return this.api.get(`/timetable/runs/${id}/progress`);
  }

  /** Спинити розрахунок і забрати найкращий знайдений розклад. */
  stop(id: number): Observable<{ stopping: boolean }> {
    return this.api.post(`/timetable/runs/${id}/stop`);
  }

  /**
   * Розкласти уроки готового розкладу по поіменних кабінетах.
   *
   * Окрема дія, а не частина самої побудови (рішення автора, 29.08.2026:
   * ускладнювати солвер сенсу нема) — викликається вже після того, як
   * розклад складено чи завантажено.
   */
  assignRooms(id: number): Observable<AssignRoomsResult> {
    return this.api.post(`/timetable/runs/${id}/rooms`);
  }

  /**
   * Поставити годину класного керівника — окрема дія, і саме перед
   * розстановкою кабінетів, а не після: обмін, якщо він знадобився,
   * скидає кабінет обом переставленим урокам, і `assignRooms` має
   * побачити це скидання, а не старе значення.
   */
  placeClassHours(id: number, day = 'pt'): Observable<PlaceClassHoursResult> {
    return this.api.post(`/timetable/runs/${id}/class-hours`, undefined, { day });
  }

  /**
   * Крива, поки прогін триває. Джерело точок для графіка.
   *
   * Опитування спиняється **саме тут**, а не де-небудь у компоненті:
   * `takeWhile` із `running` як умовою — і потік закривається сам,
   * щойно бекенд сказав «done». Інакше він висів би до кінця сеансу,
   * б'ючись у ендпойнт, який уже завжди віддає порожньо.
   */
  watchProgress(id: number, running: () => boolean): Observable<ProgressPoint[]> {
    return timer(0, this.CURVE_MS).pipe(
      takeWhile(() => running()),
      switchMap(() => this.progress(id)),
      map(answer => answer.points ?? []),
    );
  }

  /**
   * Дочекатися кінця розрахунку, повідомляючи про кожен проміжний стан.
   *
   * `onTick` дає змогу показувати «рахую… 12 с», а не застиглий екран:
   * дві хвилини без жодної ознаки життя виглядають як зависання.
   */
  waitFor(id: number, onTick?: (run: Run) => void): Observable<Run> {
    return timer(0, this.POLL_MS).pipe(
      switchMap(() => this.run(id)),
      tap(run => onTick?.(run)),
      filter(run => run.status !== 'running'),
      take(1),
    );
  }
}
