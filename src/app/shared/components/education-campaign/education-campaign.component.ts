import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-education-campaign',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './education-campaign.component.html',
  styleUrls: ['./education-campaign.component.scss'],
})
export class EducationCampaignComponent {
  photos = [
    'assets/images/education-campaign/photo1.png',
    'assets/images/education-campaign/photo2.png',
    'assets/images/education-campaign/photo3.png',
    'assets/images/education-campaign/photo4.png',
    'assets/images/education-campaign/photo5.png',
  ];
}
