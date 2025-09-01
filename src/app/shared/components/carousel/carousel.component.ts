import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  HostListener,
} from '@angular/core';

@Component({
  selector: 'app-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss'],
  imports: [CommonModule],
  standalone: true,
})
export class CarouselComponent implements OnInit, OnDestroy {
  @ViewChild('carouselContainer', { static: true })
  carouselContainer!: ElementRef;
  images = [
    'assets/images/carusel/carusel1.jpg',
    'assets/images/carusel/carusel2.jpg',
    'assets/images/carusel/carusel3.jpg',
    'assets/images/carusel/carusel4.jpg',
  ];
  currentIndex = 0;
  currentTranslate = 0;
  interval: any;

  ngOnInit() {
    this.startAutoSlide();
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.updateTranslate();
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
    this.currentTranslate =
      -this.currentIndex * document.documentElement.clientWidth;
  }

  ngOnDestroy() {
    clearInterval(this.interval);
  }
}
