import { Component, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { AuthService } from '../../core/services/auth.service';
import { SeoService } from '../../core/services/seo.service';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { AnalyticsService } from '../../core/analytics/analytics.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [BreadcrumbComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly analytics = inject(AnalyticsService);

  constructor() {
    inject(SeoService).setNoIndex();
    inject(Meta).updateTag({
      name: 'description',
      content:
        'Entre no DescontoVivo ou crie sua conta grátis para publicar promoções, votar em ofertas e participar da comunidade.',
    });
  }

  login(): void {
    this.analytics.trackLoginStart();
    this.authService.login();
  }

  register(): void {
    this.analytics.trackSignUpStart();
    this.authService.register();
  }
}
