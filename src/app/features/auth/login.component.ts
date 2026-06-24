import { Component, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, BreadcrumbComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly authService = inject(AuthService);

  constructor() {
    inject(Meta).updateTag({ name: 'description', content: 'Entre no DescontoVivo para publicar promoções, participar da comunidade e acompanhar ofertas.' });
  }

  login(): void {
    this.authService.login();
  }
}
