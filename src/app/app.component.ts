import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { take } from 'rxjs';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    this.authService.checkAuth().pipe(take(1)).subscribe();
  }
}
