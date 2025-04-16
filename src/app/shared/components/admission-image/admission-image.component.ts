import { Router } from '@angular/router';
import { Component } from '@angular/core';

@Component({
  selector: 'app-admission-image',
  templateUrl: './admission-image.component.html',
  styleUrls: ['./admission-image.component.scss'],
  standalone: true,
})
export class AddmissionImageComponent {
  constructor(private router: Router) {}

  navigateToDetails() {
    this.router.navigate(['/admission']);
  }
}
