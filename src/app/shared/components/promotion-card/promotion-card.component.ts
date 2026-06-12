import { CurrencyPipe, NgIf } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import {
  getLatestPromotionComment,
  getPromotionCommentCount
} from '../../../core/mocks/comments.mock';
import { USERS_MOCK } from '../../../core/mocks/users.mock';
import { Promotion } from '../../../core/models/promotion.model';
import { User } from '../../../core/models/user.model';
import { PromotionContextComponent } from './promotion-context.component';
import { PromotionTrustSignalsComponent } from './promotion-trust-signals.component';
import { PromotionVoteButtonsComponent } from './promotion-vote-buttons.component';

@Component({
  selector: 'app-promotion-card',
  standalone: true,
  imports: [
    CurrencyPipe,
    NgIf,
    PromotionContextComponent,
    PromotionTrustSignalsComponent,
    PromotionVoteButtonsComponent,
    RouterLink,
  ],
  templateUrl: './promotion-card.component.html',
  styleUrl: './promotion-card.component.scss',
})
export class PromotionCardComponent {
  private readonly router = inject(Router);
  private currentPromotion!: Promotion;
  imageUnavailable = false;

  @Input({ required: true })
  set promotion(promotion: Promotion) {
    this.currentPromotion = promotion;
    this.imageUnavailable = !promotion.imageUrl?.trim();
  }

  get promotion() {
    return this.currentPromotion;
  }

  get latestCommentPreview() {
    const latestComment = getLatestPromotionComment(this.promotion.id);

    return latestComment?.content || 'ainda não há comentários';
  }

  get actualCommentsCount() {
    return getPromotionCommentCount(this.promotion.id);
  }

  get publisher(): User {
    return (
      USERS_MOCK.find((user) => user.id === this.promotion.createdBy) ?? {
        id: this.promotion.createdBy,
        name: 'Usuario DescontoVivo',
        role: 'user'
      }
    );
  }

  get publishedAgo() {
    const createdAt = new Date(this.promotion.createdAt).getTime();
    const diffMs = Math.max(0, Date.now() - createdAt);
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;
    const month = 30 * day;
    const year = 365 * day;

    if (diffMs < hour) {
      const minutes = Math.floor(diffMs / minute);
      return `há ${minutes} ${this.pluralize(minutes, 'minuto', 'minutos')}`;
    }

    if (diffMs < day) {
      const hours = Math.floor(diffMs / hour);
      return `há ${hours} ${this.pluralize(hours, 'hora', 'horas')}`;
    }

    if (diffMs < week) {
      const days = Math.floor(diffMs / day);
      return `há ${days} ${this.pluralize(days, 'dia', 'dias')}`;
    }

    if (diffMs < month) {
      const weeks = Math.min(4, Math.floor(diffMs / week));
      return `há ${weeks} ${this.pluralize(weeks, 'semana', 'semanas')}`;
    }

    if (diffMs < year) {
      const months = Math.min(12, Math.floor(diffMs / month));
      return `há ${months} ${this.pluralize(months, 'mês', 'meses')}`;
    }

    const years = Math.floor(diffMs / year);
    const remainingDays = Math.floor((diffMs - years * year) / day);
    const yearsText = `${years} ${this.pluralize(years, 'ano', 'anos')}`;

    if (!remainingDays) {
      return `há ${yearsText}`;
    }

    return `há ${yearsText} e ${remainingDays} ${this.pluralize(remainingDays, 'dia', 'dias')}`;
  }

  private pluralize(value: number, singular: string, plural: string) {
    return value === 1 ? singular : plural;
  }

  get externalOfferLabel() {
    const destinationName = this.normalizeDestinationName(
      this.promotion.sellerName?.trim() ||
      this.promotion.trustedStoreName?.trim() ||
      this.promotion.storeName?.trim() ||
      '',
    );

    return destinationName ? `Ir para ${destinationName}` : 'Ir para loja';
  }

  private normalizeDestinationName(destinationName: string) {
    return destinationName.toLowerCase() === 'amazon.com.br' ? 'Amazon' : destinationName;
  }

  openDetails() {
    void this.router.navigate(['/promocoes', this.promotion.id]);
  }

  openDetailsFromKeyboard(event: KeyboardEvent) {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.openDetails();
  }

  markImageUnavailable() {
    this.imageUnavailable = true;
  }
}
