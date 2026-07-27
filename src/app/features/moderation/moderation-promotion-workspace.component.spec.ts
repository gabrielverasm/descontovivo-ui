import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, ParamMap, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { Promotion } from '../../core/models/promotion.model';
import { ImageProcessingService } from '../../core/services/image-processing.service';
import { ModerationService } from '../../core/services/moderation.service';
import { PromotionService } from '../../core/services/promotion.service';
import { SeoService } from '../../core/services/seo.service';
import { UploadService } from '../../core/services/upload.service';
import { TrustSignal } from '../../shared/utils/trust-signals.util';
import { moderationFormToEditRequest, PromotionModerationFormValue, promotionToModerationForm } from './moderation-form.model';
import { ModerationPromotionWorkspaceComponent } from './moderation-promotion-workspace.component';

const promotion = {
  id: 'pending-1', slug: 'produto-1', title: 'Produto', currentPrice: 100, originalPrice: 120,
  storeName: 'Amazon', storeUrl: '', url: 'https://amazon.com.br/produto', imageUrl: 'https://img/p.webp',
  category: 'Casa', tags: [], likesCount: 0, dislikesCount: 0, commentsCount: 0, status: 'pending',
  createdAt: '2026-01-01', createdBy: 'tester', soldBy: 'Amazon', deliveredBy: 'Amazon', priceSignal: 'GOOD_PRICE',
  salesCount: 1000, productRating: 4.8, sellerRating: 4.9, officialStore: true, trustSignals: [TrustSignal.OFFICIAL_STORE],
} as unknown as Promotion;

