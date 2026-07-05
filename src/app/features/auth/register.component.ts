import { Component, inject, OnInit } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { AuthService } from '../../core/services/auth.service';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent implements OnInit {
  private readonly authService = inject(AuthService);

  constructor() {
    inject(SeoService).setNoIndex();
    inject(Meta).updateTag({
      name: 'description',
      content:
        'Crie sua conta no DescontoVivo para enviar promoções, votar em ofertas e participar da comunidade.',
    });
  }

  ngOnInit(): void {
    this.authService.register();
  }
}
