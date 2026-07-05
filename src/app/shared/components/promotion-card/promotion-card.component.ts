import { Component, Input, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { Promotion } from '../../../core/models/promotion.model';
import { PromotionContextComponent } from './promotion-context.component';
import { PromotionImageComponent } from '../promotion-image/promotion-image.component';
import { PromotionPriceComponent } from '../promotion-price/promotion-price.component';
import { PromotionTrustSignalsComponent } from './promotion-trust-signals.component';
import { PromotionVoteButtonsComponent } from './promotion-vote-buttons.component';
import { isSoldAndDeliveredByAmazon, getAmazonTrustLabel } from '../../utils/seller.util';
import { sharePromotion } from '../../utils/share-promotion.util';

@Component({
  selector: 'app-promotion-card',
  standalone: true,
  imports: [
    PromotionContextComponent,
    PromotionImageComponent,
    PromotionPriceComponent,
    PromotionTrustSignalsComponent,
    PromotionVoteButtonsComponent,
    RouterLink,
  ],
  templateUrl: './promotion-card.component.html',
  styleUrl: './promotion-card.component.scss',
})
export class PromotionCardComponent {
  private readonly router = inject(Router);
  @Input({ required: true }) promotion!: Promotion;

  get actualCommentsCount(): number {
    return this.promotion.commentsCount ?? 0;
  }

  get commentsLabel(): string {
    const count = this.actualCommentsCount;
    return `${count} ${count === 1 ? 'comentário' : 'comentários'}`;
  }

  get publisherName(): string {
    return this.promotion.authorUsername || this.promotion.createdBy || 'Usuário';
  }

  get publisherShortName(): string {
    const name = this.publisherName;
    return name.length > 10 ? `${name.slice(0, 9)}…` : name;
  }

  get publisherInitial(): string {
    return this.publisherName.charAt(0).toUpperCase() || 'U';
  }

  get publishedAgo() {
    const createdAt = new Date(this.promotion.publishedAt || this.promotion.createdAt).getTime();
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

  get publisherAvatarColor(): string {
    return 'linear-gradient(135deg, #0ea5e9, #2563eb)';
  }

  get publishedDateFull(): string {
    const date = new Date(this.promotion.publishedAt || this.promotion.createdAt);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `Publicado em ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} às ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  get publishedDateISO(): string {
    return new Date(this.promotion.publishedAt || this.promotion.createdAt).toISOString();
  }

  get commentsLabelShort(): string {
    const count = this.actualCommentsCount;
    if (count === 0) return 'Ainda não há comentários';
    return `${count} ${count === 1 ? 'comentário' : 'comentários'}`;
  }

  get isAmazonFulfillment(): boolean {
    return isSoldAndDeliveredByAmazon(this.promotion.soldBy, this.promotion.deliveredBy);
  }

  get amazonTrustLabel(): string {
    return getAmazonTrustLabel();
  }

  get externalOfferUrl(): string {
    return this.promotion.url || this.promotion.offerUrl || this.promotion.storeUrl || '';
  }

  get externalOfferRel(): string {
    const isSponsored = this.promotion.sponsoredLink === true
      || (this.promotion.affiliateProgram != null && this.promotion.affiliateProgram !== 'NONE');
    return isSponsored ? 'sponsored noopener noreferrer' : 'noopener noreferrer';
  }

  get externalOfferLabel() {
    const destinationName = this.normalizeDestinationName(
      this.promotion.sellerName?.trim() ||
      this.promotion.trustedStoreName?.trim() ||
      this.promotion.storeName?.trim() ||
      '',
    );

    return destinationName ? `Ir para ${destinationName}` : 'Ir para oferta';
  }

  private normalizeDestinationName(destinationName: string) {
    const lower = destinationName.toLowerCase();
    if (lower === 'loja não identificada' || lower === 'loja-nao-identificada') return '';
    if (lower === 'amazon.com.br') return 'Amazon';
    return destinationName;
  }

  get detailId(): string {
    return this.promotion.slug || this.promotion.id;
  }

  openDetails() {
    void this.router.navigate(['/promocoes', this.detailId]);
  }

  share(event: Event) {
    event.stopPropagation();
    void sharePromotion(this.promotion);
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

}
