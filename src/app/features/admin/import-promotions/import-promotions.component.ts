import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { AdminImportService } from '../../../core/services/admin-import.service';
import { SeoService } from '../../../core/services/seo.service';
import { AdminImportItem, AdminImportRequest, AdminImportResponse } from '../../../core/models/admin-import.model';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';

interface ValidationMessage {
  sourceId: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

interface ValidatedItem extends AdminImportItem {
  _errors: ValidationMessage[];
  _warnings: ValidationMessage[];
  _imgLoaded: boolean;
  _imgError: boolean;
}

const EXAMPLE_JSON: AdminImportRequest = {
  batchId: 'batch-2025-06-27-001',
  items: [
    {
      sourceId: 'amazon-echo-dot-5-20250627',
      title: 'Echo Dot 5ª geração com Alexa',
      description: 'Oferta para quem quer começar com casa inteligente.',
      marketplace: 'AMAZON',
      storeName: 'Amazon',
      sellerName: 'Amazon.com.br',
      soldBy: 'Amazon.com.br',
      deliveredBy: 'Amazon.com.br',
      productUrl: 'https://www.amazon.com.br/dp/B09B8V1LZ3',
      imageUrl: 'https://m.media-amazon.com/images/I/71xoR4A-XzL._AC_SL1000_.jpg',
      currentPrice: 259.9,
      originalPrice: 399.0,
      coupon: null,
      category: 'ELETRONICOS',
      publishAt: '2025-06-27T21:30:00-03:00',
      verifiedAt: '2025-06-27T21:00:00-03:00',
    },
    {
      sourceId: 'kabum-ssd-kingston-20250627',
      title: 'SSD Kingston A400 480GB SATA',
      description: 'SSD básico com bom custo-benefício para upgrade.',
      marketplace: 'KABUM',
      storeName: 'KaBuM!',
      sellerName: 'KaBuM!',
      soldBy: 'KaBuM!',
      deliveredBy: 'KaBuM!',
      productUrl: 'https://www.kabum.com.br/produto/85197',
      imageUrl: 'https://images.kabum.com.br/produtos/fotos/85197/ssd-kingston-a400-480gb.jpg',
      currentPrice: 189.99,
      originalPrice: 249.9,
      coupon: null,
      category: 'ELETRONICOS',
      publishAt: '2025-06-27T22:00:00-03:00',
      verifiedAt: null,
    },
  ],
};

const VALID_CATEGORIES = [
  'ELETRONICOS', 'CASA', 'MODA', 'BELEZA', 'ESPORTE',
  'ALIMENTOS', 'LIVROS', 'GAMES', 'OUTROS',
];

const VALID_MARKETPLACES = [
  'AMAZON', 'MAGALU', 'MERCADOLIVRE', 'KABUM', 'ALIEXPRESS',
];

@Component({
  selector: 'app-import-promotions',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  templateUrl: './import-promotions.component.html',
  styleUrl: './import-promotions.component.scss',
})
export class ImportPromotionsComponent {
  private readonly importService = inject(AdminImportService);

  constructor() {
    inject(SeoService).setNoIndex();
  }

  jsonText = '';
  parseError = '';
  loading = false;
  httpError = '';
  result: AdminImportResponse | null = null;
  showFormat = false;

  validatedItems: ValidatedItem[] = [];
  totalErrors = 0;
  totalWarnings = 0;
  isJsonValid = false;

  readonly exampleFormatted = JSON.stringify(EXAMPLE_JSON, null, 2);

  loadExample(): void {
    this.jsonText = this.exampleFormatted;
    this.parseError = '';
    this.clearValidation();
  }

  toggleFormat(): void {
    this.showFormat = !this.showFormat;
  }

  validateJson(): void {
    this.parseError = '';
    this.httpError = '';
    this.result = null;
    this.clearValidation();

    let parsed: unknown;
    try {
      parsed = JSON.parse(this.jsonText);
      this.jsonText = JSON.stringify(parsed, null, 2);
    } catch (e) {
      this.parseError = `JSON inválido: ${(e as Error).message}`;
      this.isJsonValid = false;
      return;
    }

    const req = parsed as AdminImportRequest;
    if (!req.items || !Array.isArray(req.items) || req.items.length === 0) {
      this.parseError = 'O JSON deve conter "items" como array não vazio.';
      this.isJsonValid = false;
      return;
    }

    if (!req.batchId || !req.batchId.trim()) {
      this.parseError = 'Campo "batchId" é obrigatório.';
      this.isJsonValid = false;
      return;
    }

    this.validatedItems = req.items.map(item => this.validateItem(item));
    this.totalErrors = this.validatedItems.reduce((sum, i) => sum + i._errors.length, 0);
    this.totalWarnings = this.validatedItems.reduce((sum, i) => sum + i._warnings.length, 0);
    this.isJsonValid = this.totalErrors === 0;
  }

