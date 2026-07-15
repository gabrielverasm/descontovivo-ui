import { isPlatformBrowser } from '@angular/common';
import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, take } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { AnalyticsService } from './core/analytics/analytics.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly analytics = inject(AnalyticsService);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  ngOnInit(): void {
    if (!this.isBrowser) return;

    this.authService.checkAuth().pipe(take(1)).subscribe();
    this.analytics.init();

    // Scroll to top on navigation, except for the feed (which manages its own scroll state)
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((event) => {
        if (event.urlAfterRedirects !== '/' && !event.urlAfterRedirects.startsWith('/?')) {
          window.scrollTo(0, 0);
        }
      });
  }
}
