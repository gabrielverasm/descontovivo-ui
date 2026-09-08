import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-promotion-view-count',
  standalone: true,
  templateUrl: './promotion-view-count.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './promotion-view-count.component.scss',
})
export class PromotionViewCountComponent {
  @Input({ required: true }) viewCount!: number;

  get formattedCount(): string {
    return new Intl.NumberFormat('pt-BR').format(Math.max(0, this.viewCount ?? 0));
  }

  get ariaLabel(): string {
    const count = Math.max(0, this.viewCount ?? 0);
    const noun = count === 1 ? 'visualização' : 'visualizações';
    return `${this.formattedCount} ${noun}`;
  }
}
