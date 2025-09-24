import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NewsService } from '../../services/news.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-news-detail',
  templateUrl: './news-detail.component.html',
  styleUrls: ['./news-detail.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class NewsDetailComponent implements OnInit {
  newsItem: any;
  currentPhotoIndex = 0;

  constructor(
    private route: ActivatedRoute,
    private newsService: NewsService
  ) {}

  ngOnInit() {
    const newsId = Number(this.route.snapshot.paramMap.get('id'));
    this.newsService.getNewsById(newsId).subscribe((data) => {
      this.newsItem = data;
    });
  }

  nextPhoto() {
    if (this.newsItem) {
      this.currentPhotoIndex =
        (this.currentPhotoIndex + 1) % this.newsItem.images.length;
    }
  }

  prevPhoto() {
    if (this.newsItem) {
      this.currentPhotoIndex =
        (this.currentPhotoIndex - 1 + this.newsItem.images.length) %
        this.newsItem.images.length;
    }
  }
}
