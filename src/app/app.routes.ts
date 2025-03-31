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

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'parent-handbook', component: ParentHandbookComponent },
  //   { path: 'philosophy', component: PhilosophyComponent },
  { path: 'school-history', component: SchoolHistoryComponent },
  { path: 'museum', component: MuseumComponent },
  { path: 'school-pride', component: SchoolPrideComponent },
  { path: 'admission', component: AdmissionPageComponent },
  { path: 'distance-learning', component: DistanceLearningComponent },
  { path: 'advice', component: PsychologistsAdviceComponent },
];
