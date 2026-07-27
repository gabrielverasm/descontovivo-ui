import { TestBed } from '@angular/core/testing';
import { Promotion } from '../../../../core/models/promotion.model';
import { ToastService } from '../../../../core/services/toast.service';
import { PromotionStoryGeneratorComponent } from './promotion-story-generator.component';

describe('PromotionStoryGeneratorComponent operational feedback', () => {
  let component: PromotionStoryGeneratorComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new PromotionStoryGeneratorComponent());
    component.promotion = { id: 'promo-1', title: 'Promoção', currentPrice: 10 } as Promotion;
  });

  it('shows successful clipboard actions in a success toast', async () => {
    const writeText = jasmine.createSpy('writeText').and.resolveTo();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    component.canonicalUrl = 'https://descontovivo.com/promocoes/promo-1';
    await component.copyLink();
    expect(TestBed.inject(ToastService).toasts()[0]).toEqual(jasmine.objectContaining({
      type: 'success',
      message: 'Link copiado.',
    }));
  });

  it('shows clipboard failures in an error toast', async () => {
    const writeText = jasmine.createSpy('writeText').and.rejectWith(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    await component.copyCaption();
    expect(TestBed.inject(ToastService).toasts()[0]).toEqual(jasmine.objectContaining({
      type: 'error',
      message: 'Não foi possível copiar automaticamente.',
    }));
  });
});
