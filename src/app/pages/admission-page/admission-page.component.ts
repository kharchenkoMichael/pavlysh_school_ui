import { Component } from '@angular/core';

@Component({
  selector: 'app-admission-page',
  templateUrl: './admission-page.component.html',
  styleUrl: './admission-page.component.scss',
  standalone: true,
})
export class AdmissionPageComponent {
  currentYear: number;
  nextYear: number;

  constructor() {
    const today = new Date();
    this.currentYear = today.getFullYear();
    this.nextYear =
      today.getMonth() >= 8 ? this.currentYear + 1 : this.currentYear;
  }
}
