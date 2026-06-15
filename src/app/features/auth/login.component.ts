import { Component, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { FloatingFieldComponent } from '../../shared/components/floating-field/floating-field.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, BreadcrumbComponent, FloatingFieldComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  constructor() {
    inject(Meta).updateTag({ name: 'description', content: 'Entre no DescontoVivo para publicar promoções, participar da comunidade e acompanhar ofertas.' });
  }
}
