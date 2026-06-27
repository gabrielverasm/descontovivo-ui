import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminImportService } from '../../../core/services/admin-import.service';
import { AdminImportRequest, AdminImportResponse } from '../../../core/models/admin-import.model';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';

const EXAMPLE_JSON: AdminImportRequest = {
  batchId: 'batch-YYYY-MM-DD-001',
  items: [
    {
      sourceId: 'marketplace-produto-slug-YYYYMMDD',
      title: 'Nome do produto',
      description: 'Descrição curta e informativa da oferta.',
      marketplace: 'AMAZON',
      storeName: 'Nome da loja',
      sellerName: 'Vendedor',
      soldBy: 'Vendedor',
      deliveredBy: 'Transportadora',
      productUrl: 'https://exemplo.com/produto',
      imageUrl: 'https://exemplo.com/imagem.jpg',
      currentPrice: 99.9,
      originalPrice: 149.9,
      coupon: null,
      category: 'ELETRONICOS',
      publishAt: '2026-01-01T12:00:00-03:00',
      verifiedAt: '2026-01-01T11:00:00-03:00',
    },
  ],
};

@Component({
  selector: 'app-import-promotions',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './import-promotions.component.html',
  styleUrl: './import-promotions.component.scss',
})
export class ImportPromotionsComponent {
  private readonly importService = inject(AdminImportService);

  token = '';
  jsonText = '';
  parseError = '';
  loading = false;
  httpError = '';
  result: AdminImportResponse | null = null;

  loadExample(): void {
    this.jsonText = JSON.stringify(EXAMPLE_JSON, null, 2);
    this.parseError = '';
  }

  validateJson(): void {
    this.parseError = '';
    this.httpError = '';
    this.result = null;
    try {
      const parsed = JSON.parse(this.jsonText);
      this.jsonText = JSON.stringify(parsed, null, 2);
    } catch (e) {
      this.parseError = `JSON inválido: ${(e as Error).message}`;
    }
  }

  dryRun(): void {
    this.send(true);
  }

  importar(): void {
    this.send(false);
  }

  private send(dryRun: boolean): void {
    this.parseError = '';
    this.httpError = '';
    this.result = null;

    let body: AdminImportRequest;
    try {
      body = JSON.parse(this.jsonText);
    } catch (e) {
      this.parseError = `JSON inválido: ${(e as Error).message}`;
      return;
    }

    if (!this.token.trim()) {
      this.httpError = 'Token admin é obrigatório.';
      return;
    }

    this.loading = true;
    this.importService
      .import(this.token.trim(), body, dryRun)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => (this.result = res),
        error: (err: HttpErrorResponse) => {
          this.httpError = err.error?.message ?? err.message ?? `Erro HTTP ${err.status}`;
        },
      });
  }
}
