import { Employee } from "./emplyee";

export interface EmployeeListResponse {
  items: Employee[];
  total: number;
}