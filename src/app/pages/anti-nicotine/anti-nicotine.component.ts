import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-anti-nicotine',
  standalone: true,
  imports: [],
  templateUrl: './anti-nicotine.component.html',
  styleUrl: './anti-nicotine.component.scss'
})
export class AntiNicotineComponent {
  // Матеріали соціальної кампанії ГО «Центр громадянського представництва
  // „Життя“» — поширюємо на прохання відділу освіти (лист від 06.10.2026
  // № 01-20/921/1). Відео лежать на Google Диску правовласника.
  readonly mainVideo: SafeResourceUrl;

  constructor(sanitizer: DomSanitizer) {
    this.mainVideo = sanitizer.bypassSecurityTrustResourceUrl(
      'https://drive.google.com/file/d/105vWPY0ZrZEf2Ra-AbdGKpV2Olf3LD_7/preview'
    );
  }
}
