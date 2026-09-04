import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Load, LoadPayload, TeacherCandidate } from '../models/rozklad.models';

/**
 * Навантаження: хто що і скільки годин веде.
 *
 * Бекенд віддає разом із підписами класу, предмета й учителя — щоб
 * матриця клас × предмет не робила на кожну клітинку окремий запит.
 */
@Injectable({ providedIn: 'root' })
export class NavantazhenniaService {
  private api = inject(ApiService);

  list(): Observable<Load[]> { return this.api.get('/timetable/loads'); }

  create(body: LoadPayload): Observable<Load> {
    return this.api.post('/timetable/loads', body);
  }

  update(id: number, body: Partial<LoadPayload>): Observable<Load> {
    return this.api.patch(`/timetable/loads/${id}`, body);
  }

  remove(id: number): Observable<Load> {
    return this.api.delete(`/timetable/loads/${id}`);
  }

  /**
   * Кого запропонувати на цей запис — спершу ті, хто веде предмет,
   * серед них спершу найменш завантажені (рахує бекенд, не клієнт:
   * навантаження всіх учителів по всій базі одразу, а не по сторінці).
   */
  candidates(loadId: number): Observable<TeacherCandidate[]> {
    return this.api.get(`/timetable/loads/${loadId}/candidates`);
  }
}
