import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { filter, map, mergeMap } from 'rxjs/operators';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header.component';
import { FooterComponent } from './shared/components/footer/footer.component';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
})
export class AppComponent implements OnInit {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private title: Title,
    private meta: Meta
  ) {
    this.title.setTitle('Павлиська школа – Офіційний сайт');
    this.meta.addTags([
      { name: 'description', content: 'Офіційний сайт Павлиської школи: новини, розклад, інформація для учнів та батьків.' },
      { name: 'keywords', content: 'Павлиська школа, навчання, освіта, Павлиш, Кіровоградська область' },
      { property: 'og:title', content: 'Павлиська школа' },
      { property: 'og:description', content: 'Сайт школи села Павлиш' },
    ]);
  }

  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.activatedRoute),
      map(route => {
        while (route.firstChild) route = route.firstChild;
        return route;
      }),
      mergeMap(route => route.data)
    ).subscribe(data => {
      if (data['title']) this.title.setTitle(data['title']);
      if (data['description']) this.meta.updateTag({ name: 'description', content: data['description'] });
    });
  }
}
