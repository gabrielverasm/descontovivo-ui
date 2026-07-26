import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ModerationPromotionPanelComponent } from './moderation-promotion-panel.component';
import { PromotionModerationFormValue } from '../../moderation-form.model';
import { moderationFormToEditRequest } from '../../moderation-form.model';
import { TrustSignal } from '../../../../shared/utils/trust-signals.util';
import { ModerationCategoryService } from '../../../../core/services/moderation-category.service';

@Component({
  standalone: true,
  imports: [ModerationPromotionPanelComponent],
  template: '<app-moderation-promotion-panel [promotion]="promotion" mode="edit" [editForm]="editForm" [soldAndDeliveredByStore]="locked" />',
})
class ModerationPanelHostComponent {
  promotion = { id: 'p1', title: 'Produto', url: 'https://amazon.com.br/p', imageUrl: 'https://img/p.webp', storeName: 'Amazon', currentPrice: 10, originalPrice: 20, marketplace: 'AMAZON', category: 'Casa' } as any;
  editForm = { marketplace: 'AMAZON', title: '', url: '', currentPrice: '', originalPrice: '', couponCode: '', storeName: 'Amazon', soldBy: '', deliveredBy: '', category: '', availability: '', priceSignal: '', salesCount: '', productRating: '', sellerRating: '', officialStore: false, trustSignals: [] } as PromotionModerationFormValue;
  locked = true;
}

