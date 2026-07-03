import { Component, HostListener, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { AccountMe } from '../../core/models/account-me.model';
import { canModerate, hasRole } from '../../core/utils/permissions';

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
  isUserMenuOpen = false;
  isInfoMenuOpen = false;
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
    if (this.isUserMenuOpen) {
      this.closeUserMenu();
    }
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu() {
    this.isMenuOpen = false;
  }

  toggleUserMenu() {
    this.isUserMenuOpen = !this.isUserMenuOpen;
    this.isInfoMenuOpen = false;
  }

  openUserMenu() {
    this.isUserMenuOpen = true;
    this.isInfoMenuOpen = false;
  }

  closeUserMenu() {
    this.isUserMenuOpen = false;
  }

  toggleInfoMenu() {
    this.isInfoMenuOpen = !this.isInfoMenuOpen;
    this.isUserMenuOpen = false;
  }

  openInfoMenu() {
    this.isInfoMenuOpen = true;
    this.isUserMenuOpen = false;
  }

  closeInfoMenu() {
    this.isInfoMenuOpen = false;
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

  getUserDisplayName(user: AccountMe): string {
    const generics = ['user', 'usuario', 'usuário', 'usuario desconhecido', 'usuário desconhecido', 'minha conta'];
    const isGeneric = (v: string | null | undefined): boolean =>
      !v || generics.includes(v.trim().toLowerCase());

    if (!isGeneric(user.name)) return user.name!.trim();
    if (!isGeneric(user.preferredUsername ?? user.preferred_username)) return (user.preferredUsername ?? user.preferred_username)!.trim();
    if (!isGeneric(user.username)) return user.username!.trim();
    if (user.email) return user.email.split('@')[0];
    return 'Minha conta';
  }

  getUserInitial(user: AccountMe): string {
    return this.getUserDisplayName(user).charAt(0).toUpperCase();
  }

  isAdmin(user: AccountMe): boolean {
    return hasRole(user, 'admin');
  }

  isModerator(user: AccountMe): boolean {
    return canModerate(user);
  }
}
