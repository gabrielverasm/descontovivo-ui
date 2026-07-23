import { DatePipe } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { EMPTY, of } from 'rxjs';

import { PromotionInspectionResponse } from '../../core/models/marketplace-inspection.model';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { AuthService } from '../../core/services/auth.service';
import { CommentService } from '../../core/services/comment.service';
import { ImageProcessingService } from '../../core/services/image-processing.service';
import { ModerationService } from '../../core/services/moderation.service';
import { PromotionService } from '../../core/services/promotion.service';
import { SeoService } from '../../core/services/seo.service';
import { StructuredDataService } from '../../core/services/structured-data.service';
import { UploadService } from '../../core/services/upload.service';
import { PromotionsFeedStateService } from './promotions-feed-state.service';
import { PromotionDetailComponent } from './promotion-detail.component';

describe('PromotionDetailComponent inspection image state', () => {
  let component: PromotionDetailComponent;
  let imageProcessing: jasmine.SpyObj<ImageProcessingService>;
  let moderation: jasmine.SpyObj<ModerationService>;

  const inspection = (imageKey: string | null): PromotionInspectionResponse => ({
    marketplace: 'SHOPEE', supported: true, inputUrl: 'input', productUrl: 'product',
    affiliateUrl: null, title: 'Produto', currentPrice: 100, originalPrice: null,
    imageKey, imageUrl: imageKey ? 'https://images.example.com/product.webp' : null,
    storeName: null, sellerName: null, soldBy: null, deliveredBy: null,
    salesCount: null, productRating: null, sellerRating: null, officialStore: false,
    shopeeGuarantee: false, category: null, trustSignals: [], missingFields: [], warnings: [],
  });

  beforeEach(() => {
    imageProcessing = jasmine.createSpyObj('ImageProcessingService', ['validate', 'process']);
    moderation = jasmine.createSpyObj('ModerationService', ['decide']);
    moderation.decide.and.returnValue(EMPTY);

    TestBed.configureTestingModule({
      imports: [PromotionDetailComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'id' })) } },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: PromotionService, useValue: {
          getPromotionBySlug: () => of(undefined), getRelatedPromotions: () => of([]),
        } },
        { provide: CommentService, useValue: jasmine.createSpyObj('CommentService', ['listByPromotion']) },
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['canModerate', 'hasRole', 'canComment']) },
        { provide: ModerationService, useValue: moderation },
        { provide: ImageProcessingService, useValue: imageProcessing },
        { provide: UploadService, useValue: jasmine.createSpyObj('UploadService', ['uploadPromotionImage']) },
        { provide: SeoService, useValue: jasmine.createSpyObj('SeoService', ['setNonIndexable', 'setIndexable']) },
        { provide: StructuredDataService, useValue: jasmine.createSpyObj('StructuredDataService', ['clearPageStructuredData', 'setStructuredData']) },
        { provide: AnalyticsService, useValue: jasmine.createSpyObj('AnalyticsService', ['trackViewPromotion']) },
        { provide: PromotionsFeedStateService, useValue: {} },
      ],
    });
    TestBed.overrideComponent(PromotionDetailComponent, { set: { template: '' } });
    component = TestBed.createComponent(PromotionDetailComponent).componentInstance;
  });

  it('blocks submit after an inspection without an image', () => {
    component.onInspectionLoaded(inspection(null));
    component.promotion = { id: 'id' } as never;
    Object.assign(component.editForm, { title: 'Produto', url: 'https://shopee.com.br/x', currentPrice: '100,00' });

    component.submitEdit();

    expect(component.inspectionRequiresImage).toBeTrue();
    expect(component.adminError).toContain('Selecione uma imagem');
    expect(moderation.decide).not.toHaveBeenCalled();
  });

  it('keeps blocking when an image is removed after an inspection without one', () => {
    component.onInspectionLoaded(inspection(null));
    component.removeAdminImage();
    expect(component.inspectionRequiresImage).toBeTrue();
  });

  it('requires a replacement when the inspected image is removed', () => {
    component.onInspectionLoaded(inspection('temp/promotions/product.webp'));
    component.removeAdminImage();
    expect(component.inspectionImageKey).toBeNull();
    expect(component.inspectionRequiresImage).toBeTrue();
  });

  it('releases the block only after manual processing succeeds', async () => {
    component.onInspectionLoaded(inspection(null));
    const blob = new Blob(['image'], { type: 'image/webp' });
    imageProcessing.validate.and.returnValue(null);
    imageProcessing.process.and.resolveTo({ blob, previewUrl: 'blob:preview', sizeKB: 1 });

    await component.onAdminImageSelected(new File(['image'], 'image.png', { type: 'image/png' }));

    expect(component.inspectionImageKey).toBeNull();
    expect(component.adminImageBlob).toBe(blob);
    expect(component.adminImageStatus).toBe('ready');
    expect(component.inspectionRequiresImage).toBeFalse();
  });

  it('keeps blocking when manual processing fails', async () => {
    component.onInspectionLoaded(inspection(null));
    imageProcessing.validate.and.returnValue(null);
    imageProcessing.process.and.rejectWith(new Error('failed'));

    await component.onAdminImageSelected(new File(['image'], 'image.png', { type: 'image/png' }));

    expect(component.adminImageStatus).toBe('error');
    expect(component.inspectionRequiresImage).toBeTrue();
  });

  it('releases the block when a later inspection provides an image', () => {
    component.onInspectionLoaded(inspection(null));
    component.onInspectionLoaded(inspection('temp/promotions/new.webp'));
    expect(component.inspectionImageKey).toBe('temp/promotions/new.webp');
    expect(component.inspectionRequiresImage).toBeFalse();
  });

  it('fully resets inspection state when editing is cancelled', () => {
    component.onInspectionLoaded(inspection(null));
    component.cancelEdit();
    expect(component.inspectionApplied).toBeFalse();
    expect(component.inspectionRequiresImage).toBeFalse();
    expect(component.inspectionImageKey).toBeNull();
    expect((component as unknown as { inspectedFormUrl: string | null }).inspectedFormUrl).toBeNull();
  });

  it('preserves the previous image and form state when inspection fails', () => {
    component.onInspectionLoaded(inspection('temp/promotions/existing.webp'));
    component.editForm.title = 'Edição manual';
    const previousPreview = component.adminImagePreviewUrl;

    component.onInspectionFailed();

    expect(component.editForm.title).toBe('Edição manual');
    expect(component.inspectionImageKey).toBe('temp/promotions/existing.webp');
    expect(component.adminImagePreviewUrl).toBe(previousPreview);
    expect(component.inspectionApplied).toBeTrue();
    expect(component.inspectionRequiresImage).toBeFalse();
  });

  it('sends a filled coupon in an edit request', () => {
    prepareValidEdit('  CUPOM10  ');

    component.submitEdit();

    const request = moderation.decide.calls.mostRecent().args[1];
    expect(request.couponCode).toBe('CUPOM10');
    expect(request.action).toBe('EDIT');
  });

  it('sends an empty string when the persisted coupon is removed', () => {
    prepareValidEdit('   ');

    component.submitEdit();

    const request = moderation.decide.calls.mostRecent().args[1];
    expect(request.couponCode).toBe('');
    expect(request.action).toBe('EDIT');
  });

  it('sends an empty coupon after marketplace inspection without publishing automatically', () => {
    prepareValidEdit('');
    component.onInspectionLoaded(inspection('temp/promotions/inspected.webp'));

    component.submitEdit();

    expect(moderation.decide).toHaveBeenCalledTimes(1);
    const request = moderation.decide.calls.mostRecent().args[1];
    expect(request.couponCode).toBe('');
    expect(request.replaceInspectionFields).toBeTrue();
    expect(request.action).toBe('EDIT');
  });

  it('loads and submits the editable price signal, including clearing it', () => {
    component.promotion = {
      id: 'id', title: 'Produto', currentPrice: 100, storeName: 'Amazon', storeUrl: '',
      imageUrl: '/image.webp', category: 'Tecnologia', tags: [], likesCount: 0,
      commentsCount: 0, status: 'approved', createdAt: '', createdBy: '',
      priceSignal: 'GOOD_PRICE',
    } as never;
    component.openEditMode();
    expect(component.editForm.priceSignal).toBe('GOOD_PRICE');

    component.editForm.title = 'Produto';
    component.editForm.url = 'https://amazon.com.br/produto';
    component.editForm.currentPrice = '100,00';
    component.editForm.priceSignal = '   ';
    component.submitEdit();

    expect(moderation.decide.calls.mostRecent().args[1].priceSignal).toBe('');
  });

  it('uses Vendido por for both canonical and legacy seller edit fields', () => {
    prepareValidEdit('');
    component.editForm.sellerName = 'Valor antigo da inspeção';
    component.editForm.soldBy = 'Corsair';

    component.submitEdit();

    const request = moderation.decide.calls.mostRecent().args[1];
    expect(request.sellerName).toBe('Corsair');
    expect(request.soldBy).toBe('Corsair');
  });

  function prepareValidEdit(couponCode: string): void {
    component.promotion = { id: 'id' } as never;
    Object.assign(component.editForm, {
      title: 'Produto',
      url: 'https://shopee.com.br/x',
      currentPrice: '100,00',
      couponCode,
    });
  }
});

