import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { PromotionInspectionResponse } from '../../../core/models/marketplace-inspection.model';
import { MarketplaceInspectionService } from '../../../core/services/marketplace-inspection.service';
import { MarketplaceInspectionButtonComponent } from './marketplace-inspection-button.component';

describe('MarketplaceInspectionButtonComponent', () => {
  let fixture: ComponentFixture<MarketplaceInspectionButtonComponent>;
  let component: MarketplaceInspectionButtonComponent;
  let service: jasmine.SpyObj<MarketplaceInspectionService>;
  const response: PromotionInspectionResponse = {
    marketplace: 'SHOPEE', supported: true, inputUrl: 'in', productUrl: 'product',
    affiliateUrl: null, title: null, currentPrice: null, originalPrice: null,
    imageKey: null, imageUrl: null, storeName: null, sellerName: null, soldBy: null,
    deliveredBy: null, salesCount: null, productRating: null, sellerRating: null,
    officialStore: false, shopeeGuarantee: false, category: null, trustSignals: [],
    missingFields: [], warnings: [],
  };

  beforeEach(async () => {
    service = jasmine.createSpyObj('MarketplaceInspectionService', ['inspect']);
    await TestBed.configureTestingModule({
      imports: [MarketplaceInspectionButtonComponent],
      providers: [{ provide: MarketplaceInspectionService, useValue: service }],
    }).compileComponents();
    fixture = TestBed.createComponent(MarketplaceInspectionButtonComponent);
    component = fixture.componentInstance;
  });

  it('shows an enabled Shopee action', () => {
    component.url = 'https://shopee.com.br/x'; fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBeFalse(); expect(button.textContent).toContain('Carregar dados da Shopee');
  });

  for (const [label, url] of [['Amazon', 'https://amzn.to/x'], ['Mercado Livre', 'https://meli.la/x'], ['Magalu', 'https://mglu.io/x'], ['AliExpress', 'https://pt.aliexpress.com/x']]) {
    it(`shows disabled ${label} action`, () => {
      component.url = url; fixture.detectChanges();
      expect((fixture.nativeElement.querySelector('button') as HTMLButtonElement).disabled).toBeTrue();
      expect(fixture.nativeElement.textContent).toContain('Integração em breve');
    });
  }

  it('hides invalid URLs', () => {
    component.url = 'invalid'; fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('emits loaded and blocks duplicate calls while loading', () => {
    const pending = new Subject<PromotionInspectionResponse>(); service.inspect.and.returnValue(pending);
    component.url = 'https://shopee.com.br/x'; spyOn(component.loaded, 'emit');
    component.load(); component.load();
    expect(service.inspect).toHaveBeenCalledTimes(1);
    pending.next(response); pending.complete();
    expect(component.loaded.emit).toHaveBeenCalledWith(response);
  });

  it('emits failed on errors', () => {
    service.inspect.and.returnValue(throwError(() => new Error('failed')));
    component.url = 'https://shopee.com.br/x'; spyOn(component.failed, 'emit'); component.load();
    expect(component.failed.emit).toHaveBeenCalled();
  });

  it('never calls the service for unsupported marketplaces', () => {
    service.inspect.and.returnValue(of(response)); component.url = 'https://amazon.com.br/x'; component.load();
    expect(service.inspect).not.toHaveBeenCalled();
  });
});
