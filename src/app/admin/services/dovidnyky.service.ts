import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ApiService } from './api.service';
import {
  Employee, GroupTimetable, Room, RoomAssignment, RoomAssignmentPayload,
  Shift, Subject, TeacherPref, Year, YearRolloverResult,
} from '../models/rozklad.models';

/** Стеля сторінки в бекенді (`page_size: le=100`). Більше просити не можна. */
const PAGE_SIZE = 100;

/**
 * Довідники: зміни, кабінети, предмети, класи, побажання вчителів.
 *
 * Учителі беруться з `/employees` — того самого списку, що показує
 * публічна сторінка «Наша команда». Другого списку педагогів у школі
 * немає й не має бути.
 */
@Injectable({ providedIn: 'root' })
export class DovidnykyService {
  private api = inject(ApiService);

  // ── навчальні роки ────────────────────────────────────────
  years(): Observable<Year[]> { return this.api.get('/timetable/years'); }
  activateYear(id: number): Observable<Year> {
    return this.api.post(`/timetable/years/${id}/activate`);
  }
  /** «Створити новий рік» — одна кнопка, перенос усередині (бекенд). */
  rolloverYear(name: string, firstGradeCount: number): Observable<YearRolloverResult> {
    return this.api.post('/timetable/years/rollover',
      { name, first_grade_count: firstGradeCount });
  }

  // ── зміни ─────────────────────────────────────────────────
  shifts(): Observable<Shift[]> { return this.api.get('/timetable/shifts'); }

  // ── кабінети ──────────────────────────────────────────────
  rooms(): Observable<Room[]> { return this.api.get('/timetable/rooms'); }
  createRoom(body: Partial<Room>): Observable<Room> {
    return this.api.post('/timetable/rooms', body);
  }
  updateRoom(id: number, body: Partial<Room>): Observable<Room> {
    return this.api.patch(`/timetable/rooms/${id}`, body);
  }
  deleteRoom(id: number): Observable<Room> {
    return this.api.delete(`/timetable/rooms/${id}`);
  }

  /**
   * Закріпити кабінет за вчителем і/або предметом.
   *
   * Читаються закріплення разом із кабінетом (`Room.assignments`), тому
   * окремого GET тут немає — тільки додати й прибрати.
   */
  createRoomAssignment(body: RoomAssignmentPayload): Observable<RoomAssignment> {
    return this.api.post('/timetable/room-assignments', body);
  }

  deleteRoomAssignment(id: number): Observable<RoomAssignment> {
    return this.api.delete(`/timetable/room-assignments/${id}`);
  }

  // ── предмети ──────────────────────────────────────────────
  subjects(): Observable<Subject[]> { return this.api.get('/timetable/subjects'); }
  createSubject(body: Partial<Subject>): Observable<Subject> {
    return this.api.post('/timetable/subjects', body);
  }
  updateSubject(id: number, body: Partial<Subject>): Observable<Subject> {
    return this.api.patch(`/timetable/subjects/${id}`, body);
  }
  deleteSubject(id: number): Observable<Subject> {
    return this.api.delete(`/timetable/subjects/${id}`);
  }

  // ── класи ─────────────────────────────────────────────────
  groups(): Observable<GroupTimetable[]> { return this.api.get('/timetable/groups'); }
  updateGroup(id: number, body: Partial<GroupTimetable>): Observable<GroupTimetable> {
    return this.api.patch(`/timetable/groups/${id}`, body);
  }
  /** Клас заводиться на публічній частині — тут лише поля розкладу. */
  createGroup(name: string): Observable<{ id: number; name: string }> {
    return this.api.post('/groups/', { name });
  }
  deleteGroup(id: number): Observable<unknown> {
    return this.api.delete(`/groups/${id}`);
  }

  // ── педагоги ──────────────────────────────────────────────
  /**
   * `include_inactive` тут завжди `true`, і це не недогляд.
   *
   * Розділ розкладу мусить бачити й тих, хто зі школи пішов: торішній
   * розклад посилається на них, і без них він показував би «невідомий
   * учитель» замість людини, яка ті уроки справді вела. Ховає таких
   * публічна частина сайту — там `include_inactive` не передається
   * зовсім, і бекенд за замовчуванням їх не віддає.
   */
  employees(page = 1, pageSize = PAGE_SIZE, search = ''): Observable<{
    items: Employee[]; total: number;
  }> {
    return this.api.get('/employees/', {
      page, page_size: pageSize, search, include_inactive: true,
    });
  }

  /**
   * Усі педагоги, скільки б їх не було.
   *
   * Бекенд не віддає більше сотні за раз, тож решту доводиться дочитувати
   * сторінками. Просити «дай двісті» не можна — це помилка запиту, і саме
   * на ній сторінка вчителів колись показувала порожній список.
   */
  allEmployees(): Observable<{ items: Employee[]; total: number }> {
    return this.employees(1, PAGE_SIZE).pipe(
      switchMap(first => {
        const pages = Math.ceil(first.total / PAGE_SIZE);
        if (pages <= 1) { return of(first); }
        const rest = Array.from({ length: pages - 1 },
          (_, index) => this.employees(index + 2, PAGE_SIZE));
        return forkJoin(rest).pipe(map(chunks => ({
          total: first.total,
          items: chunks.reduce((all, chunk) => all.concat(chunk.items), first.items),
        })));
      }),
    );
  }
  createEmployee(body: Partial<Employee>): Observable<Employee> {
    return this.api.post('/employees/', body);
  }
  updateEmployee(id: number, body: Partial<Employee>): Observable<Employee> {
    return this.api.patch(`/employees/${id}`, body);
  }
  deleteEmployee(id: number): Observable<Employee> {
    return this.api.delete(`/employees/${id}`);
  }

  // ── побажання вчителів ────────────────────────────────────
  prefs(): Observable<TeacherPref[]> { return this.api.get('/timetable/teacher-prefs'); }
  savePref(body: Partial<TeacherPref>): Observable<TeacherPref> {
    return this.api.post('/timetable/teacher-prefs', body);
  }
  deletePref(id: number): Observable<TeacherPref> {
    return this.api.delete(`/timetable/teacher-prefs/${id}`);
  }

  /** Звірка карток педагогів із довідником предметів. */
  reconcile(): Observable<{
    employees: number;
    matched: Record<string, string[]>;
    unknown_subjects: Record<string, string[]>;
    without_subjects: string[];
  }> {
    return this.api.get('/timetable/reconcile');
  }

  /** Довідники за замовчуванням. Нічого не перетирає. */
  seed(classrooms = 12): Observable<unknown> {
    return this.api.post('/timetable/seed', {}, { classrooms });
  }
}
