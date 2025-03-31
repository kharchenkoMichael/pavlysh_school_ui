import { Component } from '@angular/core';
import { CarouselComponent } from '../../shared/components/carousel/carousel.component';
import { NewsComponent } from '../../shared/components/news/news.component';
import { AdmissionComponent } from '../../shared/components/admission/admission.component';
import { TestimonialsComponent } from '../../shared/components/testimonials/testimonials.component';
import { AddressComponent } from '../../shared/components/address/address.component';

@Component({
  selector: 'app-home',
  imports: [
    CarouselComponent,
    NewsComponent,
    AdmissionComponent,
    // TestimonialsComponent,
    AddressComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {}
