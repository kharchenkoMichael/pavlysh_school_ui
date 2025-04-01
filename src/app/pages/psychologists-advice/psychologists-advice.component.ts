import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { CarouselModule } from 'ngx-owl-carousel-o';
@Component({
  selector: 'app-psychologists-advice',
  templateUrl: './psychologists-advice.component.html',
  styleUrls: ['./psychologists-advice.component.scss'],
  imports: [CarouselModule, CommonModule],
  standalone: true,
})
export class PsychologistsAdviceComponent {
  images = [
    { src: 'assets/images/advices/1.jpg', alt: 'Фото 1' },
    { src: 'assets/images/advices/2.jpg', alt: 'Фото 2' },
    { src: 'assets/images/advices/3.jpg', alt: 'Фото 3' },
    { src: 'assets/images/advices/4.jpg', alt: 'Фото 4' },
    { src: 'assets/images/advices/5.jpg', alt: 'Фото 5' },
    { src: 'assets/images/advices/6.jpg', alt: 'Фото 6' },
    { src: 'assets/images/advices/7.jpg', alt: 'Фото 7' },
    { src: 'assets/images/advices/8.jpg', alt: 'Фото 8' },
    { src: 'assets/images/advices/9.jpg', alt: 'Фото 9' },
    { src: 'assets/images/advices/10.jpg', alt: 'Фото 10' },
    { src: 'assets/images/advices/11.jpg', alt: 'Фото 11' },
    { src: 'assets/images/advices/12.jpg', alt: 'Фото 12' },
    { src: 'assets/images/advices/13.jpg', alt: 'Фото 13' },
    { src: 'assets/images/advices/14.jpg', alt: 'Фото 14' },
    { src: 'assets/images/advices/15.jpg', alt: 'Фото 15' },
    { src: 'assets/images/advices/16.jpg', alt: 'Фото 16' },
    { src: 'assets/images/advices/17.jpg', alt: 'Фото 17' },
    { src: 'assets/images/advices/18.jpg', alt: 'Фото 18' },
    { src: 'assets/images/advices/19.jpg', alt: 'Фото 19' },
    { src: 'assets/images/advices/20.jpg', alt: 'Фото 20' },
    { src: 'assets/images/advices/21.jpg', alt: 'Фото 21' },
    { src: 'assets/images/advices/22.jpg', alt: 'Фото 22' },
    { src: 'assets/images/advices/23.jpg', alt: 'Фото 23' },
    { src: 'assets/images/advices/24.jpg', alt: 'Фото 24' },
    { src: 'assets/images/advices/25.jpg', alt: 'Фото 25' },
    { src: 'assets/images/advices/26.jpg', alt: 'Фото 26' },
    { src: 'assets/images/advices/27.jpg', alt: 'Фото 27' },
    { src: 'assets/images/advices/28.jpg', alt: 'Фото 28' },
    { src: 'assets/images/advices/29.jpg', alt: 'Фото 29' },
    { src: 'assets/images/advices/30.jpg', alt: 'Фото 30' },
    { src: 'assets/images/advices/31.jpg', alt: 'Фото 31' },
    { src: 'assets/images/advices/32.jpg', alt: 'Фото 32' },
    { src: 'assets/images/advices/33.jpg', alt: 'Фото 33' },
    { src: 'assets/images/advices/34.jpg', alt: 'Фото 34' },
  ];

  customOptions: any = {
    loop: true,
    margin: 10,
    nav: true,
    responsive: {
      0: {
        items: 1,
      },
      600: {
        items: 3,
      },
      1000: {
        items: 5,
      },
    },
  };

  currentImage = this.images[0];

  showLargeImage(image: { src: string; alt: string }) {
    this.currentImage = image;
  }
}
