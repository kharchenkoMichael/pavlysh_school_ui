import { Component, HostListener } from '@angular/core';
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
  openSubmenu: 'school' | 'parents' | null = null;

  toggleMobileMenu() {
    this.mobileMenuActive = !this.mobileMenuActive;
    this.lockScroll(this.mobileMenuActive);
    if (!this.mobileMenuActive) this.openSubmenu = null;
  }

  closeMobileMenu() {
    if (!this.mobileMenuActive) return;
    this.mobileMenuActive = false;
    this.openSubmenu = null;
    this.lockScroll(false);
  }

  toggleSubmenu(name: 'school' | 'parents') {
    this.openSubmenu = this.openSubmenu === name ? null : name;
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeMobileMenu();
  }

  // Якщо вікно розтягнули до десктопної ширини, меню-шухляду закриваємо.
  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth > 900) this.closeMobileMenu();
  }

  // Поки відкрите мобільне меню, сторінка за ним не гортається.
  private lockScroll(lock: boolean) {
    document.body.style.overflow = lock ? 'hidden' : '';
  }
}
