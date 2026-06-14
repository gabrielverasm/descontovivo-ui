import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { FileFieldComponent } from '../../shared/components/file-field/file-field.component';
import { FloatingFieldComponent } from '../../shared/components/floating-field/floating-field.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, BreadcrumbComponent, FloatingFieldComponent, FileFieldComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  passwordStrength = 0;

  get passwordHint() {
    if (this.passwordStrength === 0) return '';
    if (this.passwordStrength === 1) return 'Senha fraca';
    if (this.passwordStrength === 2) return 'Senha razoável';
    return 'Senha forte';
  }

  onPasswordInput(value: string) {
    if (!value) { this.passwordStrength = 0; return; }
    let score = 0;
    if (value.length >= 8) score++;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value) || /[0-9]/.test(value)) score++;
    this.passwordStrength = score;
  }
}
