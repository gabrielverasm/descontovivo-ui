import { Component, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { AuthService } from '../../core/services/auth.service';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, BreadcrumbComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  private readonly meta = inject(Meta);
  private readonly authService = inject(AuthService);

  constructor() {
    inject(SeoService).setNoIndex();
    this.meta.updateTag({ name: 'description', content: 'Crie sua conta no DescontoVivo para enviar promoções, votar em ofertas e participar da comunidade.' });
  }

  register(): void {
    this.authService.login();
  }
}
