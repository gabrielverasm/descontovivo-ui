import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PromotionViewCountComponent } from './promotion-view-count.component';

describe('PromotionViewCountComponent', () => {
  it('formats the count using pt-BR thousands separators', () => {
    const component = new PromotionViewCountComponent();
    component.viewCount = 12345;
    expect(component.formattedCount).toBe('12.345');
  });

  it('uses singular wording for exactly one view', () => {
    const component = new PromotionViewCountComponent();
    component.viewCount = 1;
    expect(component.ariaLabel).toBe('1 visualização');
  });

  it('uses plural wording for zero or many views', () => {
    const zero = new PromotionViewCountComponent();
    zero.viewCount = 0;
    expect(zero.ariaLabel).toBe('0 visualizações');

    const many = new PromotionViewCountComponent();
    many.viewCount = 42;
    expect(many.ariaLabel).toBe('42 visualizações');
  });

  it('never renders a negative count', () => {
    const component = new PromotionViewCountComponent();
    component.viewCount = -5;
    expect(component.formattedCount).toBe('0');
    expect(component.ariaLabel).toBe('0 visualizações');
  });

  describe('rendering', () => {
    let fixture: ComponentFixture<PromotionViewCountComponent>;

    beforeEach(() => {
      TestBed.configureTestingModule({ imports: [PromotionViewCountComponent] });
      fixture = TestBed.createComponent(PromotionViewCountComponent);
    });

    it('renders the eye icon and the formatted count', () => {
      fixture.componentInstance.viewCount = 2500;
      fixture.detectChanges();

      const host: HTMLElement = fixture.nativeElement;
      expect(host.querySelector('svg.promotion-view-count__icon')).toBeTruthy();
      expect(host.querySelector('.promotion-view-count__value')?.textContent?.trim()).toBe('2.500');
      expect(host.querySelector('.promotion-view-count')?.getAttribute('aria-label'))
        .toBe('2.500 visualizações');
    });
  });
});
