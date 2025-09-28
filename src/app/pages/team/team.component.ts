import { Component, OnInit } from '@angular/core';
import { EmployeeService } from '../../services/employee.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Employee } from '../../models/emplyee';

@Component({
  selector: 'app-team',
  templateUrl: './team.component.html',
  styleUrls: ['./team.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
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
        this.employees = res.items.map(emp => ({ ...emp, expanded: false }));
        this.total = res.total;
        this.loading = false;
      }, () => this.loading = false);
  }

  onSearchChange() {
    this.page = 1;
    this.loadEmployees();
  }

  onPageChange(newPage: number) {
    this.page = newPage;
    this.loadEmployees();
  }
  
  get totalPages(): number {
    return Math.ceil(this.total / this.pageSize);
  }
}
