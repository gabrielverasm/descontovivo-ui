import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AsyncPipe, DatePipe } from '@angular/common';

import { AuthService } from '../../core/services/auth.service';
import { AccountDataService, DataRequestType, DataRequestSummary } from '../../core/services/account-data.service';
import { SeoService } from '../../core/services/seo.service';
import { AccountMe } from '../../core/models/account-me.model';
import { canModerate, hasRole } from '../../core/utils/permissions';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [FormsModule, RouterLink, AsyncPipe, DatePipe],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
})
export class AccountComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly accountDataService = inject(AccountDataService);
  private readonly seo = inject(SeoService);

  readonly currentUser$ = this.authService.currentUser$;

  // Data request form
  requestType: DataRequestType | '' = '';
  requestDetails = '';
  submitting = false;
  successMessage = '';
  errorMessage = '';

  // My requests list
  myRequests: DataRequestSummary[] = [];
  loadingRequests = false;

  readonly requestTypes: { value: DataRequestType; label: string }[] = [
    { value: 'ACCESS', label: 'Acesso aos meus dados' },
    { value: 'CORRECTION', label: 'Correção de dados' },
    { value: 'DELETION', label: 'Exclusão da conta/dados' },
    { value: 'ANONYMIZATION', label: 'Anonimização de dados' },
    { value: 'CONSENT_REVOCATION', label: 'Revogação de consentimento' },
    { value: 'OTHER', label: 'Outro pedido' },
  ];

  private readonly typeLabels: Record<string, string> = {
    ACCESS: 'Acesso aos dados',
    CORRECTION: 'Correção de dados',
    DELETION: 'Exclusão da conta/dados',
    ANONYMIZATION: 'Anonimização',
    CONSENT_REVOCATION: 'Revogação de consentimento',
    OTHER: 'Outro pedido',
  };

  private readonly statusLabels: Record<string, string> = {
    PENDING: 'Pendente',
    IN_REVIEW: 'Em análise',
    COMPLETED: 'Concluída',
    REJECTED: 'Rejeitada',
  };

  ngOnInit(): void {
    this.seo.setNonIndexable('Minha conta | DescontoVivo', 'Gerencie seus dados e privacidade no DescontoVivo.');
    this.loadMyRequests();
  }

  getUserDisplayName(user: AccountMe): string {
    return user.name?.trim() || user.preferredUsername?.trim() || user.preferred_username?.trim() || user.username?.trim() || 'Usuário';
  }

  getUserInitial(user: AccountMe): string {
    return this.getUserDisplayName(user).charAt(0).toUpperCase();
  }

  getRoles(user: AccountMe): string[] {
    const labels: string[] = ['Usuário'];
    if (canModerate(user)) labels.push('Moderador');
    if (hasRole(user, 'admin')) labels.push('Administrador');
    return labels;
  }

  translateType(type: string): string {
    return this.typeLabels[type] || type;
  }

  translateStatus(status: string): string {
    return this.statusLabels[status] || status;
  }

  submitRequest(): void {
    if (!this.requestType) {
      this.errorMessage = 'Selecione o tipo de solicitação.';
      return;
    }
    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.accountDataService.createDataRequest(this.requestType, this.requestDetails.trim()).subscribe({
      next: (res) => {
        this.successMessage = res.message;
        this.requestType = '';
        this.requestDetails = '';
        this.submitting = false;
        this.loadMyRequests();
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 401 || err.status === 403) {
          this.errorMessage = 'Sua sessão expirou. Entre novamente para enviar a solicitação.';
        } else {
          this.errorMessage = 'Não foi possível enviar a solicitação. Tente novamente.';
        }
        this.submitting = false;
      },
    });
  }

  logout(): void {
    this.authService.logout();
  }

  private loadMyRequests(): void {
    this.loadingRequests = true;
    this.accountDataService.getMyDataRequests().subscribe({
      next: (requests) => {
        this.myRequests = requests;
        this.loadingRequests = false;
      },
      error: () => {
        this.loadingRequests = false;
      },
    });
  }
}