describe('ModerationPromotionPanelComponent', () => {
  function form(): PromotionModerationFormValue {
    return { marketplace: 'AMAZON', title: '', url: '', currentPrice: '', originalPrice: '', couponCode: '', storeName: 'Amazon', soldBy: '', deliveredBy: '', category: '', availability: '', priceSignal: '', salesCount: '', productRating: '', sellerRating: '', officialStore: false, trustSignals: [] };
  }

  function create(mode: 'validate' | 'edit' = 'edit', promo: any = { id: 'p1', title: 'Produto', url: 'https://amazon.com.br/p', imageUrl: 'https://img/p.webp', storeName: 'Amazon', currentPrice: 10, originalPrice: 20, marketplace: 'AMAZON', category: 'Casa' }): ComponentFixture<ModerationPromotionPanelComponent> {
    TestBed.configureTestingModule({
      imports: [ModerationPromotionPanelComponent],
      providers: [{ provide: ModerationCategoryService, useValue: jasmine.createSpyObj('ModerationCategoryService', { list: of([]) }) }],
    });
    const fixture = TestBed.createComponent(ModerationPromotionPanelComponent);
    fixture.componentInstance.promotion = promo;
    fixture.componentInstance.mode = mode;
    fixture.componentInstance.editForm = form();
    fixture.detectChanges();
    return fixture;
  }

  it('renders mode-specific actions and an empty option for no price signal', () => {
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('Salvar alterações');
    expect(fixture.nativeElement.textContent).not.toContain('Publicar promoção');
    const option = fixture.nativeElement.querySelector('select[aria-label="Selo de preço"] option:first-child') as HTMLOptionElement;
    expect(option.value).toBe('');
    fixture.destroy();
  });

  it('renders the complete validate action set and opens the rejection reason', () => {
    const fixture = create('validate');
    expect(fixture.nativeElement.textContent).toContain('Salvar ajustes');
    expect(fixture.nativeElement.textContent).toContain('Publicar promoção');
    expect(fixture.nativeElement.textContent).toContain('Rejeitar');
    expect(fixture.nativeElement.textContent).not.toContain('Motivo da rejeição');
    fixture.componentInstance.startReject.emit();
    fixture.componentInstance.showRejectInput = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Motivo da rejeição');
    fixture.destroy();
  });

  it('disables seller inputs when sold and delivered by the store is selected', () => {
    TestBed.configureTestingModule({
      imports: [ModerationPanelHostComponent],
      providers: [{ provide: ModerationCategoryService, useValue: jasmine.createSpyObj('ModerationCategoryService', { list: of([]) }) }],
    });
    const fixture = TestBed.createComponent(ModerationPanelHostComponent);
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('input[aria-label="Vendido por"]') as HTMLInputElement).disabled).toBeTrue();
    expect((fixture.nativeElement.querySelector('input[aria-label="Entregue por"]') as HTMLInputElement).disabled).toBeTrue();
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    expect(buttons.filter((button) => button.textContent?.trim() === 'Usar loja').every((button) => button.disabled)).toBeTrue();
    expect(buttons.find((button) => button.textContent?.trim() === 'Copiar vendido')?.disabled).toBeTrue();
    fixture.componentInstance.locked = false;
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('input[aria-label="Vendido por"]') as HTMLInputElement).disabled).toBeFalse();
    expect((fixture.nativeElement.querySelector('input[aria-label="Entregue por"]') as HTMLInputElement).disabled).toBeFalse();
    fixture.destroy();
  });

  it('formats manual cents input and sends the decimal value', () => {
    const fixture = create();
    fixture.componentInstance.onCurrentPriceInput({ target: { value: '10000' } } as any);
    expect(fixture.componentInstance.currentPriceDisplay).toBe('R$\u00a0100,00');
    expect(fixture.componentInstance.editForm.currentPrice).toBe('R$\u00a0100,00');
    expect(moderationFormToEditRequest(fixture.componentInstance.editForm, { promotion: fixture.componentInstance.promotion, inspectionApplied: false, inspectedFormUrl: null }).currentPrice).toBe(100);
    fixture.destroy();
  });

  it('keeps sales count as a string through a real text input and maps it to a number', () => {
    const fixture = create();
    const input = fixture.nativeElement.querySelector('input[aria-label="Quantidade de vendas"]') as HTMLInputElement;
    input.value = '2500';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.editForm.salesCount).toBe('2500');
    expect(moderationFormToEditRequest(fixture.componentInstance.editForm, { promotion: fixture.componentInstance.promotion, inspectionApplied: false, inspectedFormUrl: null }).salesCount).toBe(2500);
    input.value = '';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(moderationFormToEditRequest(fixture.componentInstance.editForm, { promotion: fixture.componentInstance.promotion, inspectionApplied: false, inspectedFormUrl: null }).salesCount).toBeNull();
    fixture.destroy();
  });

  it('normalizes product ratings from comma and compact decimal input on blur', () => {
    const fixture = create();
    const input = fixture.nativeElement.querySelector('input[aria-label="Nota do produto"]') as HTMLInputElement;
    input.value = '4,8'; input.dispatchEvent(new Event('input')); fixture.detectChanges(); input.dispatchEvent(new Event('blur')); fixture.detectChanges();
    expect(input.value).toBe('4,8');
    expect(moderationFormToEditRequest(fixture.componentInstance.editForm, { promotion: fixture.componentInstance.promotion, inspectionApplied: false, inspectedFormUrl: null }).productRating).toBe(4.8);
    input.value = '48'; input.dispatchEvent(new Event('input')); fixture.detectChanges(); input.dispatchEvent(new Event('blur')); fixture.detectChanges();
    expect(input.value).toBe('4,8');
    expect(moderationFormToEditRequest(fixture.componentInstance.editForm, { promotion: fixture.componentInstance.promotion, inspectionApplied: false, inspectedFormUrl: null }).productRating).toBe(4.8);
    input.value = '60'; input.dispatchEvent(new Event('input')); fixture.detectChanges(); input.dispatchEvent(new Event('blur')); fixture.detectChanges();
    expect(input.value).toBe('');
    expect(moderationFormToEditRequest(fixture.componentInstance.editForm, { promotion: fixture.componentInstance.promotion, inspectionApplied: false, inspectedFormUrl: null }).productRating).toBeNull();
    fixture.destroy();
  });

  it('normalizes seller ratings and preserves API-loaded rating display', () => {
    const fixture = create();
    const seller = fixture.nativeElement.querySelector('input[aria-label="Nota do vendedor"]') as HTMLInputElement;
    seller.value = '49'; seller.dispatchEvent(new Event('input')); fixture.detectChanges(); seller.dispatchEvent(new Event('blur')); fixture.detectChanges();
    expect(seller.value).toBe('4,9');
    expect(moderationFormToEditRequest(fixture.componentInstance.editForm, { promotion: fixture.componentInstance.promotion, inspectionApplied: false, inspectedFormUrl: null }).sellerRating).toBe(4.9);
    seller.value = '50'; seller.dispatchEvent(new Event('input')); fixture.detectChanges(); seller.dispatchEvent(new Event('blur')); fixture.detectChanges();
    expect(seller.value).toBe('5');
    expect(moderationFormToEditRequest(fixture.componentInstance.editForm, { promotion: fixture.componentInstance.promotion, inspectionApplied: false, inspectedFormUrl: null }).sellerRating).toBe(5);
    fixture.componentInstance.editForm.productRating = '4,8';
    fixture.componentInstance.editForm.sellerRating = '4,9';
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('input[aria-label="Nota do produto"]') as HTMLInputElement).value).toBe('4,8');
    expect(seller.value).toBe('4,9');
    fixture.destroy();
  });

  it('disables store shortcuts for an unknown-store placeholder and enables them for a real store', () => {
    const fixture = create('edit', { id: 'p1', title: 'Produto', url: 'https://amazon.com.br/p', imageUrl: 'https://img/p.webp', storeName: 'loja-nao-identificada', currentPrice: 10, marketplace: 'AMAZON' });
    fixture.componentInstance.editForm.storeName = '';
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('input[type="checkbox"]') as HTMLInputElement).disabled).toBeTrue();
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    expect(buttons.filter((button) => button.textContent?.trim() === 'Usar loja').every((button) => button.disabled)).toBeTrue();
    fixture.componentInstance.editForm.storeName = 'Magalu';
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('input[type="checkbox"]') as HTMLInputElement).disabled).toBeFalse();
    expect(buttons.filter((button) => button.textContent?.trim() === 'Usar loja').every((button) => !button.disabled)).toBeTrue();
    fixture.destroy();
  });

  it('keeps official store checkbox and chip synchronized', () => {
    const component = Object.create(ModerationPromotionPanelComponent.prototype) as ModerationPromotionPanelComponent;
    component.editForm = form();
    component.onOfficialStoreChange(true);
    expect(component.editForm.officialStore).toBeTrue();
    expect(component.editForm.trustSignals).toEqual([TrustSignal.OFFICIAL_STORE]);
    component.toggleTrustSignal(TrustSignal.OFFICIAL_STORE);
    expect(component.editForm.officialStore).toBeFalse();
    expect(component.editForm.trustSignals).toEqual([]);
  });
});
