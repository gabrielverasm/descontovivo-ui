import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AdminImportService } from '../../../../core/services/admin-import.service';
import { ImageProcessingService } from '../../../../core/services/image-processing.service';
import { MarketplaceInspectionService } from '../../../../core/services/marketplace-inspection.service';
import { ModerationCategoryService } from '../../../../core/services/moderation-category.service';
import { UploadService } from '../../../../core/services/upload.service';
import { ModerationCreatePromotionComponent } from './moderation-create-promotion.component';

describe('ModerationCreatePromotionComponent', () => {
  let fixture: ComponentFixture<ModerationCreatePromotionComponent>;
  let component: ModerationCreatePromotionComponent;
  let adminImport: jasmine.SpyObj<AdminImportService>;
  let imageProcessing: jasmine.SpyObj<ImageProcessingService>;
  let uploadService: jasmine.SpyObj<UploadService>;

  const validImportResponse = {
    batchId: 'test',
    dryRun: false,
    created: 0,
    skipped: 0,
    errors: [],
  };

  beforeEach(() => {
    adminImport = jasmine.createSpyObj('AdminImportService', ['import']);
    adminImport.import.and.returnValue(of(validImportResponse));
    imageProcessing = jasmine.createSpyObj('ImageProcessingService', ['validate', 'process']);
    uploadService = jasmine.createSpyObj('UploadService', ['uploadPromotionImage']);

    TestBed.configureTestingModule({
      imports: [ModerationCreatePromotionComponent],
      providers: [
        { provide: AdminImportService, useValue: adminImport },
        { provide: ImageProcessingService, useValue: imageProcessing },
        { provide: UploadService, useValue: uploadService },
        { provide: MarketplaceInspectionService, useValue: { inspect: () => of(null) } },
        { provide: ModerationCategoryService, useValue: { list: () => of([]) } },
      ],
    });
    fixture = TestBed.createComponent(ModerationCreatePromotionComponent);
    component = fixture.componentInstance;
  });

  function fillRequiredFields(): void {
    Object.assign(component.form, {
      url: 'https://www.mercadolivre.com.br/produto',
      title: 'Produto em oferta',
      currentPrice: '100,00',
      storeName: 'MercadoLivre',
    });
  }

  it('blocks submission and shows the required message when no image is available', async () => {
    fillRequiredFields();

    await component.submit();

    expect(component.error).toBe('Imagem do produto é obrigatória.');
    expect(adminImport.import).not.toHaveBeenCalled();
  });

  it('submits with an image key supplied by marketplace inspection', async () => {
    fillRequiredFields();
    component.inspectionImageKey = 'temp/promotions/product.webp';
    component.imagePreviewUrl = 'https://images.example.com/product.webp';

    await component.submit();

    expect(component.error).not.toBe('Imagem do produto é obrigatória.');
    expect(uploadService.uploadPromotionImage).not.toHaveBeenCalled();
    expect(adminImport.import).toHaveBeenCalled();
  });

  it('clears an old required-image error when a valid file is selected', async () => {
    const file = new File(['image'], 'product.png', { type: 'image/png' });
    const blob = new Blob(['processed'], { type: 'image/webp' });
    component.error = 'Imagem do produto é obrigatória.';
    imageProcessing.validate.and.returnValue(null);
    imageProcessing.process.and.resolveTo({
      blob,
      previewUrl: 'blob:processed-image',
      sizeKB: 1,
    });

    await component.onImageSelected(file);

    expect(component.error).toBe('');
    expect(component.imageError).toBeNull();
    expect(component.imageStatus).toBe('ready');
    expect(component.hasSubmittableImage).toBeTrue();
  });

  it('requires an image again after the current image is removed', async () => {
    fillRequiredFields();
    component.inspectionImageKey = 'temp/promotions/product.webp';
    component.removeImage();

    await component.submit();

    expect(component.hasSubmittableImage).toBeFalse();
    expect(component.error).toBe('Imagem do produto é obrigatória.');
    expect(adminImport.import).not.toHaveBeenCalled();
  });

  it('reuses an uploaded image key when the import needs to be retried', async () => {
    fillRequiredFields();
    component.imageBlob = new Blob(['processed'], { type: 'image/webp' });
    component.imagePreviewUrl = 'blob:processed-image';
    component.imageStatus = 'ready';
    uploadService.uploadPromotionImage.and.resolveTo({
      imageUrl: 'https://images.example.com/uploaded.webp',
      imageKey: 'promotions/uploaded.webp',
    });

    await component.submit();
    await component.submit();

    expect(component.error).not.toBe('Imagem do produto é obrigatória.');
    expect(component.hasSubmittableImage).toBeTrue();
    expect(uploadService.uploadPromotionImage).toHaveBeenCalledTimes(1);
    expect(adminImport.import).toHaveBeenCalledTimes(2);
    expect(adminImport.import.calls.mostRecent().args[0].items[0].imageKey)
      .toBe('promotions/uploaded.webp');
  });

  it('keeps a processed image ready for retry and shows a specific upload failure', async () => {
    fillRequiredFields();
    component.imageBlob = new Blob(['processed'], { type: 'image/webp' });
    component.imageStatus = 'ready';
    uploadService.uploadPromotionImage.and.rejectWith(new Error('storage unavailable'));
    spyOn(console, 'error');

    await component.submit();

    expect(component.imageStatus).toBe('ready');
    expect(component.hasSubmittableImage).toBeTrue();
    expect(component.imageError).toBe('Não foi possível enviar a imagem. Tente novamente.');
    expect(component.saving).toBeFalse();
    expect(adminImport.import).not.toHaveBeenCalled();
  });

  it('clears old feedback after a successful creation', async () => {
    fillRequiredFields();
    component.inspectionImageKey = 'temp/promotions/product.webp';
    component.error = 'Imagem do produto é obrigatória.';
    adminImport.import.and.returnValue(of({ ...validImportResponse, created: 1 }));
    const created = spyOn(component.created, 'emit');

    await component.submit();

    expect(component.error).toBe('');
    expect(component.imageError).toBeNull();
    expect(created).toHaveBeenCalled();
  });

  it('renders the global feedback once, next to the final actions', () => {
    component.error = 'Imagem do produto é obrigatória.';

    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const errors = element.querySelectorAll('.mod-panel__error');
    expect(errors.length).toBe(1);
    expect(element.querySelector('.mod-panel__header .mod-panel__error')).toBeNull();
    expect(element.querySelector('.mod-panel__footer .mod-panel__error')?.textContent)
      .toContain('Imagem do produto é obrigatória.');
  });

  it('uses Vendido por for both canonical and legacy seller payload fields', async () => {
    fillRequiredFields();
    Object.assign(component.form, {
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
