import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Entry, Run } from '../models/rozklad-perehlyad.models';

/**
 * Розклад для публічної сторінки — **статичний**, без бекенда.
 *
 * Дані не тягнуться живим запитом до `pavlysh-school-api`, а лежать
 * готовим файлом у `assets/rozklad-latest.json`: сторінка має жити й
 * тоді, коли бекенд спить чи взагалі вимкнений, і не тримати відкритим
 * ще один публічний хід до бази. Оновлюється не автоматично, а руками —
 * перегенерувати `rozklad-latest.json` і зробити новий деплой сайту,
 * коли з'явився новий готовий розклад.
 */
interface Snapshot {
  run: Run;
  entries: Entry[];
}

@Injectable({ providedIn: 'root' })
export class PublicRozkladService {
  constructor(private http: HttpClient) {}

  snapshot(): Observable<Snapshot> {
    return this.http.get<Snapshot>('assets/rozklad-latest.json');
  }
}
