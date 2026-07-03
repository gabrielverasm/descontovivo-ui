import { Component, HostListener, inject, OnDestroy } from '@angular/core';
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
export class PublicLayoutComponent implements OnDestroy {
  private readonly authService = inject(AuthService);
  readonly currentUser$ = this.authService.currentUser$;

  isHeaderCompact = false;
  isMenuOpen = false;
  isUserMenuOpen = false;
  isInfoMenuOpen = false;
  showBackToTop = false;

  private infoMenuCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private userMenuCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly MENU_CLOSE_DELAY = 220;

  ngOnDestroy(): void {
    this.clearInfoTimer();
    this.clearUserTimer();
  }

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
    if (this.isInfoMenuOpen) {
      this.closeInfoMenu();
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

  // --- Info menu ---

  toggleInfoMenu() {
    if (this.isHoverCapable()) {
      // Desktop with hover: click only opens, never closes.
      this.openInfoMenu();
      return;
    }
    // Mobile/touch: toggle open/close.
    if (this.isInfoMenuOpen) {
      this.closeInfoMenu();
    } else {
      this.openInfoMenu();
    }
  }

  openInfoMenu() {
    this.clearInfoTimer();
    this.isInfoMenuOpen = true;
    this.closeUserMenu();
  }

  scheduleCloseInfoMenu() {
    this.clearInfoTimer();
    this.infoMenuCloseTimer = setTimeout(() => {
      this.isInfoMenuOpen = false;
    }, this.MENU_CLOSE_DELAY);
  }

  closeInfoMenu() {
    this.clearInfoTimer();
    this.isInfoMenuOpen = false;
  }

  // --- User menu ---

  toggleUserMenu() {
    if (this.isHoverCapable()) {
      // Desktop with hover: click only opens, never closes.
      this.openUserMenu();
      return;
    }
    // Mobile/touch: toggle open/close.
    if (this.isUserMenuOpen) {
      this.closeUserMenu();
    } else {
      this.openUserMenu();
    }
  }

  openUserMenu() {
    this.clearUserTimer();
    this.isUserMenuOpen = true;
    this.closeInfoMenu();
  }

  scheduleCloseUserMenu(delay?: number) {
    this.clearUserTimer();
    this.userMenuCloseTimer = setTimeout(() => {
      this.isUserMenuOpen = false;
    }, delay ?? this.MENU_CLOSE_DELAY);
  }

  closeUserMenu() {
    this.clearUserTimer();
    this.isUserMenuOpen = false;
  }

  // --- Private helpers ---

  private isHoverCapable(): boolean {
    return typeof window !== 'undefined'
      && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }

  private clearInfoTimer() {
    if (this.infoMenuCloseTimer !== null) {
      clearTimeout(this.infoMenuCloseTimer);
      this.infoMenuCloseTimer = null;
    }
  }

  private clearUserTimer() {
    if (this.userMenuCloseTimer !== null) {
      clearTimeout(this.userMenuCloseTimer);
      this.userMenuCloseTimer = null;
    }
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
