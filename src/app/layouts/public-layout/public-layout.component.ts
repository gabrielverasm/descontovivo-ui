import { Component, HostListener, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { Observable, Subscription, filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { AccountMe } from '../../core/models/account-me.model';
import { canModerate, hasRole } from '../../core/utils/permissions';
import { PublicNotificationStreamService, PublicNotificationState } from '../../core/services/public-notification-stream.service';
import { ModerationNotificationStreamService, ModerationNotificationState } from '../../core/services/moderation-notification-stream.service';
import { AdminNotificationStreamService, AdminNotificationState } from '../../core/services/admin-notification-stream.service';
import { VersionService } from '../../core/services/version.service';
import { UI_VERSION } from '../../core/app-version';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, AsyncPipe],
  templateUrl: './public-layout.component.html',
  styleUrl: './public-layout.component.scss'
})
export class PublicLayoutComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly notificationStream = inject(PublicNotificationStreamService);
  private readonly moderationStream = inject(ModerationNotificationStreamService);
  private readonly adminStream = inject(AdminNotificationStreamService);
  private readonly titleService = inject(Title);
  private readonly router = inject(Router);
  private readonly versionService = inject(VersionService);
  readonly currentUser$ = this.authService.currentUser$;
  readonly uiVersion = UI_VERSION;
  readonly apiVersion$: Observable<string | null> = this.versionService.getApiVersion();

  notificationState: PublicNotificationState = { connected: false, error: false, publishedCount: 0, latestPublishedAt: null, newPromotionsCount: 0 };
  moderationState: ModerationNotificationState = { connected: false, error: false, moderationPendingCount: 0 };
  adminState: AdminNotificationState = { connected: false, error: false, dataRequestsOpenCount: 0 };

  private notificationSub: Subscription | null = null;
  private userSub: Subscription | null = null;
  private moderationStateSub: Subscription | null = null;
  private adminStateSub: Subscription | null = null;
  private routerSub: Subscription | null = null;

  isHeaderCompact = false;
  isMenuOpen = false;
  isUserMenuOpen = false;
  isInfoMenuOpen = false;
  showBackToTop = false;

  private infoMenuCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private userMenuCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly MENU_CLOSE_DELAY = 220;

  ngOnInit(): void {
    this.notificationStream.connect();
    this.notificationSub = this.notificationStream.state$.subscribe((state) => {
      this.notificationState = state;
      this.updateBrowserNotificationTitle();
    });

    this.userSub = this.authService.currentUser$.subscribe((user) => {
      if (user && canModerate(user)) {
        this.moderationStream.connect();
      } else {
        this.moderationStream.disconnect();
      }

      if (user && hasRole(user, 'admin')) {
        this.adminStream.connect();
      } else {
        this.adminStream.disconnect();
      }
    });

    this.moderationStateSub = this.moderationStream.state$.subscribe((state) => {
      this.moderationState = state;
      this.updateBrowserNotificationTitle();
    });

    this.adminStateSub = this.adminStream.state$.subscribe((state) => {
      this.adminState = state;
      this.updateBrowserNotificationTitle();
    });

    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        // After navigation, Angular TitleStrategy sets the route title.
        // Re-apply notification prefix after a microtask so TitleStrategy runs first.
        setTimeout(() => this.updateBrowserNotificationTitle(), 0);
      });
  }

  ngOnDestroy(): void {
    this.clearInfoTimer();
    this.clearUserTimer();
    this.notificationSub?.unsubscribe();
    this.userSub?.unsubscribe();
    this.moderationStateSub?.unsubscribe();
    this.adminStateSub?.unsubscribe();
    this.routerSub?.unsubscribe();
    this.notificationStream.disconnect();
    this.moderationStream.disconnect();
    this.adminStream.disconnect();
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
      this.openInfoMenu();
      return;
    }
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
      this.openUserMenu();
      return;
    }
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

  get badgeText(): string {
    return this.notificationStream.formatCount(this.notificationState.newPromotionsCount);
  }

  get hasNewPromotions(): boolean {
    return this.notificationState.newPromotionsCount > 0;
  }

  get moderationBadgeText(): string {
    return this.moderationStream.formatCount(this.moderationState.moderationPendingCount);
  }

  get hasModerationPending(): boolean {
    return this.moderationState.moderationPendingCount > 0;
  }

  get dataRequestsBadgeText(): string {
    return this.adminStream.formatCount(this.adminState.dataRequestsOpenCount);
  }

  get hasDataRequestsOpen(): boolean {
    return this.adminState.dataRequestsOpenCount > 0;
  }

  // --- User menu badge (sum of admin notifications) ---

  get userMenuNotificationCount(): number {
    return this.moderationState.moderationPendingCount + this.adminState.dataRequestsOpenCount;
  }

  get hasUserMenuNotifications(): boolean {
    return this.userMenuNotificationCount > 0;
  }

  get userMenuNotificationBadgeText(): string {
    return this.formatNotificationCount(this.userMenuNotificationCount);
  }

  // --- Browser tab title management ---

  get browserTabNotificationCount(): number {
    return this.notificationState.newPromotionsCount
      + this.moderationState.moderationPendingCount
      + this.adminState.dataRequestsOpenCount;
  }

  private updateBrowserNotificationTitle(): void {
    if (typeof document === 'undefined') return;

    const currentTitle = this.titleService.getTitle();
    const stripped = this.stripNotificationPrefix(currentTitle);
    const total = this.browserTabNotificationCount;

    if (total > 0) {
      const prefix = this.formatNotificationCount(total);
      this.titleService.setTitle(`(${prefix}) ${stripped}`);
    } else {
      this.titleService.setTitle(stripped);
    }
  }

  private stripNotificationPrefix(title: string): string {
    return title.replace(/^\(\d+\+?\)\s+/, '');
  }

  private formatNotificationCount(count: number): string {
    if (count <= 0) return '';
    if (count > 99) return '99+';
    return String(count);
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
