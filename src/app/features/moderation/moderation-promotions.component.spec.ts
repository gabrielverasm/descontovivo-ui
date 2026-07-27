import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ModerationService } from '../../core/services/moderation.service';
import { Promotion } from '../../core/models/promotion.model';
import { SeoService } from '../../core/services/seo.service';
import { ModerationPromotionsComponent } from './moderation-promotions.component';
import { ToastService } from '../../core/services/toast.service';

describe('ModerationPromotionsComponent', () => {
  it('loads the queue and navigates validation with the promotion id', () => {
    const moderation = jasmine.createSpyObj<ModerationService>('ModerationService', ['getPending']);
    moderation.getPending.and.returnValue(of([]));
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    TestBed.configureTestingModule({ providers: [{ provide: ModerationService, useValue: moderation }, { provide: Router, useValue: router }, { provide: SeoService, useValue: jasmine.createSpyObj('SeoService', ['setNoIndex']) }] });
    const component = TestBed.runInInjectionContext(() => new ModerationPromotionsComponent());
    component.ngOnInit();
    expect(moderation.getPending).toHaveBeenCalled();
    component.validate({ id: 'pending-1' } as Promotion);
    expect(router.navigate).toHaveBeenCalledWith(['/moderacao/promocoes'], { queryParams: { validar: 'pending-1' } });
  });

  it('keeps the exact empty-state message after a successful empty response', () => {
    const moderation = jasmine.createSpyObj<ModerationService>('ModerationService', ['getPending']);
    moderation.getPending.and.returnValue(of([]));
    TestBed.configureTestingModule({ providers: [{ provide: ModerationService, useValue: moderation }, { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) }, { provide: SeoService, useValue: jasmine.createSpyObj('SeoService', ['setNoIndex']) }] });
    const component = TestBed.runInInjectionContext(() => new ModerationPromotionsComponent());
    component.ngOnInit();
    expect(component.promotions).toEqual([]);
    expect(component.error).toBe('');
  });

  it('consumes a message from the current navigation and clears it from browser history', () => {
    const moderation = jasmine.createSpyObj<ModerationService>('ModerationService', ['getPending']);
    moderation.getPending.and.returnValue(of([]));
    const router = jasmine.createSpyObj<Router>('Router', ['navigate', 'getCurrentNavigation']);
    router.getCurrentNavigation.and.returnValue({ extras: { state: { message: 'Salvo', other: 'keep' } } } as any);
    window.history.replaceState({ ...window.history.state, keep: 'keep' }, document.title);
    const replaceState = spyOn(window.history, 'replaceState').and.callThrough();
    TestBed.configureTestingModule({ providers: [{ provide: ModerationService, useValue: moderation }, { provide: Router, useValue: router }, { provide: SeoService, useValue: jasmine.createSpyObj('SeoService', ['setNoIndex']) }] });
    const component = TestBed.runInInjectionContext(() => new ModerationPromotionsComponent());
    const toast = TestBed.inject(ToastService);
    component.ngOnInit();
    expect(toast.toasts()[0].message).toBe('Salvo');
    expect(replaceState).toHaveBeenCalled();
    expect((replaceState.calls.mostRecent().args[0] as any).keep).toBe('keep');
  });

  it('falls back to history state once and preserves unrelated state', () => {
    const moderation = jasmine.createSpyObj<ModerationService>('ModerationService', ['getPending']);
    moderation.getPending.and.returnValue(of([]));
    const router = jasmine.createSpyObj<Router>('Router', ['navigate', 'getCurrentNavigation']);
    router.getCurrentNavigation.and.returnValue(null);
    const original = window.history.state;
    window.history.replaceState({ ...original, message: 'Retorno', keep: 1 }, document.title);
    TestBed.configureTestingModule({ providers: [{ provide: ModerationService, useValue: moderation }, { provide: Router, useValue: router }, { provide: SeoService, useValue: jasmine.createSpyObj('SeoService', ['setNoIndex']) }] });
    const component = TestBed.runInInjectionContext(() => new ModerationPromotionsComponent());
    const toast = TestBed.inject(ToastService);
    component.ngOnInit();
    expect(toast.toasts()[0].message).toBe('Retorno');
    expect(window.history.state.keep).toBe(1);
    expect(window.history.state.message).toBeUndefined();
  });

  it('reports queue loading failures', () => {
    const moderation = jasmine.createSpyObj<ModerationService>('ModerationService', ['getPending']);
    moderation.getPending.and.returnValue(throwError(() => new Error('offline')));
    TestBed.configureTestingModule({ providers: [{ provide: ModerationService, useValue: moderation }, { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) }, { provide: SeoService, useValue: jasmine.createSpyObj('SeoService', ['setNoIndex']) }] });
    const component = TestBed.runInInjectionContext(() => new ModerationPromotionsComponent());
    component.ngOnInit();
    expect(component.error).toBe('Erro ao carregar promoções pendentes.');
  });
});
