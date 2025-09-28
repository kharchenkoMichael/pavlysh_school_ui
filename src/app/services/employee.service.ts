import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EmployeeListResponse } from '../models/emplyee-list';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private apiUrl = 'https://pavlysh-school-api-cte7btdcazhcahg3.northeurope-01.azurewebsites.net/employees/'; 

  constructor(private http: HttpClient) {}

  getEmployees(page: number = 1, pageSize: number = 10, search: string = ''): Observable<EmployeeListResponse> {
    let params = new HttpParams()
      .set('page', page)
      .set('page_size', pageSize)
      .set('search', search);

    return this.http.get<EmployeeListResponse>(this.apiUrl, { params });
  }
}
