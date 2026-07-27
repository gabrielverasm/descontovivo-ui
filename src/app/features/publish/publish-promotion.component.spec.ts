import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { ImageProcessingService } from '../../core/services/image-processing.service';
import { PromotionService } from '../../core/services/promotion.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { UploadService } from '../../core/services/upload.service';
import { PublishPromotionComponent } from './publish-promotion.component';

describe('PublishPromotionComponent operational feedback', () => {
  let promotions: jasmine.SpyObj<PromotionService>;
  let component: PublishPromotionComponent;

  beforeEach(() => {
    promotions = jasmine.createSpyObj('PromotionService', ['createPromotion']);
    TestBed.configureTestingModule({
      providers: [
        { provide: PromotionService, useValue: promotions },
        { provide: UploadService, useValue: jasmine.createSpyObj('UploadService', ['uploadPromotionImage']) },
        { provide: ImageProcessingService, useValue: jasmine.createSpyObj('ImageProcessingService', ['validate', 'process']) },
        { provide: SeoService, useValue: jasmine.createSpyObj('SeoService', ['setNonIndexable']) },
        { provide: AnalyticsService, useValue: jasmine.createSpyObj('AnalyticsService', ['trackPromotionSubmitStart', 'trackPromotionSubmit']) },
      ],
    });
    component = TestBed.runInInjectionContext(() => new PublishPromotionComponent());
    component.title = 'Promoção';
    component.url = 'https://example.com/item';
    component.onPriceInput('1000');
    component.imageStatus = 'done';
    component.imageUrl = 'https://images.example.com/item.webp';
    component.imageKey = 'item.webp';
  });

  it('shows success in a toast and resets after submission', async () => {
    promotions.createPromotion.and.returnValue(of({} as any));
    await component.onSubmit();
    expect(TestBed.inject(ToastService).toasts()[0]).toEqual(jasmine.objectContaining({
      type: 'success',
      message: 'Promoção enviada para moderação com sucesso.',
    }));
    expect(component.title).toBe('');
  });

  it('shows API failure in a toast and preserves entered values', async () => {
    promotions.createPromotion.and.returnValue(throwError(() => new Error('offline')));
    await component.onSubmit();
    expect(TestBed.inject(ToastService).toasts()[0]).toEqual(jasmine.objectContaining({
      type: 'error',
      message: 'Erro ao publicar promoção. Tente novamente.',
    }));
    expect(component.title).toBe('Promoção');
  });

  it('keeps price validation inline', async () => {
    component.onPriceInput('0');
    await component.onSubmit();
    expect(component.priceError).toBe('Preço inválido.');
    expect(TestBed.inject(ToastService).toasts()).toEqual([]);
  });
});
