import { Component } from '@angular/core';
import { CarouselComponent } from '../../shared/components/carousel/carousel.component';
import { NewsComponent } from '../../shared/components/news/news.component';
import { AdmissionComponent } from '../../shared/components/admission/admission.component';
import { TestimonialsComponent } from '../../shared/components/testimonials/testimonials.component';
import { AddressComponent } from '../../shared/components/address/address.component';
import { AddmissionImageComponent } from '../../shared/components/admission-image/admission-image.component';
import { RegistrationOpenComponent } from '../registration-open/registration-open.component';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  imports: [
    CarouselComponent,
    NewsComponent,
    AddmissionImageComponent,
    RegistrationOpenComponent,
    //AdmissionComponent,
    // TestimonialsComponent,
    AddressComponent,
    CommonModule, 
    HttpClientModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  standalone: true,
})
export class HomeComponent {}
