import { Component, inject, OnInit } from '@angular/core';
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

  ngOnInit(): void {
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
