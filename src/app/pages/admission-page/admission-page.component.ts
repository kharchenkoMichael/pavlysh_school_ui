import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

@Component({
  selector: 'app-admission-page',
  templateUrl: './admission-page.component.html',
  styleUrl: './admission-page.component.scss',
  standalone: true,
})
export class AdmissionPageComponent {
  currentYear: number;
  nextYear: number;

  constructor(private router: Router) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        window.scrollTo(0, 0);
      }
    });
    const today = new Date();
    this.currentYear = today.getFullYear();
    this.nextYear =
      today.getMonth() >= 8 ? this.currentYear + 1 : this.currentYear;
  }
}
