import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ParentHandbookComponent } from './pages/parent-handbook/parent-handbook.component';
import { PhilosophyComponent } from './pages/handbooks/philosophy/philosophy.component';
import { SchoolHistoryComponent } from './pages/school-history/school-history.component';
import { MuseumComponent } from './pages/museum/museum.component';
import { SchoolPrideComponent } from './pages/school-pride/school-pride.component';
import { AdmissionPageComponent } from './pages/admission-page/admission-page.component';
import { DistanceLearningComponent } from './pages/distance-learning/distance-learning.component';
import { PsychologistsAdviceComponent } from './pages/psychologists-advice/psychologists-advice.component';
import { PsychologicalHelpComponent } from './pages/psychological-help/psychological-help.component';
import { AntiBullyingComponent } from './pages/anti-bullying/anti-bullying.component';
import { InternetSafetyComponent } from './pages/internet-safety/internet-safety.component';
import { RegistrationOpenComponent } from './pages/registration-open/registration-open.component';
import { NewsDetailComponent } from './pages/news-detail/news-detail.component';
import { NewsPageComponent } from './pages/news-page/news-page.component';
import { TeamComponent } from './pages/team/team.component';
import { EducationCampaignComponent } from './shared/components/education-campaign/education-campaign.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    data: {
      title: 'Головна – Павлиська школа',
      description: 'Офіційний сайт Павлиської школи: новини, розклад, події та інформація для учнів і батьків.'
    }
  },
  {
    path: 'parent-handbook',
    component: ParentHandbookComponent,
    data: {
      title: 'Батьківський довідник – Павлиська школа',
      description: 'Інформація для батьків: правила, поради, документи та важливі події школи.'
    }
  },
  {
    path: 'philosophy',
    component: PhilosophyComponent,
    data: {
      title: 'Філософія навчання – Павлиська школа',
      description: 'Основні принципи та цінності Павлиської школи.'
    }
  },
  {
    path: 'school-history',
    component: SchoolHistoryComponent,
    data: {
      title: 'Історія школи – Павлиська школа',
      description: 'Дізнайтеся про історію та розвиток Павлиської школи.'
    }
  },
  {
    path: 'museum',
    component: MuseumComponent,
    data: {
      title: 'Музей школи – Павлиська школа',
      description: 'Віртуальний тур по музею школи та історичні експонати.'
    }
  },
  {
    path: 'school-pride',
    component: SchoolPrideComponent,
    data: {
      title: 'Гордість школи – Павлиська школа',
      description: 'Досягнення та успіхи учнів та вчителів Павлиської школи.'
    }
  },
  {
    path: 'admission',
    component: AdmissionPageComponent,
    data: {
      title: 'Прийом до школи – Павлиська школа',
      description: 'Інформація про вступ, документи та правила прийому до школи.'
    }
  },
  {
    path: 'distance-learning',
    component: DistanceLearningComponent,
    data: {
      title: 'Дистанційне навчання – Павлиська школа',
      description: 'Матеріали та ресурси для дистанційного навчання учнів.'
    }
  },
  {
    path: 'advice',
    component: PsychologistsAdviceComponent,
    data: {
      title: 'Поради психолога – Павлиська школа',
      description: 'Рекомендації та поради від шкільного психолога для учнів і батьків.'
    }
  },
  {
    path: 'psychological',
    component: PsychologicalHelpComponent,
    data: {
      title: 'Психологічна допомога – Павлиська школа',
      description: 'Як отримати психологічну підтримку та допомогу у школі.'
    }
  },
  {
    path: 'anti-bullying',
    component: AntiBullyingComponent,
    data: {
      title: 'Протидія булінгу – Павлиська школа',
      description: 'Інформація та правила протидії булінгу в школі.'
    }
  },
  {
    path: 'internet-safety',
    component: InternetSafetyComponent,
    data: {
      title: 'Безпека в інтернеті – Павлиська школа',
      description: 'Поради та правила безпечного користування інтернетом для учнів.'
    }
  },
  {
    path: 'registration-open',
    component: RegistrationOpenComponent,
    data: {
      title: 'Реєстрація на олімпіади – Павлиська школа',
      description: 'Інформація про відкриття реєстрації на учнівські олімпіади 2025/2026 навчального року.'
    }
  },
  {
    path: 'news/:id',
    component: NewsDetailComponent,
    data: {
      title: 'Новина – Павлиська школа',
      description: 'Деталі новини та всі фотографії'
    }
  },
  {
    path: 'news',
    component: NewsPageComponent,
    data: {
      title: 'Новини – Павлиська школа',
      description: 'Всі новини школи: події, досягнення та важливі оголошення.'
    }
  },
  {
    path: 'team',
    component: TeamComponent,
    data: {
      title: 'Команда школи – Павлиська школа',
      description: 'Список всіх вчителів Павлиської школи з можливістю пошуку та пагінації.'
    }
  },
  {
    path: 'education-campaign',
    component: EducationCampaignComponent,
    data: {
      title: 'Освітня кампанія – Павлиська школа',
      description:
        'Комунікаційна кампанія про важливість освіти: відео та фотоматеріали. Освіта визначає, який слід ми залишимо.'
    }
  },
];
