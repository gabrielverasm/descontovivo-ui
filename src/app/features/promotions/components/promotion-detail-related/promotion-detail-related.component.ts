import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Promotion } from '../../../../core/models/promotion.model';
import { RelatedPromotionItemComponent } from '../../../../shared/components/related-promotion-item/related-promotion-item.component';

@Component({
  selector: 'app-promotion-detail-related',
  standalone: true,
  imports: [RelatedPromotionItemComponent],
  templateUrl: './promotion-detail-related.component.html',
  styleUrl: './promotion-detail-related.component.scss',
})
export class PromotionDetailRelatedComponent {
  @Input() relatedPromotions: Promotion[] = [];
  @Input() relatedPage = 0;
  @Input() relatedExpanded = false;
  @Output() relatedExpandedChange = new EventEmitter<boolean>();
  @Output() pageChange = new EventEmitter<number>();

  private readonly pageSize = 3;

  get relatedPageCount() {
    return Math.ceil(this.relatedPromotions.length / this.pageSize);
  }

  get visibleRelatedPromotions() {
    const start = this.relatedPage * this.pageSize;
    return this.relatedPromotions.slice(start, start + this.pageSize);
  }

  get hasRelatedPagination() {
    return this.relatedPromotions.length > this.pageSize;
  }

  get visibleRelatedPageNumbers(): Array<number | 'ellipsis'> {
    const total = this.relatedPageCount;
    const current = this.relatedPage + 1;
    const pages = Array.from({ length: total }, (_, i) => i + 1);
    if (total <= 5) return pages;
    if (current <= 3) return [1, 2, 3, 4, 'ellipsis', total];
    if (current >= total - 2) return [1, 'ellipsis', total - 3, total - 2, total - 1, total];
    return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total];
  }

  toggleExpanded(): void {
    this.relatedExpanded = !this.relatedExpanded;
    this.relatedExpandedChange.emit(this.relatedExpanded);
  }

  showPrevious(): void {
    this.pageChange.emit(Math.max(0, this.relatedPage - 1));
  }

  showNext(): void {
    this.pageChange.emit(Math.min(this.relatedPageCount - 1, this.relatedPage + 1));
  }

  showPage(page: number): void {
    this.pageChange.emit(page - 1);
  }

  getPublishedAgo(createdAt: string): string {
    const elapsedMs = Date.now() - new Date(createdAt).getTime();
    const hours = Math.max(1, Math.floor(elapsedMs / 3600000));
    if (hours < 24) return `há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    const days = Math.floor(hours / 24);
    return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
  }
}
