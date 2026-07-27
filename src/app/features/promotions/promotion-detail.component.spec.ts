import { DatePipe } from '@angular/common';
import { NO_ERRORS_SCHEMA, RESPONSE_INIT } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { Promotion } from '../../core/models/promotion.model';
import { AuthService } from '../../core/services/auth.service';
import { CommentService } from '../../core/services/comment.service';
import { ImageProcessingService } from '../../core/services/image-processing.service';
import { ModerationService } from '../../core/services/moderation.service';
import { PromotionService } from '../../core/services/promotion.service';
import { SeoService } from '../../core/services/seo.service';
import { StructuredDataService } from '../../core/services/structured-data.service';
import { ToastService } from '../../core/services/toast.service';
import { UploadService } from '../../core/services/upload.service';
import { PromotionsFeedStateService } from './promotions-feed-state.service';
import { PromotionDetailComponent } from './promotion-detail.component';

const promotion = {
  id: 'promo-1', slug: 'produto-em-oferta', title: 'Produto em oferta', currentPrice: 99.9,
  storeName: 'Shopee', storeUrl: '', url: 'https://shopee.com.br/produto', imageUrl: '/produto.webp',
  category: 'Tecnologia', tags: ['oferta'], likesCount: 4, dislikesCount: 0, commentsCount: 2,
  status: 'approved', createdAt: '2026-07-22T10:00:00Z', publishedAt: '2026-07-22T10:00:00Z',
  createdBy: 'tester', officialStore: true, sponsoredLink: true,
} as const;

function providers(router: jasmine.SpyObj<Router>, analytics: jasmine.SpyObj<AnalyticsService>, service: object, auth = { canModerate: () => false, hasRole: () => false, canComment: () => false }) {
  return [
    { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: promotion.slug })) } },
    { provide: Router, useValue: router }, { provide: PromotionService, useValue: service },
    { provide: CommentService, useValue: { listByPromotion: () => of([]) } },
    { provide: AuthService, useValue: auth },
    { provide: ModerationService, useValue: jasmine.createSpyObj('ModerationService', ['decide']) },
    { provide: ImageProcessingService, useValue: jasmine.createSpyObj('ImageProcessingService', ['validate', 'process']) },
    { provide: UploadService, useValue: jasmine.createSpyObj('UploadService', ['uploadPromotionImage']) },
    { provide: SeoService, useValue: jasmine.createSpyObj('SeoService', ['setNoIndex', 'setNonIndexable', 'setIndexable']) },
    { provide: StructuredDataService, useValue: jasmine.createSpyObj('StructuredDataService', ['clearPageStructuredData', 'setStructuredData']) },
    { provide: AnalyticsService, useValue: analytics }, { provide: PromotionsFeedStateService, useValue: {} },
  ];
}

describe('PromotionDetailComponent public actions', () => {
  let fixture: ComponentFixture<PromotionDetailComponent>;
  let component: PromotionDetailComponent;
  let router: jasmine.SpyObj<Router>;
  let analytics: jasmine.SpyObj<AnalyticsService>;

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['navigate']);
    analytics = jasmine.createSpyObj('AnalyticsService', ['trackViewPromotion', 'trackClickStore', 'trackSharePromotion']);
    TestBed.configureTestingModule({ imports: [PromotionDetailComponent], providers: providers(router, analytics, { getPromotionBySlug: () => of(promotion), getRelatedPromotions: () => of([]) }) });
    TestBed.overrideComponent(PromotionDetailComponent, { set: { imports: [DatePipe], schemas: [NO_ERRORS_SCHEMA] } });
    fixture = TestBed.createComponent(PromotionDetailComponent); component = fixture.componentInstance; fixture.detectChanges();
  });
  afterEach(() => fixture.destroy());

  it('renders the external CTA with sponsored rel and analytics', () => {
    const host = fixture.nativeElement as HTMLElement;
    const cta = host.querySelector<HTMLAnchorElement>('.promotion-detail__cta')!;
    expect(host.querySelectorAll('.promotion-detail__cta').length).toBe(1);
    expect(cta.getAttribute('aria-label')).toBe('Ir para Shopee');
    expect(cta.href).toBe(promotion.url); expect(cta.rel).toBe('sponsored noopener noreferrer'); expect(cta.target).toBe('_blank');
    expect(cta.compareDocumentPosition(host.querySelector('.promotion-detail__trust-section')!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    cta.addEventListener('click', (event) => event.preventDefault()); cta.click();
    expect(analytics.trackClickStore).toHaveBeenCalledTimes(1);
  });

  it('keeps back and share actions working', () => {
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLButtonElement>('.promotion-detail__back')!.click();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
    const share = spyOn(component, 'sharePromotion');
    host.querySelector<HTMLButtonElement>('.promotion-detail__share-btn')!.click();
    expect(share).toHaveBeenCalledTimes(1);
  });
});

