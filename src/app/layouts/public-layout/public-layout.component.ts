import { Component, HostListener, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, AsyncPipe],
  templateUrl: './public-layout.component.html',
  styleUrl: './public-layout.component.scss'
})
export class PublicLayoutComponent {
  private readonly authService = inject(AuthService);
  readonly currentUser$ = this.authService.currentUser$;

  isHeaderCompact = false;
  isMenuOpen = false;
  showBackToTop = false;

  @HostListener('window:scroll')
  onWindowScroll() {
    const scrollY = window.scrollY;
    this.showBackToTop = scrollY > 8;

    if (!this.isHeaderCompact && scrollY > 8) {
      this.isHeaderCompact = true;
      return;
    }

    if (this.isHeaderCompact && scrollY <= 1) {
      this.isHeaderCompact = false;
      this.isMenuOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  closeMenuOnEscape() {
    if (this.isMenuOpen) {
      this.closeMenu();
    }
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu() {
    this.isMenuOpen = false;
  }

  get year() {
    return new Date().getFullYear();
  }

  scrollToTop() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth'
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
