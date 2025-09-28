import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { News } from '../models/news';
import { PaginatedNews } from '../models/paginated-news';

@Injectable({
  providedIn: 'root'
})
export class NewsService {
  private apiUrl = 'https://pavlysh-school-api-cte7btdcazhcahg3.northeurope-01.azurewebsites.net/news/'; 
  constructor(private http: HttpClient) {}

  getNews(): Observable<News[]> {
    return this.http.get<News[]>(this.apiUrl);
  }

  getNewsById(id: number): Observable<News> {
    return this.http.get<News>(`${this.apiUrl}${id}`);
  }
  
  getPaginationNews(page: number, pageSize: number, search?: string): Observable<PaginatedNews> {
    let params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('page_size', pageSize.toString());
    if (search) {
      params.set('search', search);
    }

    return this.http.get<PaginatedNews>(`${this.apiUrl}/paginated?${params.toString()}`);
  }
}
