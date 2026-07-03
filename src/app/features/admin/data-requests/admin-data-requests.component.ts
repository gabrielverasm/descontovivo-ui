import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { SeoService } from '../../../core/services/seo.service';
import { AdminDataRequestService } from '../../../core/services/admin-data-request.service';
import {
  AdminDataRequestFilters,
  AdminDataRequestStatus,
  AdminDataRequestSummary,
  AdminDataRequestType,
  AdminDataRequestUpdate,
} from '../../../core/models/admin-data-request.model';

@Component({
  selector: 'app-admin-data-requests',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './admin-data-requests.component.html',
  styleUrl: './admin-data-requests.component.scss',
})
export class AdminDataRequestsComponent implements OnInit {
  private readonly service = inject(AdminDataRequestService);

  constructor() {
    inject(SeoService).setNoIndex();
  }

  // State
  requests: AdminDataRequestSummary[] = [];
  loading = true;
  error = '';
  successMessage = '';

  // Filters
  filterStatus: AdminDataRequestStatus | '' = '';
  filterType: AdminDataRequestType | '' = '';

  // Update action
  actionInProgress: string | null = null;
  showUpdateModal = false;
  updateTargetId: string | null = null;
  updateTargetStatus: AdminDataRequestStatus | null = null;
  updateNote = '';
  updateError = '';

  // Labels
  readonly statusLabels: Record<AdminDataRequestStatus, string> = {
    PENDING: 'Pendente',
    IN_REVIEW: 'Em análise',
    COMPLETED: 'Concluída',
    REJECTED: 'Rejeitada',
  };

  readonly typeLabels: Record<AdminDataRequestType, string> = {
    ACCESS: 'Acesso aos dados',
    CORRECTION: 'Correção de dados',
    DELETION: 'Exclusão de dados',
    ANONYMIZATION: 'Anonimização',
    CONSENT_REVOCATION: 'Revogação de consentimento',
    OTHER: 'Outro',
  };

  readonly statusOptions: { value: AdminDataRequestStatus | ''; label: string }[] = [
    { value: '', label: 'Todos' },
    { value: 'PENDING', label: 'Pendente' },
    { value: 'IN_REVIEW', label: 'Em análise' },
    { value: 'COMPLETED', label: 'Concluída' },
    { value: 'REJECTED', label: 'Rejeitada' },
  ];

  readonly typeOptions: { value: AdminDataRequestType | ''; label: string }[] = [
    { value: '', label: 'Todos' },
    { value: 'ACCESS', label: 'Acesso aos dados' },
    { value: 'CORRECTION', label: 'Correção de dados' },
    { value: 'DELETION', label: 'Exclusão de dados' },
    { value: 'ANONYMIZATION', label: 'Anonimização' },
    { value: 'CONSENT_REVOCATION', label: 'Revogação de consentimento' },
    { value: 'OTHER', label: 'Outro' },
  ];

  ngOnInit(): void {
    this.load();
  }

  load(options?: { preserveSuccess?: boolean }): void {
    this.loading = true;
    this.error = '';
    if (!options?.preserveSuccess) {
      this.successMessage = '';
    }

    const filters: AdminDataRequestFilters = {};
    if (this.filterStatus) filters.status = this.filterStatus;
    if (this.filterType) filters.type = this.filterType;

    this.service.list(filters).pipe(
      finalize(() => (this.loading = false)),
    ).subscribe({
      next: (data) => {
        this.requests = data ?? [];
      },
      error: (err) => {
        this.successMessage = '';
        if (err.status === 401 || err.status === 403) {
          this.error = 'Você não tem permissão para acessar esta área.';
        } else {
          this.error = 'Não foi possível carregar as solicitações.';
        }
      },
    });
  }

  onFilterChange(): void {
    this.load();
  }

  // Actions
  markInReview(request: AdminDataRequestSummary): void {
    this.successMessage = '';
    this.updateTargetId = request.id;
    this.updateTargetStatus = 'IN_REVIEW';
    this.updateNote = '';
    this.updateError = '';
    this.showUpdateModal = true;
  }

  markCompleted(request: AdminDataRequestSummary): void {
    this.successMessage = '';
    this.updateTargetId = request.id;
    this.updateTargetStatus = 'COMPLETED';
    this.updateNote = '';
    this.updateError = '';
    this.showUpdateModal = true;
  }

  markRejected(request: AdminDataRequestSummary): void {
    this.successMessage = '';
    this.updateTargetId = request.id;
    this.updateTargetStatus = 'REJECTED';
    this.updateNote = '';
    this.updateError = '';
    this.showUpdateModal = true;
  }

  cancelUpdate(): void {
    this.showUpdateModal = false;
    this.updateTargetId = null;
    this.updateTargetStatus = null;
    this.updateNote = '';
    this.updateError = '';
  }

  confirmUpdate(): void {
    if (!this.updateTargetId || !this.updateTargetStatus) return;

    const isFinal = this.updateTargetStatus === 'COMPLETED' || this.updateTargetStatus === 'REJECTED';
    if (isFinal && !this.updateNote.trim()) {
      this.updateError = 'A nota de resolução é obrigatória para concluir ou rejeitar.';
      return;
    }

    const payload: AdminDataRequestUpdate = {
      status: this.updateTargetStatus,
    };
    if (this.updateNote.trim()) {
      payload.resolutionNote = this.updateNote.trim();
    }

    this.actionInProgress = this.updateTargetId;
    this.updateError = '';

    this.service.updateStatus(this.updateTargetId, payload).pipe(
      finalize(() => (this.actionInProgress = null)),
    ).subscribe({
      next: () => {
        this.cancelUpdate();
        this.successMessage = 'Solicitação atualizada com sucesso.';
        this.load({ preserveSuccess: true });
      },
      error: (err) => {
        if (err.status === 400) {
          this.updateError = 'Não foi possível atualizar. Verifique se a solicitação já foi finalizada.';
        } else if (err.status === 404) {
          this.updateError = 'Solicitação não encontrada.';
        } else if (err.status === 401 || err.status === 403) {
          this.updateError = 'Você não tem permissão para esta ação.';
        } else {
          this.updateError = 'Não foi possível atualizar a solicitação.';
        }
      },
    });
  }

  getUpdateModalTitle(): string {
    switch (this.updateTargetStatus) {
      case 'IN_REVIEW': return 'Marcar em análise';
      case 'COMPLETED': return 'Concluir solicitação';
      case 'REJECTED': return 'Rejeitar solicitação';
      default: return 'Atualizar solicitação';
    }
  }

  isNoteRequired(): boolean {
    return this.updateTargetStatus === 'COMPLETED' || this.updateTargetStatus === 'REJECTED';
  }

  isFinalStatus(status: AdminDataRequestStatus): boolean {
    return status === 'COMPLETED' || status === 'REJECTED';
  }

  canChangeStatus(request: AdminDataRequestSummary): boolean {
    return !this.isFinalStatus(request.status);
  }
}
