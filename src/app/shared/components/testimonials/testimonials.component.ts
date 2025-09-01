import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { DragScrollComponent, DragScrollItemDirective } from 'ngx-drag-scroll';

@Component({
  selector: 'app-testimonials',
  templateUrl: './testimonials.component.html',
  styleUrls: ['./testimonials.component.scss'],
  imports: [CommonModule, DragScrollComponent, DragScrollItemDirective],
  standalone: true,
})
export class TestimonialsComponent implements OnInit {
  @ViewChild('nav', { read: DragScrollComponent }) ds!: DragScrollComponent;

  reviews = [
    {
      photo: 'assets/images/testimonials/p1.jpg',
      quote: 'Це найкраща школа, яку ми могли обрати для нашої дитини!',
      name: 'Іван Іванов',
      details: 'Батько учениці',
    },
    {
      photo: 'assets/images/testimonials/p2.jpg',
      quote: 'Випускники цієї школи завжди досягають успіху!',
      name: 'Марія Петрівна',
      details: 'Колишній випускник',
    },
  ];

  ngOnInit() {}

  moveLeft() {
    this.ds.moveLeft();
  }

  moveRight() {
    this.ds.moveRight();
  }
}
