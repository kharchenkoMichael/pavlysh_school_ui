import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [RouterModule],
  standalone: true,
})
export class HeaderComponent {
  mobileMenuActive = false;

  toggleMobileMenu() {
    this.mobileMenuActive = !this.mobileMenuActive;
  }

  toggleSubmenu(event: Event) {
    const submenus = document.querySelectorAll('.mobile-submenu');
    submenus.forEach((submenu) => submenu.classList.remove('active'));

    const submenu = (event.target as HTMLElement).nextElementSibling;
    if (submenu) {
      submenu.classList.toggle('active');
    }
  }
}
