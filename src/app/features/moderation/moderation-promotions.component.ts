import { Component, inject, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { Promotion } from '../../core/models/promotion.model';
import { ModerationService } from '../../core/services/moderation.service';

@Component({
  selector: 'app-moderation-promotions',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  templateUrl: './moderation-promotions.component.html',
  styleUrl: './moderation-promotions.component.scss',
})
export class ModerationPromotionsComponent implements OnInit {
  private readonly moderationService = inject(ModerationService);

  promotions: Promotion[] = [];
  loading = true;
  error = '';
  actionInProgress: string | null = null;
  rejectingId: string | null = null;
  rejectReason = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.moderationService.getPending().pipe(
      finalize(() => (this.loading = false)),
    ).subscribe({
      next: (res) => (this.promotions = res ?? []),
      error: () => (this.error = 'Erro ao carregar promoções pendentes.'),
    });
  }

  approve(promo: Promotion): void {
    this.error = '';
    this.actionInProgress = promo.id;
    this.moderationService.decide(promo.id, { action: 'APPROVE', reason: 'Aprovado pela moderação' }).pipe(
      finalize(() => (this.actionInProgress = null)),
    ).subscribe({
      next: () => this.removeFromList(promo.id),
      error: () => (this.error = `Erro ao aprovar "${promo.title}".`),
    });
  }

  startReject(promo: Promotion): void {
    this.error = '';
    this.rejectingId = promo.id;
    this.rejectReason = '';
  }

  cancelReject(): void {
    this.rejectingId = null;
    this.rejectReason = '';
  }

  confirmReject(promo: Promotion): void {
    this.error = '';
    const reason = this.rejectReason.trim() || 'Rejeitado pela moderação';
    this.actionInProgress = promo.id;
    this.moderationService.decide(promo.id, {
      action: 'REJECT',
      reason,
    }).pipe(
      finalize(() => {
        this.actionInProgress = null;
        this.rejectingId = null;
        this.rejectReason = '';
      }),
    ).subscribe({
      next: () => this.removeFromList(promo.id),
      error: () => (this.error = `Erro ao rejeitar "${promo.title}".`),
    });
  }

  private removeFromList(id: string): void {
    this.promotions = this.promotions.filter((p) => p.id !== id);
  }
}