describe('PromotionDetailComponent administrative action', () => {
  it('navigates Editar promoção to the moderation workspace using the slug', () => {
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const component = Object.create(PromotionDetailComponent.prototype) as PromotionDetailComponent;
    component.promotion = promotion as unknown as Promotion;
    Object.defineProperty(component, 'router', { value: router });
    component.editPromotion();
    expect(router.navigate).toHaveBeenCalledWith(['/moderacao/promocoes'], { queryParams: { editar: 'produto-em-oferta' } });
  });

  it('renders moderator actions without the admin-only removal action', () => {
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['trackViewPromotion']);
    TestBed.configureTestingModule({ imports: [PromotionDetailComponent], providers: providers(router, analytics, { getPromotionBySlug: () => of(promotion), getRelatedPromotions: () => of([]) }, { canModerate: () => true, hasRole: () => false, canComment: () => false }) });
    TestBed.overrideComponent(PromotionDetailComponent, { set: { imports: [DatePipe], schemas: [NO_ERRORS_SCHEMA] } });
    const fixture = TestBed.createComponent(PromotionDetailComponent); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Editar promoção');
    expect(fixture.nativeElement.textContent).toContain('Gerar story');
    expect(fixture.nativeElement.textContent).not.toContain('Remover promoção');
    fixture.destroy();
  });

  it('renders admin removal actions with danger classes and neutral cancel', () => {
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['trackViewPromotion']);
    const auth = { canModerate: () => true, hasRole: () => true, canComment: () => false };
    TestBed.configureTestingModule({ imports: [PromotionDetailComponent], providers: providers(router, analytics, { getPromotionBySlug: () => of(promotion), getRelatedPromotions: () => of([]) }, auth) });
    TestBed.overrideComponent(PromotionDetailComponent, { set: { imports: [DatePipe], schemas: [NO_ERRORS_SCHEMA] } });
    const fixture = TestBed.createComponent(PromotionDetailComponent); fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.promotion-detail__admin-remove')).not.toBeNull();
    host.querySelector<HTMLButtonElement>('.promotion-detail__admin-remove')!.click();
    fixture.detectChanges();
    expect(host.querySelector('.promotion-detail__admin-remove-confirm')).not.toBeNull();
    expect(host.querySelector('.promotion-detail__admin-cancel')).not.toBeNull();
    expect(host.querySelector('.promotion-detail__admin-cancel')?.classList.contains('promotion-detail__admin-remove')).toBeFalse();
    fixture.destroy();
  });

  it('removes the promotion, shows a success toast, and preserves navigation', () => {
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const moderation = jasmine.createSpyObj<ModerationService>('ModerationService', ['decide']);
    const toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']);
    moderation.decide.and.returnValue(of(promotion as unknown as Promotion));
    const component = Object.create(PromotionDetailComponent.prototype) as PromotionDetailComponent;
    component.promotion = promotion as unknown as Promotion;
    component.isRemoveConfirm = true;
    component.isAdminSaving = false;
    Object.defineProperties(component, {
      router: { value: router },
      moderationService: { value: moderation },
      toast: { value: toast },
    });

    component.executeRemove();

    expect(toast.success).toHaveBeenCalledOnceWith('Promoção removida com sucesso.');
    expect(router.navigate).toHaveBeenCalledOnceWith(['/promocoes']);
    expect(component.isRemoveConfirm).toBeFalse();
    expect(component.isAdminSaving).toBeFalse();
  });
});

describe('PromotionDetailComponent comment feedback', () => {
  it('shows an error toast without clearing the comment after a failed submission', () => {
    const comments = jasmine.createSpyObj<CommentService>('CommentService', ['createComment']);
    const toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']);
    comments.createComment.and.returnValue(throwError(() => new Error('request failed')));
    const component = Object.create(PromotionDetailComponent.prototype) as PromotionDetailComponent;
    component.promotion = promotion as unknown as Promotion;
    component.comments = [];
    component.newCommentContent = 'Comentário ainda editável';
    component.isSubmittingComment = false;
    Object.defineProperties(component, {
      commentService: { value: comments },
      toast: { value: toast },
    });

    component.submitComment();

    expect(toast.error).toHaveBeenCalledOnceWith('Não foi possível publicar o comentário. Tente novamente.');
    expect(component.newCommentContent).toBe('Comentário ainda editável');
    expect(component.isSubmittingComment).toBeFalse();
  });
});

describe('PromotionDetailComponent SSR response status', () => {
  it('returns 503 with Retry-After when the promotion API is unavailable', () => {
    const responseInit: ResponseInit = { status: 200, headers: {} };
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['trackViewPromotion']);
    TestBed.configureTestingModule({ imports: [PromotionDetailComponent], providers: [{ provide: RESPONSE_INIT, useValue: responseInit }, ...providers(router, analytics, { getPromotionBySlug: () => throwError(() => new HttpErrorResponse({ status: 503 })), getRelatedPromotions: () => of([]) })] });
    TestBed.overrideComponent(PromotionDetailComponent, { set: { template: '' } });
    const fixture = TestBed.createComponent(PromotionDetailComponent); fixture.detectChanges();
    expect(responseInit.status).toBe(503); expect((responseInit.headers as Record<string, string>)['Retry-After']).toBe('60'); fixture.destroy();
  });
});
