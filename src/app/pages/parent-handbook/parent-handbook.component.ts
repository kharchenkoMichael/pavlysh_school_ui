import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-parent-handbook',
  templateUrl: './parent-handbook.component.html',
  styleUrls: ['./parent-handbook.component.scss'],
  imports: [CommonModule],
  standalone: true,
})
export class ParentHandbookComponent {
  handbookSections = [
  {
    title: 'Законодавство',
    class: 'regulations',
    items: [
      {
        name: 'Закон України "Про освіту"',
        link: 'http://www.onufriivka-school.edukit.kr.ua/Files/downloads/Закон%20України%20Про%20освіту.doc'
      },
      {
        name: 'Закон України "Про загальну середню освіту"',
        link: 'http://www.onufriivka-school.edukit.kr.ua/Files/downloads/Закон%20України%20Про%20загальну%20середню%20освіту.docx'
      },
      {
        name: 'Закон України "Про охорону праці"',
        link: 'http://www.onufriivka-school.edukit.kr.ua/Files/downloads/Закон%20України%20про%20ОП.docx'
      },
      {
        name: 'Закон України "Про відпустки"',
        link: 'http://www.onufriivka-school.edukit.kr.ua/Files/downloads/Відпустки.doc'
      },
      {
        name: 'Конвенція про права дитини',
        link: 'http://www.onufriivka-school.edukit.kr.ua/Files/downloads/Конвенція.doc'
      },
      {
        name: 'Національна доктрина розвитку освіти',
        link: 'http://www.onufriivka-school.edukit.kr.ua/Files/downloads/Національна%20доктрина%20розвитку%20освіти.doc'
      }
    ]
  },

  {
    title: 'Документи школи',
    class: 'school-documents',
    items: [
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
        name: 'Освітня програма закладу на 2022–2023 навчальний рік',
        link: '/assets/documents/Освітня програма на 2022-2023 н. р..pdf',
      },
    ]
  }
  ];
}
