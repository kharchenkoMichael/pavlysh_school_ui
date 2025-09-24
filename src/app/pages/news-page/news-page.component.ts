import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { NewsService } from '../../services/news.service';
import { News } from '../../models/news';

@Component({
  selector: 'app-news-page',
  templateUrl: './news-page.component.html',
  styleUrls: ['./news-page.component.scss'],
  standalone: true,
  imports: [CommonModule, HttpClientModule],
})
export class NewsPageComponent implements OnInit, OnDestroy {
  news: News[] = [];
  currentPhotos: string[] = [];
  photoInterval: any;

  constructor(private newsService: NewsService, private router: Router) {}

  ngOnInit() {
    this.newsService.getNews().subscribe((data) => {
      this.news = data;
      this.setInitialPhotos();
      this.startPhotoRotation();
    });
  }

  ngOnDestroy() {
    clearInterval(this.photoInterval);
  }

  setInitialPhotos() {
    this.currentPhotos = this.news.map((item) =>
      this.getRandomPhoto(item.images)
    );
  }

  getRandomPhoto(photos: string[]): string {
    return photos[Math.floor(Math.random() * photos.length)];
  }

  startPhotoRotation() {
    this.photoInterval = setInterval(() => {
      this.currentPhotos = this.news.map((item) =>
        this.getRandomPhoto(item.images)
      );
    }, 5000);
  }

  openNews(newsId: number) {
    this.router.navigate(['/news', newsId]);
  }
}
