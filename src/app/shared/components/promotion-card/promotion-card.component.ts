import { Component, Input, OnChanges, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { CommentService } from '../../../core/services/comment.service';
import { UserService } from '../../../core/services/user.service';
import { Promotion } from '../../../core/models/promotion.model';
import { User } from '../../../core/models/user.model';
import { PromotionContextComponent } from './promotion-context.component';
import { PromotionImageComponent } from '../promotion-image/promotion-image.component';
import { PromotionPriceComponent } from '../promotion-price/promotion-price.component';
import { PromotionTrustSignalsComponent } from './promotion-trust-signals.component';
import { PromotionVoteButtonsComponent } from './promotion-vote-buttons.component';

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
export class PromotionCardComponent implements OnChanges {
  private readonly router = inject(Router);
  private readonly commentService = inject(CommentService);
  private readonly userService = inject(UserService);
  @Input({ required: true }) promotion!: Promotion;

  latestCommentPreview = 'ainda não há comentários';
  actualCommentsCount = 0;
  publisher: User = { id: '', name: 'Usuario DescontoVivo', role: 'user' };

  ngOnChanges() {
    forkJoin({
      latestComment: this.commentService.getLatestCommentByPromotionId(this.promotion.id),
      commentCount: this.commentService.getCommentCountByPromotionId(this.promotion.id),
      user: this.userService.getUserById(this.promotion.createdBy)
    }).subscribe(({ latestComment, commentCount, user }) => {
      this.latestCommentPreview = latestComment?.content || 'ainda não há comentários';
      this.actualCommentsCount = commentCount;
      this.publisher = user ?? { id: this.promotion.createdBy, name: 'Usuario DescontoVivo', role: 'user' };
    });
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

  get publisherAvatarColor(): string {
    const colors = ['#172033', '#2563eb', '#7c3aed', '#0891b2', '#059669', '#dc2626', '#d97706'];
    let hash = 0;
    const name = this.publisher.name;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  get externalOfferUrl(): string {
    return this.promotion.url || this.promotion.offerUrl || this.promotion.storeUrl || '';
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

  get detailId(): string {
    return this.promotion.slug || this.promotion.id;
  }

  openDetails() {
    void this.router.navigate(['/promocoes', this.detailId]);
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
