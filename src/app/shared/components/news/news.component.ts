import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';

@Component({
    selector: 'app-news',
    templateUrl: './news.component.html',
    styleUrls: ['./news.component.scss'],
    imports: [CommonModule]
})
export class NewsComponent implements OnInit, OnDestroy {
  news = [
    {
      photos: [
        'assets/images/news/new1/n1.jpg',
        'assets/images/news/new1/n2.jpg',
        'assets/images/news/new1/n3.jpg',
        'assets/images/news/new1/n4.jpg',
        'assets/images/news/new1/n5.jpg',
        'assets/images/news/new1/n6.jpg',
        'assets/images/news/new1/n7.jpg',
        'assets/images/news/new1/n8.jpg',
        'assets/images/news/new1/n9.jpg',
        'assets/images/news/new1/n10.jpg',
        'assets/images/news/new1/n11.jpg',
        'assets/images/news/new1/n12.jpg',
        'assets/images/news/new1/n13.jpg',
        'assets/images/news/new1/n14.jpg',
        'assets/images/news/new1/n15.jpg',
        'assets/images/news/new1/n16.jpg',
        'assets/images/news/new1/n17.jpg',
        'assets/images/news/new1/n18.jpg',
        'assets/images/news/new1/n19.jpg',
        'assets/images/news/new1/n20.jpg',
        'assets/images/news/new1/n21.jpg',
        'assets/images/news/new1/n22.jpg',
        'assets/images/news/new1/n23.jpg',
        'assets/images/news/new1/n24.jpg',
        'assets/images/news/new1/n25.jpg',
        'assets/images/news/new1/n26.jpg',
        'assets/images/news/new1/n27.jpg',
        'assets/images/news/new1/n28.jpg',
      ],
      date: '2025-03-27',
      name: 'Спортивні досягнення наших легкоатлетів на Всеукраїнських шкільних лігах! 🏆',
      description:
        '27 березня учні нашого ліцею взяли участь у ІІ територіальному етапі Всеукраїнських шкільних ліг "Пліч-о-пліч" з легкої атлетики. Команда 5-го класу змагалася на базі Зибківського ліцею, проявивши характер та наполегливість, а команда 6-7-х класів виборола почесне третє місце на базі Камбурліївського ліцею. Вітаємо наших учасників та бажаємо нових спортивних перемог! 🏅👏',
    },
    {
      photos: [
        'assets/images/news/new2/n1.jpg',
        'assets/images/news/new2/n2.jpg',
        'assets/images/news/new2/n3.jpg',
        'assets/images/news/new2/n4.jpg',
        'assets/images/news/new2/n5.jpg',
        'assets/images/news/new2/n6.jpg',
        'assets/images/news/new2/n7.jpg',
        'assets/images/news/new2/n8.jpg',
        'assets/images/news/new2/n9.jpg',
        'assets/images/news/new2/n10.jpg',
        'assets/images/news/new2/n11.jpg',
        'assets/images/news/new2/n12.jpg',
        'assets/images/news/new2/n13.jpg',
        'assets/images/news/new2/n14.jpg',
        'assets/images/news/new2/n15.jpg',
        'assets/images/news/new2/n16.jpg',
        'assets/images/news/new2/n17.jpg',
        'assets/images/news/new2/n18.jpg',
        'assets/images/news/new2/n19.jpg',
        'assets/images/news/new2/n20.jpg',
        'assets/images/news/new2/n21.jpg',
        'assets/images/news/new2/n22.jpg',
        'assets/images/news/new2/n23.jpg',
        'assets/images/news/new2/n24.jpg',
        'assets/images/news/new2/n25.jpg',
        'assets/images/news/new2/n26.jpg',
        'assets/images/news/new2/n27.jpg',
        'assets/images/news/new2/n28.jpg',
        'assets/images/news/new2/n29.jpg',
        'assets/images/news/new2/n30.jpg',
      ],
      date: '2025-03-26',
      name: 'Весняний кубок Павлиського ліцею: яскравий старт щорічної традиції! 🏆',
      description:
        'Цьогорічний Весняний кубок став справжнім святом футболу, емоцій та несподіванок! Чотири команди – Збірна вчителів, Збірна учнів-1 (старші), Збірна учнів-2 (молодші) та "Фурія" (дівчата) – змагалися за головний трофей. Перемогу здобула Збірна вчителів, а кращим гравцем турніру стала Жмирьова Кароліна. Весняний кубок тепер стає щорічною традицією, відкриваючи сезон спортивних змагань у нашому закладі! 🏅👏',
    },
    {
      photos: [
        'assets/images/news/new3/n1.jpg',
        'assets/images/news/new3/n2.jpg',
      ],
      date: '2025-03-21',
      name: 'Вітаємо команду "Патріоти" з ІІІ місцем на районному етапі змагань з черліденгу! 🎉',
      description:
        'Вітаємо нашу команду "Патріоти" із ІІІ місцем на ІІІ (районному) етапі фізкультурно-оздоровчого заходу та змагань "Пліч-о-пліч Всеукраїнські шкільні ліги" з черліденгу. Тренер команди - Ксенія Кушніренко. Бажаємо подальших успіхів та нових перемог! 🏅👏',
    },
  ];

  currentNewsIndex = 0;
  currentPhotos: string[] = [];
  photoInterval: any;

  ngOnInit() {
    this.updateCurrentPhotos();
    this.startPhotoRotation();
  }

  ngOnDestroy() {
    clearInterval(this.photoInterval);
  }

  updateCurrentPhotos() {
    this.currentPhotos = this.news
      .slice(
        this.currentNewsIndex,
        this.currentNewsIndex + this.getVisibleNewsCount()
      )
      .map((item) => this.getRandomPhoto(item.photos));
  }

  getRandomPhoto(photos: string[]): string {
    return photos[Math.floor(Math.random() * photos.length)];
  }

  startPhotoRotation() {
    this.photoInterval = setInterval(() => {
      this.updateCurrentPhotos();
    }, 5000); // змінює зображення кожні 5 секунд
  }

  previousNews() {
    if (this.currentNewsIndex > 0) {
      this.currentNewsIndex--;
    } else {
      this.currentNewsIndex = this.news.length - this.getVisibleNewsCount();
    }
    this.updateCurrentPhotos();
  }

  nextNews() {
    if (this.currentNewsIndex < this.news.length - this.getVisibleNewsCount()) {
      this.currentNewsIndex++;
    } else {
      this.currentNewsIndex = 0;
    }
    this.updateCurrentPhotos();
  }

  getVisibleNewsCount(): number {
    const width = window.innerWidth;
    if (width < 675) {
      return 1;
    } else if (width < 996) {
      return 2;
    } else {
      return 3;
    }
  }
}
