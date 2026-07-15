import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AdminImportService } from '../../../../core/services/admin-import.service';
import { ImageProcessingService } from '../../../../core/services/image-processing.service';
import { ModerationCategoryService } from '../../../../core/services/moderation-category.service';
import { UploadService } from '../../../../core/services/upload.service';
import { ModerationCreatePromotionComponent } from './moderation-create-promotion.component';

describe('ModerationCreatePromotionComponent', () => {
  let component: ModerationCreatePromotionComponent;
  let adminImport: jasmine.SpyObj<AdminImportService>;

  beforeEach(() => {
    adminImport = jasmine.createSpyObj('AdminImportService', ['import']);
    adminImport.import.and.returnValue(of({
      batchId: 'test',
      dryRun: false,
      created: 0,
      skipped: 0,
      errors: [],
    }));

    TestBed.configureTestingModule({
      imports: [ModerationCreatePromotionComponent],
      providers: [
        { provide: AdminImportService, useValue: adminImport },
        { provide: ImageProcessingService, useValue: {} },
        { provide: UploadService, useValue: {} },
        { provide: ModerationCategoryService, useValue: { list: () => of([]) } },
      ],
    });
    TestBed.overrideComponent(ModerationCreatePromotionComponent, { set: { template: '' } });
    component = TestBed.createComponent(ModerationCreatePromotionComponent).componentInstance;
  });

  it('uses Vendido por for both canonical and legacy seller payload fields', async () => {
    Object.assign(component.form, {
      url: 'https://www.mercadolivre.com.br/produto',
      title: 'Produto em oferta',
      currentPrice: '100,00',
      storeName: 'MercadoLivre',
      sellerName: 'Valor antigo da inspeção',
      soldBy: 'Corsair',
      deliveredBy: 'MercadoLivre',
    });
    component.inspectionImageKey = 'temp/promotions/product.webp';
    component.imagePreviewUrl = 'https://images.example.com/product.webp';

    await component.submit();

    const request = adminImport.import.calls.mostRecent().args[0];
    expect(request.items[0].sellerName).toBe('Corsair');
    expect(request.items[0].soldBy).toBe('Corsair');
    expect(request.items[0].deliveredBy).toBe('MercadoLivre');
  });
});
