import { Component } from '@angular/core';

@Component({
  selector: 'app-school-pride',
  templateUrl: './school-pride.component.html',
  styleUrls: ['./school-pride.component.scss'],
})
export class SchoolPrideComponent {
  isAccordionOpen = false;

  toggleAccordion() {
    this.isAccordionOpen = !this.isAccordionOpen;
  }
}