  dryRun(): void {
    this.send(true);
  }

  importar(): void {
    this.send(false);
  }

  onImgLoad(item: ValidatedItem): void {
    item._imgLoaded = true;
  }

  onImgError(item: ValidatedItem): void {
    item._imgError = true;
  }

  private validateItem(item: AdminImportItem): ValidatedItem {
    const errors: ValidationMessage[] = [];
    const warnings: ValidationMessage[] = [];
    const sid = item.sourceId || '(sem sourceId)';

    // Obrigatórios
    if (!item.sourceId?.trim()) errors.push({ sourceId: sid, field: 'sourceId', message: 'Obrigatório', severity: 'error' });
    if (!item.title?.trim()) errors.push({ sourceId: sid, field: 'title', message: 'Obrigatório', severity: 'error' });
    if (!item.description?.trim()) errors.push({ sourceId: sid, field: 'description', message: 'Obrigatório', severity: 'error' });
    if (!item.productUrl?.trim()) errors.push({ sourceId: sid, field: 'productUrl', message: 'Obrigatório', severity: 'error' });
    else if (!this.isUrl(item.productUrl)) errors.push({ sourceId: sid, field: 'productUrl', message: 'Deve ser URL válida', severity: 'error' });
    if (!item.imageUrl?.trim()) errors.push({ sourceId: sid, field: 'imageUrl', message: 'Obrigatório', severity: 'error' });
    else if (!this.isUrl(item.imageUrl)) errors.push({ sourceId: sid, field: 'imageUrl', message: 'Deve ser URL pública direta', severity: 'error' });
    if (!item.storeName?.trim()) errors.push({ sourceId: sid, field: 'storeName', message: 'Obrigatório', severity: 'error' });
    if (!item.marketplace?.trim()) errors.push({ sourceId: sid, field: 'marketplace', message: 'Obrigatório', severity: 'error' });
    else if (!VALID_MARKETPLACES.includes(item.marketplace.toUpperCase())) {
      warnings.push({ sourceId: sid, field: 'marketplace', message: `Valor "${item.marketplace}" não reconhecido. Aceitos: ${VALID_MARKETPLACES.join(', ')}`, severity: 'warning' });
    }
    if (item.currentPrice == null || item.currentPrice <= 0) errors.push({ sourceId: sid, field: 'currentPrice', message: 'Deve ser número > 0', severity: 'error' });
    if (item.originalPrice != null && typeof item.originalPrice !== 'number') errors.push({ sourceId: sid, field: 'originalPrice', message: 'Deve ser número', severity: 'error' });
    if (item.originalPrice != null && item.currentPrice != null && item.originalPrice < item.currentPrice) {
      errors.push({ sourceId: sid, field: 'originalPrice', message: 'Não pode ser menor que currentPrice', severity: 'error' });
    }

    // Recomendados
    if (!item.soldBy) warnings.push({ sourceId: sid, field: 'soldBy', message: 'Recomendado', severity: 'warning' });
    if (!item.deliveredBy) warnings.push({ sourceId: sid, field: 'deliveredBy', message: 'Recomendado', severity: 'warning' });
    if (!item.category) warnings.push({ sourceId: sid, field: 'category', message: 'Recomendado', severity: 'warning' });
    else if (!VALID_CATEGORIES.includes(item.category.toUpperCase())) {
      warnings.push({ sourceId: sid, field: 'category', message: `Valor "${item.category}" não reconhecido. Aceitos: ${VALID_CATEGORIES.join(', ')}`, severity: 'warning' });
    }
    if (!item.publishAt) warnings.push({ sourceId: sid, field: 'publishAt', message: 'Recomendado para retroativos', severity: 'warning' });
    else if (isNaN(Date.parse(item.publishAt))) errors.push({ sourceId: sid, field: 'publishAt', message: 'Data inválida', severity: 'error' });
    else if (Date.parse(item.publishAt) > Date.now() + 5 * 60 * 1000) {
      errors.push({ sourceId: sid, field: 'publishAt', message: 'publishAt está no futuro. A importação não agenda publicação; use uma data/hora passada ou atual', severity: 'error' });
    }

    return { ...item, _errors: errors, _warnings: warnings, _imgLoaded: false, _imgError: false };
  }

  private isUrl(s: string): boolean {
    return /^https?:\/\/.+\..+/.test(s.trim());
  }

  private clearValidation(): void {
    this.validatedItems = [];
    this.totalErrors = 0;
    this.totalWarnings = 0;
    this.isJsonValid = false;
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