describe('PromotionDetailComponent primary actions', () => {
  let fixture: ComponentFixture<PromotionDetailComponent>;
  let component: PromotionDetailComponent;
  let router: jasmine.SpyObj<Router>;
  let analytics: jasmine.SpyObj<AnalyticsService>;

  const promotion = {
    id: 'promo-1',
    slug: 'produto-em-oferta',
    title: 'Produto com título longo para validar a primeira área útil do detalhe em celulares',
    currentPrice: 99.9,
    storeName: 'Shopee',
    storeUrl: '',
    url: 'https://shopee.com.br/produto',
    imageUrl: '/produto.webp',
    category: 'Tecnologia',
    tags: ['oferta', 'frete-gratis'],
    likesCount: 4,
    dislikesCount: 0,
    commentsCount: 2,
    status: 'approved',
    createdAt: '2026-07-22T10:00:00Z',
    publishedAt: '2026-07-22T10:00:00Z',
    createdBy: 'tester',
    officialStore: true,
    sponsoredLink: true,
  } as const;

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['navigate']);
    analytics = jasmine.createSpyObj('AnalyticsService', [
      'trackViewPromotion', 'trackClickStore', 'trackSharePromotion',
    ]);

    TestBed.configureTestingModule({
      imports: [PromotionDetailComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: promotion.slug })) } },
        { provide: Router, useValue: router },
        { provide: PromotionService, useValue: {
          getPromotionBySlug: () => of(promotion), getRelatedPromotions: () => of([]),
        } },
        { provide: CommentService, useValue: { listByPromotion: () => of([]) } },
        { provide: AuthService, useValue: { canModerate: () => false, hasRole: () => false, canComment: () => false } },
        { provide: ModerationService, useValue: jasmine.createSpyObj('ModerationService', ['decide']) },
        { provide: ImageProcessingService, useValue: jasmine.createSpyObj('ImageProcessingService', ['validate', 'process']) },
        { provide: UploadService, useValue: jasmine.createSpyObj('UploadService', ['uploadPromotionImage']) },
        { provide: SeoService, useValue: jasmine.createSpyObj('SeoService', ['setNonIndexable', 'setIndexable']) },
        { provide: StructuredDataService, useValue: jasmine.createSpyObj('StructuredDataService', ['clearPageStructuredData', 'setStructuredData']) },
        { provide: AnalyticsService, useValue: analytics },
        { provide: PromotionsFeedStateService, useValue: {} },
      ],
    });
    TestBed.overrideComponent(PromotionDetailComponent, {
      set: { imports: [DatePipe], schemas: [NO_ERRORS_SCHEMA] },
    });
    fixture = TestBed.createComponent(PromotionDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders one external CTA before curation with the preserved link contract', () => {
    const host = fixture.nativeElement as HTMLElement;
    const ctas = host.querySelectorAll<HTMLAnchorElement>('.promotion-detail__cta');
    const trustSection = host.querySelector('.promotion-detail__trust-section')!;

    expect(ctas.length).toBe(1);
    expect(ctas[0].compareDocumentPosition(trustSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(ctas[0].href).toBe(promotion.url);
    expect(ctas[0].rel).toBe('sponsored noopener noreferrer');
    expect(ctas[0].target).toBe('_blank');
    expect(ctas[0].getAttribute('aria-label')).toBe('Ir para Shopee');
  });

  it('keeps store-click analytics, back navigation and share bindings working', () => {
    const host = fixture.nativeElement as HTMLElement;
    const cta = host.querySelector<HTMLAnchorElement>('.promotion-detail__cta')!;
    cta.addEventListener('click', (event) => event.preventDefault());

    cta.click();
    expect(analytics.trackClickStore).toHaveBeenCalledTimes(1);

    host.querySelector<HTMLButtonElement>('.promotion-detail__back')!.click();
    expect(router.navigate).toHaveBeenCalledWith(['/']);

    const share = spyOn(component, 'sharePromotion');
    host.querySelector<HTMLButtonElement>('.promotion-detail__share-btn')!.click();
    expect(share).toHaveBeenCalledTimes(1);
  });
});
