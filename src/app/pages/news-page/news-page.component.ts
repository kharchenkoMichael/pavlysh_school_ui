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

  page: number = 1;
  pageSize: number = 8;
  total: number = 0;

  constructor(private newsService: NewsService, private router: Router) {}

  ngOnInit() {
    this.loadNews();
  }

  ngOnDestroy() {
    clearInterval(this.photoInterval);
  }

  loadNews() {
    this.newsService.getPaginationNews(this.page, this.pageSize).subscribe((data) => {
      this.news = data.items;
      this.total = data.total;
      this.setInitialPhotos();
      this.startPhotoRotation();
    });
  }

  setInitialPhotos() {
    this.currentPhotos = this.news.map((item) =>
      this.getRandomPhoto(item.images)
    );
  }

  getRandomPhoto(photos: string[]): string {
    return photos?.length ? photos[Math.floor(Math.random() * photos.length)] : 'assets/no-photo.png';
  }

  startPhotoRotation() {
    clearInterval(this.photoInterval);
    this.photoInterval = setInterval(() => {
      this.currentPhotos = this.news.map((item) =>
        this.getRandomPhoto(item.images)
      );
    }, 5000);
  }

  openNews(newsId: number) {
    this.router.navigate(['/news', newsId]);
  }

  nextPage() {
    if (this.page * this.pageSize < this.total) {
      this.page++;
      this.loadNews();
    }
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.loadNews();
    }
  }
  get totalPages(): number {
    return Math.ceil(this.total / this.pageSize);
  }
}

