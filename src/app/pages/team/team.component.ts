import { Component, OnInit } from '@angular/core';
import { EmployeeService } from '../../services/employee.service';
import { CommonModule } from '@angular/common';
import { Employee } from '../../models/emplyee';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-team',
  templateUrl: './team.component.html',
  styleUrls: ['./team.component.scss'],
  standalone: true,
  imports: [CommonModule, InfiniteScrollModule, FormsModule],
})
export class TeamComponent implements OnInit {
  employees: Employee[] = [];
  page = 1;
  pageSize = 10;
  total = 0;
  search = '';
  loading = false;

  constructor(private employeeService: EmployeeService) {}

  ngOnInit(): void {
    this.loadEmployees();
  }

  loadEmployees() {
    this.loading = true;
    this.employeeService.getEmployees(this.page, this.pageSize, this.search)
      .subscribe(res => {
        this.employees = [...this.employees, ...res.items.map(emp => ({ ...emp, expanded: false }))];
        this.total = res.total;
        this.loading = false;
      }, () => this.loading = false);
  }

  onScrollDown() {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadEmployees();
    }
  }
  
  onSearchChange() {
    this.page = 1;
    this.loadEmployees();
  }

  get totalPages(): number {
    return Math.ceil(this.total / this.pageSize);
  }
}
