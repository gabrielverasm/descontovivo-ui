import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminImportService } from '../../../core/services/admin-import.service';
import { AdminImportRequest, AdminImportResponse } from '../../../core/models/admin-import.model';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';

const EXAMPLE_JSON: AdminImportRequest = {
  batchId: 'batch-2026-06-27-001',
  items: [
    {
      sourceId: 'amazon-echo-dot-5-20260627',
      title: 'Echo Dot 5ª geração com Alexa',
      description:
        'Oferta interessante para quem quer começar com casa inteligente. Confira vendedor, frete e prazo antes de comprar.',
      marketplace: 'AMAZON',
      storeName: 'Amazon',
      sellerName: 'Amazon.com.br',
      soldBy: 'Amazon.com.br',
      deliveredBy: 'Amazon.com.br',
      productUrl: 'https://...',
      imageUrl: 'https://...',
      currentPrice: 459.9,
      originalPrice: 549.9,
      coupon: null,
      category: 'ELETRONICOS',
      publishAt: '2026-06-27T21:30:00-03:00',
      verifiedAt: '2026-06-27T21:00:00-03:00',
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

  jsonText = '';
  parseError = '';
  loading = false;
  httpError = '';
  result: AdminImportResponse | null = null;
  showFormat = false;

  readonly exampleFormatted = JSON.stringify(EXAMPLE_JSON, null, 2);

  loadExample(): void {
    this.jsonText = this.exampleFormatted;
    this.parseError = '';
  }

  toggleFormat(): void {
    this.showFormat = !this.showFormat;
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

    this.loading = true;
    this.importService
      .import(body, dryRun)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => (this.result = res),
        error: (err: HttpErrorResponse) => {
          this.httpError = err.error?.message ?? err.message ?? `Erro HTTP ${err.status}`;
        },
      });
  }
}
