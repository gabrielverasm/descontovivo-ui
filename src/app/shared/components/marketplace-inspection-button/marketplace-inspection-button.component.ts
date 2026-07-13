import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { finalize } from 'rxjs';
import { PromotionInspectionResponse } from '../../../core/models/marketplace-inspection.model';
import { MarketplaceInspectionService } from '../../../core/services/marketplace-inspection.service';
import { detectMarketplace } from '../../utils/marketplace-detection.util';

@Component({
  selector: 'app-marketplace-inspection-button',
  standalone: true,
  template: `
    @if (detection) {
      <div class="inspection-action">
        <button type="button" [disabled]="loading || !detection.supported" (click)="load()">
          {{ loading ? 'Carregando dados da Shopee...' : 'Carregar dados da ' + detection.label }}
        </button>
        @if (!detection.supported) { <small>Integração em breve</small> }
      </div>
    }
  `,
  styles: [`.inspection-action { display:flex; gap:.75rem; align-items:center; flex-wrap:wrap } button { cursor:pointer } small { opacity:.72 }`],
})
export class MarketplaceInspectionButtonComponent {
  private readonly service = inject(MarketplaceInspectionService);
  @Input() url = '';
  @Output() loaded = new EventEmitter<PromotionInspectionResponse>();
  @Output() failed = new EventEmitter<void>();
  loading = false;

  get detection() { return detectMarketplace(this.url); }

  load(): void {
    if (this.loading || !this.detection?.supported) return;
    this.loading = true;
    this.service.inspect(this.url).pipe(finalize(() => (this.loading = false))).subscribe({
      next: (result) => this.loaded.emit(result),
      error: () => this.failed.emit(),
    });
  }
}
