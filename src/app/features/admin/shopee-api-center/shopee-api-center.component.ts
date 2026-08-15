import { JsonPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { SeoService } from '../../../core/services/seo.service';
import { ShopeeApiService, ShopeeOperation, ShopeeOperationRequest } from '../../../core/services/shopee-api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-shopee-api-center',
  standalone: true,
  imports: [FormsModule, JsonPipe],
  templateUrl: './shopee-api-center.component.html',
  styleUrl: './shopee-api-center.component.scss',
})
export class ShopeeApiCenterComponent {
  private readonly api = inject(ShopeeApiService);
  private readonly toast = inject(ToastService);

  readonly operations: { id: ShopeeOperation; label: string; description: string }[] = [
    { id: 'products', label: 'Produtos', description: 'Pesquise ofertas afiliadas por palavra-chave.' },
    { id: 'shops', label: 'Lojas', description: 'Consulte lojas e comissões disponíveis.' },
    { id: 'campaigns', label: 'Campanhas', description: 'Liste ofertas e campanhas da Shopee.' },
    { id: 'conversions', label: 'Conversões', description: 'Acompanhe pedidos e comissões do período.' },
    { id: 'feeds', label: 'Feeds', description: 'Consulte os feeds de catálogo disponíveis.' },
    { id: 'feed_data', label: 'Dados do feed', description: 'Leia os itens de um feed de catálogo.' },
    { id: 'validation', label: 'Validações', description: 'Consulte validações e faturamento das conversões.' },
    { id: 'short_link', label: 'Link afiliado', description: 'Gere um link curto com sub IDs.' },
  ];

  selected: ShopeeOperation = 'products';
  keyword = '';
  originUrl = '';
  subIds = '';
  feedId: number | undefined;
  startDate = '';
  endDate = '';
  loading = false;
  error = '';
  result: Record<string, unknown> | null = null;

  constructor() { inject(SeoService).setNoIndex(); }

  select(operation: ShopeeOperation): void {
    this.selected = operation;
    this.result = null;
    this.error = '';
  }

  run(): void {
    this.loading = true;
    this.error = '';
    const request: ShopeeOperationRequest = {
      operation: this.selected,
      keyword: this.keyword.trim() || undefined,
      originUrl: this.originUrl.trim() || undefined,
      feedId: this.feedId,
      subIds: this.subIds.split(',').map(item => item.trim()).filter(Boolean),
    };
    if (this.selected === 'conversions' || this.selected === 'validation') {
      request.startTime = this.toEpoch(this.startDate);
      request.endTime = this.toEpoch(this.endDate, true);
    }
    this.api.execute(request).pipe(finalize(() => this.loading = false)).subscribe({
      next: result => this.result = result,
      error: error => {
        this.error = error?.error?.message || 'Não foi possível consultar a Shopee agora.';
        this.toast.error(this.error);
      },
    });
  }

  private toEpoch(value: string, end = false): number | undefined {
    if (!value) return undefined;
    const date = new Date(`${value}T${end ? '23:59:59' : '00:00:00'}`);
    return Math.floor(date.getTime() / 1000);
  }
}
