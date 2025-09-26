import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http'; // <-- обов'язково
import { Component, OnInit, OnDestroy } from '@angular/core';
import { NewsService } from '../../../services/news.service';
import { News } from '../../../models/news';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-news',
  templateUrl: './news.component.html',
  styleUrls: ['./news.component.scss'],
  standalone: true,       
  imports: [CommonModule, HttpClientModule],
})
export class NewsComponent implements OnInit, OnDestroy {
  news: News[] = [];
  currentNewsIndex = 0;
  currentPhotos: string[] = [];
  photoInterval: any;

  constructor(private newsService: NewsService,  private router: Router) {}

  ngOnInit() {
    this.newsService.getPaginationNews(1,3).subscribe((data) => {
      this.news = data.items;
      this.updateCurrentPhotos();
      this.startPhotoRotation();
    });
  }

  ngOnDestroy() {
    clearInterval(this.photoInterval);
  }

  updateCurrentPhotos() {
    console.log(this.news)
    this.currentPhotos = this.news
      .slice(this.currentNewsIndex, this.currentNewsIndex + this.getVisibleNewsCount())
      .map((item) => this.getRandomPhoto(item.images));
  }

  getRandomPhoto(photos: string[]): string {
    return photos[Math.floor(Math.random() * photos.length)];
  }

  startPhotoRotation() {
    this.photoInterval = setInterval(() => {
      this.updateCurrentPhotos();
    }, 5000);
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
    if (width < 675) return 1;
    if (width < 996) return 2;
    return 3;
  }
  
  openNews(newsId: number) {
    this.router.navigate(['/news', newsId]);
  }

  goToNewsPage() {
    this.router.navigate(['/news']); 
  }
}
