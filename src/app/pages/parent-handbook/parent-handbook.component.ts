import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-parent-handbook',
  templateUrl: './parent-handbook.component.html',
  styleUrls: ['./parent-handbook.component.scss'],
  imports: [CommonModule],
})
export class ParentHandbookComponent {
  handbookSections = [
    // {
    //   title: 'Філософія',
    //   link: '/philosophy',
    //   items: [
    //     { name: 'Місія', link: '/philosophy#mission' },
    //     { name: 'Участь батьків', link: '/philosophy#participation' },
    //     { name: 'Цінності', link: '/philosophy#values' },
    //     { name: 'Навички XXI століття', link: '/philosophy#skills' },
    //   ],
    //   class: 'philosophy',
    // },
    // {
    //   title: 'Навчальний підхід',
    //   items: [
    //     { name: 'Ротація класів', link: '/class-rotation' },
    //     { name: 'Профілі навчання', link: '/learning-profiles' },
    //     { name: 'Викладання іноземних мов', link: '/foreign-languages' },
    //     {
    //       name: 'Індивідуальні заняття з учителями',
    //       link: '/individual-lessons',
    //     },
    //     { name: 'Професійна орієнтація', link: '/career-guidance' },
    //     {
    //       name: 'Відвідування уроків спорту та спортивних секцій',
    //       link: '/sports-classes',
    //     },
    //     {
    //       name: 'U-Can (україно-канадійська інтегрована програма)',
    //       link: '/u-can',
    //     },
    //     {
    //       name: 'Клас підтримки для дітей з особливими освітніми потребами',
    //       link: '/support-class',
    //     },
    //   ],
    //   class: 'educational-approach',
    // },
    // {
    //   title: "Зворотний зв'язок",
    //   items: [
    //     { name: 'Комунікація', link: '/communication' },
    //     { name: 'Адміністрація Школи', link: '/school-administration' },
    //     { name: 'Батьківські зустрічі', link: '/parent-meetings' },
    //     { name: 'Відомості про учнів', link: '/student-info' },
    //     { name: 'Розсилки', link: '/newsletters' },
    //     { name: 'SMS-розсилки', link: '/sms-notifications' },
    //   ],
    //   class: 'feedback',
    // },
    // {
    //   title: 'Навчальний супровід та організація навчального процесу',
    //   items: [
    //     { name: 'Структура навчального року', link: '/school-year-structure' },
    //     { name: 'Структура навчального дня', link: '/school-day-structure' },
    //     { name: 'Зустріч та забирання учнів', link: '/student-pickup' },
    //     {
    //       name: 'Як бути дорослим на території Школи?',
    //       link: '/adult-behavior',
    //     },
    //     {
    //       name: 'Популярні запитання про дистанційне навчання',
    //       link: '/distance-learning-faq',
    //     },
    //   ],
    //   class: 'academic-support',
    // },
    // {
    //   title: 'Шкільні традиції',
    //   items: [
    //     { name: 'Дні вільної форми', link: '/casual-days' },
    //     { name: 'Дні народження', link: '/birthdays' },
    //     { name: 'Великий екран', link: '/big-screen' },
    //     { name: 'Привітання вчителів', link: '/teacher-greetings' },
    //     { name: 'Фото- та відеозйомка', link: '/photo-video' },
    //     {
    //       name: 'День народження Школи та День випускника',
    //       link: '/school-birthday',
    //     },
    //     { name: 'Виконання Гімну України', link: '/national-anthem' },
    //     { name: 'День Лідерства', link: '/leadership-day' },
    //     { name: 'W5H', link: '/w5h' },
    //     { name: 'Туристичний зліт', link: '/tourist-rally' },
    //     { name: 'Перший дзвоник та Play Day', link: '/first-bell' },
    //     { name: 'Прощання з випускниками', link: '/farewell-graduates' },
    //     {
    //       name: 'Політика турботи про довкілля',
    //       link: '/environmental-policy',
    //     },
    //   ],
    //   class: 'school-traditions',
    // },
    // {
    //   title: 'ІКТ (інформаційно-комунікаційні технології)',
    //   items: [
    //     {
    //       name: 'Електронна скринька (єдиний доступ до шкільних систем)',
    //       link: '/email-access',
    //     },
    //     {
    //       name: 'School Today (система управління навчанням)',
    //       link: '/school-today',
    //     },
    //     { name: 'Планшети', link: '/tablets' },
    //   ],
    //   class: 'ict',
    // },
    // {
    //   title: 'Позаурочна активність',
    //   items: [
    //     { name: 'Гуртки', link: '/clubs' },
    //     { name: 'Екскурсії', link: '/excursions' },
    //     { name: 'Поїздки', link: '/trips' },
    //   ],
    //   class: 'extracurricular',
    // },
    // {
    //   title: 'Харчування',
    //   items: [
    //     { name: 'Меню', link: '/menu' },
    //     { name: 'Розклад харчування', link: '/meal-schedule' },
    //     { name: 'Додаткове харчування', link: '/additional-meals' },
    //     { name: 'Кафетерій', link: '/cafeteria' },
    //   ],
    //   class: 'nutrition',
    // },
    // {
    //   title: 'Медичне обслуговування',
    //   items: [
    //     { name: 'Графік роботи', link: '/medical-schedule' },
    //     { name: 'Медичні огляди', link: '/medical-checkups' },
    //     {
    //       name: 'COVID-19. Що ми робимо для здорового середовища',
    //       link: '/covid-measures',
    //     },
    //   ],
    //   class: 'medical',
    // },
    // {
    //   title: 'Безпека та вихід дітей зі Школи',
    //   items: [
    //     { name: 'Картки доступу', link: '/access-cards' },
    //     { name: 'Порядок доступу', link: '/access-procedure' },
    //     { name: 'Заяви', link: '/applications' },
    //   ],
    //   class: 'safety',
    // },
    {
      title: 'Нормативна база',
      link: '/parent-handbook',
      items: [
        {
          name: 'Закон України "Про освіту"',
          link: 'https://osvita.ua/legislation/law/2231/',
        },
        {
          name: 'Закон України "Про загальну середню освіту"',
          link: 'https://urst.com.ua/act/pro_povnu_zagalnu_serednyu_osvitu',
        },
        {
          name: 'Ліцензійні умови провадження освітньої діяльності',
          link: 'https://mon.gov.ua/static-objects/mon/sites/1/regulatorna_dijalnist/licz-umovi-23.08.17.pdf',
        },
        {
          name: 'Положення про інклюзивне навчання',
          link: 'https://osvita.ua/legislation/Ser_osv/84315/',
        },
        {
          name: 'Положення про дистанційне навчання',
          link: 'https://osvita.ua/legislation/Dist_osv/2999/',
        },
        {
          name: 'Статут закладу',
          link: '/assets/documents/Статут_Павлис_кий_лiцей.pdf',
        },
        {
          name: 'Розпорядження на ліцензію',
          link: '/assets/documents/розпорядження на ліцензію.pdf',
        },
        {
          name: 'Положення про філію',
          link: '/assets/documents/polozhennja_filija.pdf',
        },
        {
          name: 'Положення про внутрішню систему забезпечення якості освіти',
          link: '/assets/documents/Положення про ВСОЯО.pdf',
        },
        {
          name: 'Заява на отримання ліцензії',
          link: '/assets/documents/zajava_na_otrimannja_licenziji.pdf',
        },
        {
          name: 'Письмове зобов’язання',
          link: '/assets/documents/pismove_zobovjazannja_onovlene.pdf',
        },
        {
          name: 'Додаток_1_Кадрове забезпечення',
          link: '/assets/documents/dodatok_1_kadrove_zabezpechennja.pdf',
        },
        {
          name: 'Додаток_2_Забезпечення підручниками',
          link: '/assets/documents/dodotok_2_zabezpechennja_pidruchnikami.pdf',
        },
        {
          name: 'Освітня програма закладу на 2022-2023 навчальний рік',
          link: '/assets/documents/Освітня програма на 2022-2023 н. р..pdf',
        },
      ],
      class: 'regulations',
    },
  ];
}