describe('ModerationPromotionWorkspaceComponent', () => {
  let fixture: ComponentFixture<ModerationPromotionWorkspaceComponent>;
  let component: ModerationPromotionWorkspaceComponent;
  let params$: BehaviorSubject<ParamMap>;
  let pending: jasmine.SpyObj<ModerationService>;
  let promotions: jasmine.SpyObj<PromotionService>;
  let router: jasmine.SpyObj<Router>;
  let imageProcessing: jasmine.SpyObj<ImageProcessingService>;
  let upload: jasmine.SpyObj<UploadService>;

  beforeEach(() => {
    params$ = new BehaviorSubject(convertToParamMap({}));
    pending = jasmine.createSpyObj('ModerationService', ['getPending', 'decide']);
    pending.getPending.and.returnValue(of([promotion]));
    pending.decide.and.returnValue(of(promotion));
    promotions = jasmine.createSpyObj('PromotionService', ['getPromotionBySlug']);
    promotions.getPromotionBySlug.and.returnValue(of(promotion));
    router = jasmine.createSpyObj('Router', ['navigate']);
    imageProcessing = jasmine.createSpyObj('ImageProcessingService', ['validate', 'process']);
    imageProcessing.validate.and.returnValue(null);
    upload = jasmine.createSpyObj('UploadService', ['uploadPromotionImage']);
    TestBed.configureTestingModule({
      imports: [ModerationPromotionWorkspaceComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { queryParamMap: params$, get snapshot() { return { queryParamMap: params$.value }; } } }, { provide: Router, useValue: router },
        { provide: ModerationService, useValue: pending }, { provide: PromotionService, useValue: promotions },
        { provide: SeoService, useValue: jasmine.createSpyObj('SeoService', ['setNoIndex']) },
        { provide: ImageProcessingService, useValue: imageProcessing },
        { provide: UploadService, useValue: upload },
      ],
    });
    TestBed.overrideComponent(ModerationPromotionWorkspaceComponent, { set: { template: '' } });
    fixture = TestBed.createComponent(ModerationPromotionWorkspaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('resolves create mode without query parameters', () => expect(component.mode).toBe('create'));

  it('loads validate mode from a pending id', () => {
    params$.next(convertToParamMap({ validar: 'pending-1' }));
    expect(component.mode).toBe('validate');
    expect(component.promotion?.id).toBe('pending-1');
    expect(pending.getPending).toHaveBeenCalledWith(0, 50);
  });

  it('loads edit mode from a public slug', () => {
    params$.next(convertToParamMap({ editar: 'produto-1' }));
    expect(component.mode).toBe('edit');
    expect(promotions.getPromotionBySlug).toHaveBeenCalledWith('produto-1');
  });

  it('rejects conflicting and empty query parameters', () => {
    params$.next(convertToParamMap({ validar: '1', editar: 'produto-1' }));
    expect(component.invalidUrl).toBeTrue();
    params$.next(convertToParamMap({ validar: '' }));
    expect(component.invalidUrl).toBeTrue();
  });

  it('updates the same instance when query parameters change', () => {
    params$.next(convertToParamMap({ editar: 'a' }));
    params$.next(convertToParamMap({ editar: 'b' }));
    expect(promotions.getPromotionBySlug).toHaveBeenCalledWith('b');
  });

  it('keeps operational errors separate from load errors', () => {
    params$.next(convertToParamMap({ editar: 'produto-1' }));
    component.inspectionFailed();
    expect(component.inspectionError).toContain('inspeção');
    expect(component.loadError).toBe('');
  });

  it('syncs sold and delivered by store and preserves values when unchecked', () => {
    params$.next(convertToParamMap({ editar: 'produto-1' }));
    expect(component.soldAndDeliveredByStore).toBeTrue();
    component.toggleSoldAndDeliveredByStore(false);
    expect(component.form.soldBy).toBe('Amazon');
    expect(component.form.deliveredBy).toBe('Amazon');
    component.form.storeName = 'Magalu'; component.useStoreForSoldBy(); component.copySoldByToDeliveredBy();
    expect(component.form.soldBy).toBe('Magalu'); expect(component.form.deliveredBy).toBe('Magalu');
  });

  it('builds a normalized request from the visual form', () => {
    const form = promotionToModerationForm(promotion);
    form.title = '  Título novo  '; form.currentPrice = '99,90'; form.originalPrice = ''; form.couponCode = '   '; form.priceSignal = '';
    const request = moderationFormToEditRequest(form, { promotion, inspectionApplied: true, inspectedFormUrl: form.url, imageKey: 'new-key' });
    expect(request.title).toBe('Título novo'); expect(request.currentPrice).toBe(99.9); expect(request.originalPrice).toBeNull();
    expect(request.couponCode).toBe(''); expect(request.priceSignal).toBe(''); expect(request.sellerName).toBe(request.soldBy);
    expect(request.replaceInspectionFields).toBeTrue(); expect(request.imageKey).toBe('new-key');
  });

  it('uses the same official trust signal without duplicates', () => {
    const form = promotionToModerationForm(promotion);
    form.trustSignals = [TrustSignal.OFFICIAL_STORE, TrustSignal.OFFICIAL_STORE];
    form.officialStore = true;
    const request = moderationFormToEditRequest(form, { promotion, inspectionApplied: false, inspectedFormUrl: null });
    expect(request.officialStore).toBeTrue(); expect(request.trustSignals).toEqual([TrustSignal.OFFICIAL_STORE]);
  });

  it('keeps the empty price signal and preserves the supported price signals', () => {
    expect(promotionToModerationForm({ ...promotion, priceSignal: 'NONE' } as Promotion).priceSignal).toBe('');
    for (const signal of ['GOOD_PRICE', 'GREAT_PRICE']) {
      const form = promotionToModerationForm({ ...promotion, priceSignal: signal } as Promotion);
      expect(form.priceSignal).toBe(signal);
      expect(moderationFormToEditRequest(form, { promotion, inspectionApplied: false, inspectedFormUrl: null }).priceSignal).toBe(signal);
    }
  });

  it('round-trips loaded promotion prices without changing their scale', () => {
    for (const [value, display] of [[100, 'R$\u00a0100,00'], [99.9, 'R$\u00a099,90'], [1.05, 'R$\u00a01,05']] as const) {
      const form = promotionToModerationForm({ ...promotion, currentPrice: value } as Promotion);
      expect(form.currentPrice).toBe(display);
      expect(moderationFormToEditRequest(form, { promotion, inspectionApplied: false, inspectedFormUrl: null }).currentPrice).toBe(value);
    }
    const form = promotionToModerationForm({ ...promotion, currentPrice: 100, originalPrice: 120 } as Promotion);
    expect(form.originalPrice).toBe('R$\u00a0120,00');
    expect(moderationFormToEditRequest(form, { promotion, inspectionApplied: false, inspectedFormUrl: null }).originalPrice).toBe(120);
  });

  it('round-trips inspected prices as decimal currency values', () => {
    component.inspectionLoaded({ imageKey: 'image-key', imageUrl: 'https://img/p.webp', missingFields: [], marketplace: 'AMAZON', title: 'Inspected', productUrl: 'https://amazon.com.br/p', affiliateUrl: '', currentPrice: 10, originalPrice: null, storeName: 'Amazon', soldBy: 'Amazon', deliveredBy: 'Amazon', category: 'Casa', salesCount: null, productRating: null, sellerRating: null, officialStore: false, trustSignals: [] } as any);
    expect(component.form.currentPrice).toBe('R$\u00a010,00');
    expect(moderationFormToEditRequest(component.form, { promotion, inspectionApplied: true, inspectedFormUrl: component.form.url, imageKey: component.inspectionImageKey }).currentPrice).toBe(10);
    component.inspectionLoaded({ imageKey: 'image-key', imageUrl: 'https://img/p.webp', missingFields: [], marketplace: 'AMAZON', title: 'Inspected', productUrl: 'https://amazon.com.br/p', affiliateUrl: '', currentPrice: 629.9, originalPrice: null, storeName: 'Amazon', soldBy: 'Amazon', deliveredBy: 'Amazon', category: 'Casa', salesCount: null, productRating: null, sellerRating: null, officialStore: false, trustSignals: [] } as any);
    expect(component.form.currentPrice).toBe('R$\u00a0629,90');
    expect(moderationFormToEditRequest(component.form, { promotion, inspectionApplied: true, inspectedFormUrl: component.form.url }).currentPrice).toBe(629.9);
  });

  it('keeps an empty original price as null in the payload', () => {
    const form = promotionToModerationForm({ ...promotion, originalPrice: null } as unknown as Promotion);
    expect(form.originalPrice).toBe('');
    expect(moderationFormToEditRequest(form, { promotion, inspectionApplied: false, inspectedFormUrl: null }).originalPrice).toBeNull();
  });

  it('defensively maps a runtime numeric sales count without throwing', () => {
    const form = promotionToModerationForm(promotion);
    (form as unknown as { salesCount: string | number }).salesCount = 2500;
    expect(() => moderationFormToEditRequest(form as PromotionModerationFormValue, { promotion, inspectionApplied: false, inspectedFormUrl: null })).not.toThrow();
    expect(moderationFormToEditRequest(form as PromotionModerationFormValue, { promotion, inspectionApplied: false, inspectedFormUrl: null }).salesCount).toBe(2500);
  });

  it('normalizes technical and human-readable unknown store names', () => {
    expect(promotionToModerationForm({ ...promotion, storeName: 'loja-nao-identificada' } as Promotion).storeName).toBe('');
    expect(promotionToModerationForm({ ...promotion, storeName: 'Loja não identificada' } as Promotion).storeName).toBe('');
    expect(promotionToModerationForm({ ...promotion, store: { name: 'LOJA NÃO IDENTIFICADA' } } as unknown as Promotion).storeName).toBe('');
  });

  it('preserves real store priority and fallback when mapping the form', () => {
    expect(promotionToModerationForm({ ...promotion, store: { name: 'Amazon' }, storeName: 'Magalu' } as unknown as Promotion).storeName).toBe('Amazon');
    expect(promotionToModerationForm({ ...promotion, store: undefined, storeName: 'Magalu' } as unknown as Promotion).storeName).toBe('Magalu');
  });

  it('publishes a loaded unknown-store promotion with APPROVE only', () => {
    const unknownStore = { ...promotion, storeName: 'loja-nao-identificada', store: undefined } as unknown as Promotion;
    promotions.getPromotionBySlug.and.returnValue(of(unknownStore));
    params$.next(convertToParamMap({ editar: 'produto-1' }));
    expect(component.form.storeName).toBe('');
    expect(component.soldAndDeliveredByStore).toBeFalse();
    component.publish();
    expect(pending.decide.calls.count()).toBe(1);
    expect(pending.decide.calls.argsFor(0)[1].action).toBe('APPROVE');
  });

  it('uses a manually entered real store for seller fields and payload', () => {
    const unknownStore = { ...promotion, storeName: 'Loja não identificada', store: undefined } as unknown as Promotion;
    promotions.getPromotionBySlug.and.returnValue(of(unknownStore));
    params$.next(convertToParamMap({ editar: 'produto-1' }));
    component.form.storeName = 'Magalu';
    component.useStoreForSoldBy();
    component.useStoreForDeliveredBy();
    const request = moderationFormToEditRequest(component.form, { promotion: unknownStore, inspectionApplied: false, inspectedFormUrl: null });
    expect(component.form.soldBy).toBe('Magalu');
    expect(component.form.deliveredBy).toBe('Magalu');
    expect(request.storeName).toBe('Magalu');
    expect(request.sellerName).toBe('Magalu');
  });

  it('updates only the edit slug after a successful edit', async () => {
    pending.decide.and.returnValue(of({ ...promotion, slug: 'produto-renomeado' } as Promotion));
    params$.next(convertToParamMap({ editar: 'produto-1' }));
    component.form.title = 'Título atualizado';
    component.save();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(router.navigate).toHaveBeenCalledWith([], { relativeTo: jasmine.anything(), queryParams: { editar: 'produto-renomeado' }, replaceUrl: true });
    const loads = promotions.getPromotionBySlug.calls.count();
    params$.next(convertToParamMap({ editar: 'produto-renomeado' }));
    expect(promotions.getPromotionBySlug.calls.count()).toBe(loads);
    expect(component.successMessage).toBe('Ajustes salvos com sucesso.');
    expect(component.promotion?.slug).toBe('produto-renomeado');
  });

  it('keeps the persisted image when inspection has no replacement and preserves missing-field guidance', async () => {
    params$.next(convertToParamMap({ editar: 'produto-1' }));
    component.inspectionLoaded({ imageKey: null, imageUrl: null, missingFields: ['title'], marketplace: 'AMAZON', title: '', productUrl: '', affiliateUrl: '', currentPrice: null, originalPrice: null, storeName: '', soldBy: '', deliveredBy: '', category: '', salesCount: null, productRating: null, sellerRating: null, officialStore: false, trustSignals: [] } as any);
    component.form.title = 'Título preenchido';
    component.form.url = 'https://amazon.com.br/produto';
    component.form.currentPrice = '10,00';
    expect(component.inspectionError).not.toContain('A imagem não foi encontrada');
    expect(component.inspectionError).toContain('Alguns campos não foram encontrados');
    component.save();
    await fixture.whenStable();
    expect(component.actionError).toBe('');
    expect(pending.decide).toHaveBeenCalled();
  });

  it('returns to the queue after a direct approval', () => {
    params$.next(convertToParamMap({ validar: 'pending-1' }));
    component.publish();
    expect(pending.decide).toHaveBeenCalledWith('pending-1', jasmine.objectContaining({ action: 'APPROVE' }));
    expect(router.navigate).toHaveBeenCalledWith(['/moderacao'], { state: { message: 'Promoção publicada com sucesso!' } });
  });

  it('sends EDIT before APPROVE when publishing changed fields', async () => {
    params$.next(convertToParamMap({ validar: 'pending-1' }));
    component.form.title = 'Título alterado';
    component.publish();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(pending.decide.calls.argsFor(0)[1].action).toBe('EDIT');
    expect(pending.decide.calls.argsFor(1)[1].action).toBe('APPROVE');
  });

  it('does not approve when EDIT fails and preserves the typed form', async () => {
    pending.decide.and.returnValue(throwError(() => new Error('edit failed')));
    params$.next(convertToParamMap({ validar: 'pending-1' }));
    component.form.title = 'Alteração mantida';
    component.publish();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(pending.decide.calls.count()).toBe(1);
    expect(pending.decide.calls.argsFor(0)[1].action).toBe('EDIT');
    expect(component.saving).toBeFalse();
    expect(component.actionError).toContain('salvar');
    expect(component.form.title).toBe('Alteração mantida');
  });

  it('uploads a ready image before EDIT and sends its image key', async () => {
    const order: string[] = [];
    upload.uploadPromotionImage.and.callFake(async () => { order.push('upload'); return { imageKey: 'image-key' } as any; });
    pending.decide.and.callFake((_id, request) => { order.push(request.action); return of(promotion); });
    params$.next(convertToParamMap({ editar: 'produto-1' }));
    component.newImageBlob = new Blob(['image']); component.newImageStatus = 'ready';
    component.form.title = 'Imagem nova';
    component.save();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(order).toEqual(['upload', 'EDIT']);
    expect(pending.decide.calls.argsFor(0)[1].imageKey).toBe('image-key');
  });

  it('does not edit when image upload fails and restores saving state', async () => {
    upload.uploadPromotionImage.and.returnValue(Promise.reject(new Error('upload failed')));
    params$.next(convertToParamMap({ editar: 'produto-1' }));
    component.newImageBlob = new Blob(['image']); component.newImageStatus = 'ready';
    component.form.title = 'Formulário preservado';
    component.save();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(pending.decide).not.toHaveBeenCalled();
    expect(component.saving).toBeFalse();
    expect(component.actionError).toContain('nova imagem');
    expect(component.form.title).toBe('Formulário preservado');
  });

  it('unblocks manual image selection, blocks again after removal, and clears it on inspection', async () => {
    params$.next(convertToParamMap({ editar: 'produto-1' }));
    component.inspectionApplied = true;
    component.inspectionRequiresImage = true;
    component.inspectionError = 'A imagem não foi encontrada. Selecione uma imagem manualmente.';
    imageProcessing.process.and.returnValue(Promise.resolve({ blob: new Blob(['image']), previewUrl: 'blob:preview', sizeKB: 1 } as any));
    await component.onImageSelected(new File(['image'], 'image.webp', { type: 'image/webp' }));
    expect(component.inspectionRequiresImage).toBeFalse();
    expect(component.inspectionError).not.toContain('A imagem não foi encontrada');
    component.removeImage();
    expect(component.inspectionRequiresImage).toBeFalse();
    expect(component.newImagePreviewUrl).toBeNull();
    expect(component.persistedImageHidden).toBeFalse();
    component.inspectionLoaded({ imageKey: 'stored-key', imageUrl: 'https://img/new.webp', missingFields: ['title'], marketplace: 'AMAZON', title: 'Novo', productUrl: 'https://amazon.com.br/p', affiliateUrl: '', currentPrice: 10, originalPrice: null, storeName: 'Amazon', soldBy: null, deliveredBy: null, category: null, salesCount: null, productRating: null, sellerRating: null, officialStore: false, trustSignals: [] } as any);
    expect(component.inspectionError).not.toContain('A imagem não foi encontrada');
    expect(component.inspectionError).toContain('Alguns campos não foram encontrados');
  });

  it('falls back to the persisted image when a replacement is removed', async () => {
    params$.next(convertToParamMap({ editar: 'produto-1' }));
    imageProcessing.process.and.resolveTo({
      blob: new Blob(['replacement']),
      previewUrl: 'blob:replacement',
      sizeKB: 1,
    } as any);
    await component.onImageSelected(new File(['image'], 'replacement.webp', { type: 'image/webp' }));

    component.removeImage();

    expect(component.newImagePreviewUrl).toBeNull();
    expect(component.newImageBlob).toBeNull();
    expect(component.persistedImageHidden).toBeFalse();
    expect(component.inspectionRequiresImage).toBeFalse();
  });

  it('blocks saving after the persisted image is hidden until a replacement is selected', () => {
    params$.next(convertToParamMap({ editar: 'produto-1' }));

    component.removeImage();
    component.form.title = 'Alteração sem imagem';
    component.save();

    expect(component.persistedImageHidden).toBeTrue();
    expect(component.actionError).toContain('Selecione uma imagem');
    expect(pending.decide).not.toHaveBeenCalled();
  });

  it('revokes blob previews but never revokes HTTP image URLs', () => {
    const revoke = spyOn(URL, 'revokeObjectURL');
    component.newImagePreviewUrl = 'https://img/current.webp';
    component.removeImage();
    expect(revoke).not.toHaveBeenCalled();
    component.newImagePreviewUrl = 'blob:current';
    fixture.destroy();
    expect(revoke).toHaveBeenCalledWith('blob:current');
  });

  it('cancels edit, validate, and create in their respective destinations', () => {
    params$.next(convertToParamMap({ editar: 'produto-1' }));
    component.cancel();
    expect(router.navigate).toHaveBeenCalledWith(['/promocoes', 'produto-1']);
    router.navigate.calls.reset();
    params$.next(convertToParamMap({ validar: 'pending-1' }));
    component.cancel();
    expect(router.navigate).toHaveBeenCalledWith(['/moderacao']);
    router.navigate.calls.reset();
    params$.next(convertToParamMap({}));
    component.cancel();
    expect(router.navigate).toHaveBeenCalledWith(['/moderacao']);
  });

  it('keeps the typed form when validation blocks saving', () => {
    params$.next(convertToParamMap({ editar: 'produto-1' }));
    component.form.title = '';
    component.save();
    expect(component.actionError).toContain('obrigatórios');
    expect(component.form.title).toBe('');
    expect(pending.decide).not.toHaveBeenCalled();
  });

  it('stops the pending fallback when the API repeats a full page', () => {
    pending.getPending.and.returnValue(of(Array.from({ length: 50 }, (_, index) => ({ ...promotion, id: `page-${index}` })) as Promotion[]));
    params$.next(convertToParamMap({ validar: 'missing-id' }));
    expect(pending.getPending.calls.count()).toBe(2);
    expect(component.loadError).toContain('não encontrada');
  });

  it('preserves the form when inspection fails', () => {
    params$.next(convertToParamMap({ editar: 'produto-1' }));
    component.form.title = 'Edição manual';
    component.inspectionFailed();
    expect(component.form.title).toBe('Edição manual');
    expect(component.inspectionError).toContain('inspeção');
  });

});
