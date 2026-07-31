import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Promotion } from '../../../../core/models/promotion.model';
import { PromotionDetailRelatedComponent } from './promotion-detail-related.component';

const related = (id: string, slug = `oferta-${id}`): Promotion => ({
  id,
  slug,
  title: `Oferta ${id}`,
  currentPrice: 20,
  storeName: 'Loja',
  storeUrl: '',
  imageUrl: '',
  category: 'Casa',
  categories: ['Casa'],
  tags: [],
  likesCount: 0,
  commentsCount: 0,
  status: 'approved',
  createdAt: '2026-07-31T10:00:00Z',
  createdBy: 'user',
});

describe('PromotionDetailRelatedComponent', () => {
  let fixture: ComponentFixture<PromotionDetailRelatedComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PromotionDetailRelatedComponent],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(PromotionDetailRelatedComponent);
  });

  afterEach(() => fixture.destroy());

  it('uses the new category-only title and subtitle and links cards by public slug', () => {
    fixture.componentInstance.relatedPromotions = [related('1', 'casa-em-oferta')];
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('h2')?.textContent?.trim()).toBe('Outras ofertas');
    expect(host.querySelector('.detail-related__heading p')?.textContent?.trim())
      .toBe('Outras promoções das mesmas categorias.');
    expect(host.querySelector<HTMLAnchorElement>('.related-promotion-item')?.getAttribute('href'))
      .toBe('/promocoes/casa-em-oferta');
  });

  it('keeps three-item pagination working without duplicating cards', () => {
    fixture.componentInstance.relatedPromotions = [1, 2, 3, 4].map(id => related(String(id)));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-related-promotion-item').length).toBe(3);
    expect(fixture.nativeElement.querySelector('.detail-related__pages')).not.toBeNull();

    const pageChange = spyOn(fixture.componentInstance.pageChange, 'emit');
    fixture.componentInstance.showNext();
    expect(pageChange).toHaveBeenCalledOnceWith(1);
  });

  it('renders no section, title, card or pagination when there are no related promotions', () => {
    fixture.componentInstance.relatedPromotions = [];
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.detail-related')).toBeNull();
    expect(host.querySelector('h2')).toBeNull();
    expect(host.querySelector('app-related-promotion-item')).toBeNull();
    expect(host.querySelector('.detail-related__pages')).toBeNull();
  });
});
