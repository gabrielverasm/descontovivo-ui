import { Component, inject, OnInit } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { Promotion } from '../../core/models/promotion.model';
import { ModerationService, ModerationDecisionRequest } from '../../core/services/moderation.service';
import { PromotionImageComponent } from '../../shared/components/promotion-image/promotion-image.component';

interface FieldDiag {
  label: string;
  status: 'ok' | 'missing' | 'optional';
}


@Component({
  selector: 'app-moderation-promotions',
  standalone: true,
  imports: [FormsModule, DecimalPipe, DatePipe, PromotionImageComponent],
  templateUrl: './moderation-promotions.component.html',
  styleUrl: './moderation-promotions.component.scss',
})
export class ModerationPromotionsComponent implements OnInit {
  private readonly moderationService = inject(ModerationService);

  promotions: Promotion[] = [];
  loading = true;
  error = '';
  actionInProgress: string | null = null;
  successMessage = '';

  // Validation panel
  selectedPromo: Promotion | null = null;
  editForm: Partial<ModerationDecisionRequest> = {};
  rejectReason = '';
  showRejectInput = false;
  soldAndDeliveredByStore = false;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.moderationService.getPending().pipe(
      finalize(() => (this.loading = false)),
    ).subscribe({
      next: (res) => {
        const list = res ?? [];
        this.promotions = list.sort((a, b) => {
          if (a.createdAt && b.createdAt) return a.createdAt.localeCompare(b.createdAt);
          return 0;
        });
      },
      error: () => (this.error = 'Erro ao carregar promoções pendentes.'),
    });
  }

  // Field diagnostics
  getFieldDiagnostics(promo: Promotion): FieldDiag[] {
    const has = (v: unknown) => v !== undefined && v !== null && String(v).trim() !== '';
    const badStore = !promo.store?.name && (!promo.storeName || promo.storeName === 'loja-nao-identificada');
    return [
      { label: 'Título', status: has(promo.title) ? 'ok' : 'missing' },
      { label: 'Descrição', status: has(promo.description) && promo.description !== promo.title ? 'ok' : 'missing' },
      { label: 'Link da oferta', status: has(promo.url) || has(promo.offerUrl) || has(promo.storeUrl) ? 'ok' : 'missing' },
      { label: 'Preço atual', status: has(promo.currentPrice) ? 'ok' : 'missing' },
      { label: 'Preço original', status: has(promo.originalPrice) ? 'ok' : 'optional' },
      { label: 'Cupom', status: has(promo.couponCode) ? 'ok' : 'optional' },
      { label: 'Loja', status: badStore ? 'missing' : 'ok' },
      { label: 'Imagem', status: has(promo.imageUrl) ? 'ok' : 'missing' },
      { label: 'Vendido por', status: has(promo.soldBy) ? 'ok' : 'optional' },
      { label: 'Entregue por', status: has(promo.deliveredBy) ? 'ok' : 'optional' },
      { label: 'Categoria', status: has(promo.category) ? 'ok' : 'optional' },
      { label: 'Disponibilidade', status: has(promo.availability) ? 'ok' : 'optional' },
    ];
  }

  getMissingFields(promo: Promotion): string[] {
    return this.getFieldDiagnostics(promo)
      .filter((f) => f.status === 'missing')
      .map((f) => f.label);
  }

  // Validation panel
  openValidation(promo: Promotion): void {
    this.selectedPromo = promo;
    this.showRejectInput = false;
    this.rejectReason = '';
    this.successMessage = '';
    this.error = '';
    this.editForm = {
      title: promo.title,
      description: promo.description,
      url: promo.url || promo.offerUrl || promo.storeUrl || '',
      currentPrice: promo.currentPrice,
      originalPrice: promo.originalPrice,
      couponCode: promo.couponCode || '',
      soldBy: promo.soldBy || '',
      deliveredBy: promo.deliveredBy || '',
      category: promo.category || '',
      availability: promo.availability || '',
    };
    const store = this.getCurrentStoreName();
    this.soldAndDeliveredByStore = !!store &&
      (this.editForm.soldBy || '').trim().toLowerCase() === store.trim().toLowerCase() &&
      (this.editForm.deliveredBy || '').trim().toLowerCase() === store.trim().toLowerCase();
  }

  getCurrentStoreName(): string {
    if (!this.selectedPromo) return '';
    const name = this.selectedPromo.store?.name || this.selectedPromo.storeName || '';
    return name === 'loja-nao-identificada' ? '' : name;
  }

  hasValidStoreName(): boolean {
    return !!this.getCurrentStoreName();
  }

  useStoreForSoldBy(): void {
    const store = this.getCurrentStoreName();
    if (store) this.editForm.soldBy = store;
  }

  useStoreForDeliveredBy(): void {
    const store = this.getCurrentStoreName();
    if (store) this.editForm.deliveredBy = store;
  }

  copySoldByToDeliveredBy(): void {
    this.editForm.deliveredBy = this.editForm.soldBy || '';
  }

  toggleSoldAndDeliveredByStore(checked: boolean): void {
    this.soldAndDeliveredByStore = checked;
    if (checked) {
      const store = this.getCurrentStoreName();
      if (store) {
        this.editForm.soldBy = store;
        this.editForm.deliveredBy = store;
      }
    }
  }

  closeValidation(): void {
    this.selectedPromo = null;
    this.showRejectInput = false;
    this.rejectReason = '';
  }

  getOfferLink(promo: Promotion): string {
    return promo.url || promo.offerUrl || promo.storeUrl || '';
  }

  // Actions
  saveEdits(): void {
    if (!this.selectedPromo) return;
    this.actionInProgress = this.selectedPromo.id;
    this.error = '';
    this.successMessage = '';
    const req = this.buildEditRequest();
    this.moderationService.decide(this.selectedPromo.id, req).pipe(
      finalize(() => (this.actionInProgress = null)),
    ).subscribe({
      next: (updated) => {
        this.updateInList(updated);
        this.selectedPromo = updated;
        this.openValidation(updated);
        this.successMessage = 'Ajustes salvos com sucesso.';
      },
      error: () => (this.error = 'Erro ao salvar ajustes.'),
    });
  }

  publish(): void {
    if (!this.selectedPromo) return;
    this.actionInProgress = this.selectedPromo.id;
    this.error = '';
    this.successMessage = '';

    const hasEdits = this.hasFormChanges();
    const promoId = this.selectedPromo.id;

    const doApprove = () => {
      this.moderationService.decide(promoId, {
        action: 'APPROVE',
        reason: 'Validado e aprovado manualmente',
      }).pipe(
        finalize(() => (this.actionInProgress = null)),
      ).subscribe({
        next: () => {
          this.removeFromList(promoId);
          this.selectedPromo = null;
          this.successMessage = 'Promoção publicada com sucesso!';
        },
        error: () => (this.error = 'Erro ao publicar promoção.'),
      });
    };

    if (hasEdits) {
      this.moderationService.decide(promoId, this.buildEditRequest()).subscribe({
        next: () => doApprove(),
        error: () => {
          this.actionInProgress = null;
          this.error = 'Erro ao salvar ajustes antes de publicar.';
        },
      });
    } else {
      doApprove();
    }
  }

  startReject(): void {
    this.showRejectInput = true;
    this.rejectReason = '';
  }

  cancelReject(): void {
    this.showRejectInput = false;
    this.rejectReason = '';
  }

  confirmReject(promo: Promotion): void {
    this.error = '';
    this.successMessage = '';
    const reason = this.rejectReason.trim() || 'Rejeitado pela moderação';
    this.actionInProgress = promo.id;
    this.moderationService.decide(promo.id, { action: 'REJECT', reason }).pipe(
      finalize(() => {
        this.actionInProgress = null;
        this.showRejectInput = false;
        this.rejectReason = '';
      }),
    ).subscribe({
      next: () => {
        this.removeFromList(promo.id);
        if (this.selectedPromo?.id === promo.id) this.selectedPromo = null;
        this.successMessage = 'Promoção rejeitada.';
      },
      error: () => (this.error = `Erro ao rejeitar "${promo.title}".`),
    });
  }

  rejectFromQueue(promo: Promotion): void {
    this.openValidation(promo);
    this.startReject();
  }

  private buildEditRequest(): ModerationDecisionRequest {
    const f = this.editForm;
    const req: ModerationDecisionRequest = {
      action: 'EDIT',
      reason: 'Ajustes de validação manual',
    };
    if (f.title) req.title = f.title;
    if (f.url) req.url = f.url;
    if (f.description) req.description = f.description;
    if (f.currentPrice != null) req.currentPrice = f.currentPrice;
    if (f.originalPrice != null && !isNaN(Number(f.originalPrice))) req.originalPrice = Number(f.originalPrice);
    if (f.couponCode?.trim()) req.couponCode = f.couponCode.trim();
    req.soldBy = f.soldBy?.trim() ?? '';
    req.deliveredBy = f.deliveredBy?.trim() ?? '';
    req.category = f.category?.trim() ?? '';
    if (f.availability?.trim()) req.availability = f.availability.trim();
    return req;
  }

  private hasFormChanges(): boolean {
    if (!this.selectedPromo) return false;
    const p = this.selectedPromo;
    const f = this.editForm;
    const norm = (v: unknown) => (v == null || String(v).trim() === '') ? '' : String(v).trim();
    return norm(f.title) !== norm(p.title) ||
      norm(f.description) !== norm(p.description) ||
      norm(f.url) !== norm(p.url || p.offerUrl || p.storeUrl) ||
      f.currentPrice !== p.currentPrice ||
      norm(f.originalPrice) !== norm(p.originalPrice) ||
      norm(f.couponCode) !== norm(p.couponCode) ||
      norm(f.soldBy) !== norm(p.soldBy) ||
      norm(f.deliveredBy) !== norm(p.deliveredBy) ||
      norm(f.category) !== norm(p.category) ||
      norm(f.availability) !== norm(p.availability);
  }

  private updateInList(updated: Promotion): void {
    this.promotions = this.promotions.map((p) => p.id === updated.id ? updated : p);
  }

  private removeFromList(id: string): void {
    this.promotions = this.promotions.filter((p) => p.id !== id);
  }
}
