import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admission',
  imports: [RouterModule],
  templateUrl: './admission.component.html',
  styleUrl: './admission.component.scss',
})
export class AdmissionComponent {
  currentYear: number;
  nextYear: number;

  constructor() {
    const today = new Date();
    this.currentYear = today.getFullYear();
    this.nextYear =
      today.getMonth() >= 8 ? this.currentYear + 1 : this.currentYear;
  }
}
