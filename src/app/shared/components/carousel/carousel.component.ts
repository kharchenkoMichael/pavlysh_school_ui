import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss'],
  imports: [CommonModule],
})
export class CarouselComponent implements OnInit {
  images = [
    'assets/images/carusel1.jpg',
    'assets/images/carusel2.jpg',
    'assets/images/carusel3.jpg',
    'assets/images/carusel4.jpg',
  ];
  currentIndex = 0;
  currentTranslate = 0;
  interval: any;

  ngOnInit() {
    this.startAutoSlide();
  }

  startAutoSlide() {
    this.interval = setInterval(() => {
      this.next();
    }, 3000);
  }

  next() {
    if (this.currentIndex < this.images.length - 1) {
      this.currentIndex++;
    } else {
      this.currentIndex = 0;
    }
    this.updateTranslate();
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    } else {
      this.currentIndex = this.images.length - 1;
    }
    this.updateTranslate();
  }

  updateTranslate() {
    this.currentTranslate = -this.currentIndex * window.innerWidth;
  }

  ngOnDestroy() {
    clearInterval(this.interval);
  }
}
