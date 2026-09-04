import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Rule, RuleSpec } from '../models/rozklad.models';

/**
 * Правила складання розкладу.
 *
 * Каталог приходить із бекенда, а не тримається списком тут: інакше
 * додане в солвері правило треба було б дописувати ще й у фронтенді,
 * і рано чи пізно вони розійшлися б.
 */
@Injectable({ providedIn: 'root' })
export class PravylaService {
  private api = inject(ApiService);

  list(): Observable<Rule[]> { return this.api.get('/timetable/rules'); }

  catalog(): Observable<RuleSpec[]> { return this.api.get('/timetable/rule-catalog'); }

  create(body: Partial<Rule>): Observable<Rule> {
    return this.api.post('/timetable/rules', body);
  }

  update(id: number, body: Partial<Rule>): Observable<Rule> {
    return this.api.patch(`/timetable/rules/${id}`, body);
  }

  remove(id: number): Observable<Rule> {
    return this.api.delete(`/timetable/rules/${id}`);
  }
}
