import { Component } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { ModerationPromotionPanelComponent } from './moderation-promotion-panel.component';
import { PromotionModerationFormValue } from '../../moderation-form.model';
import { moderationFormToEditRequest, promotionToModerationForm } from '../../moderation-form.model';
import { TrustSignal } from '../../../../shared/utils/trust-signals.util';
import { ModerationCategoryService } from '../../../../core/services/moderation-category.service';

@Component({
  standalone: true,
  imports: [ModerationPromotionPanelComponent],
  template: '<app-moderation-promotion-panel [promotion]="promotion" mode="edit" [editForm]="editForm" [soldAndDeliveredByStore]="locked" />',
})
class ModerationPanelHostComponent {
  promotion = { id: 'p1', title: 'Produto', url: 'https://amazon.com.br/p', imageUrl: 'https://img/p.webp', storeName: 'Amazon', currentPrice: 10, originalPrice: 20, marketplace: 'AMAZON', category: 'Casa' } as any;
  editForm = { marketplace: 'AMAZON', title: '', url: '', currentPrice: '', originalPrice: '', couponCode: '', storeName: 'Amazon', soldBy: '', deliveredBy: '', category: '', categories: [], availability: '', priceSignal: '', salesCount: '', productRating: '', sellerRating: '', officialStore: false, trustSignals: [] } as PromotionModerationFormValue;
  locked = true;
}

describe('ModerationPromotionPanelComponent', () => {
  function form(): PromotionModerationFormValue {
    return { marketplace: 'AMAZON', title: '', url: '', currentPrice: '', originalPrice: '', couponCode: '', storeName: 'Amazon', soldBy: '', deliveredBy: '', category: '', categories: [], availability: '', priceSignal: '', salesCount: '', productRating: '', sellerRating: '', officialStore: false, trustSignals: [] };
  }

  function create(mode: 'create' | 'validate' | 'edit' = 'edit', promo: any = { id: 'p1', title: 'Produto', url: 'https://amazon.com.br/p', imageUrl: 'https://img/p.webp', storeName: 'Amazon', currentPrice: 10, originalPrice: 20, marketplace: 'AMAZON', category: 'Casa' }): ComponentFixture<ModerationPromotionPanelComponent> {
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

  it('shows the persisted image without a duplicate file selector and restores it when locally hidden', () => {
    const fixture = create('edit');
    expect(fixture.nativeElement.querySelector('.promotion-image-upload__preview img')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-file-field')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Alterar imagem"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Remover imagem"]')).not.toBeNull();

    fixture.componentInstance.persistedImageHidden = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.promotion-image-upload__preview')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-file-field')).not.toBeNull();
    fixture.destroy();
  });

  it('disables image overlay actions while image processing is busy', () => {
    const fixture = create('edit');
    fixture.componentInstance.imageBusy = true;
    fixture.detectChanges();
    const actions = Array.from(fixture.nativeElement.querySelectorAll('.promotion-image-upload__action')) as HTMLButtonElement[];
    expect(actions.length).toBe(2);
    expect(actions.every(button => button.disabled)).toBeTrue();
    fixture.destroy();
  });

  it('autofills store and delivery from the offer URL without filling the seller', fakeAsync(() => {
    const fixture = create('create');
    fixture.componentInstance.editForm.storeName = '';
    fixture.componentInstance.editForm.deliveredBy = '';
    fixture.componentInstance.editForm.soldBy = '';

    fixture.componentInstance.onOfferUrlChange('https://www.amazon.com.br/produto');
    tick(399);
    expect(fixture.componentInstance.editForm.storeName).toBe('');
    tick(1);

    expect(fixture.componentInstance.editForm.storeName).toBe('Amazon');
    expect(fixture.componentInstance.editForm.deliveredBy).toBe('Amazon');
    expect(fixture.componentInstance.editForm.soldBy).toBe('');
    expect(fixture.componentInstance.soldAndDeliveredByStore).toBeFalse();
    fixture.destroy();
  }));

  it('updates prior automatic values but preserves manual corrections and unknown domains', fakeAsync(() => {
    const fixture = create('edit');
    fixture.componentInstance.editForm.storeName = '';
    fixture.componentInstance.editForm.deliveredBy = '';

    fixture.componentInstance.onOfferUrlChange('amazon.com.br/produto');
    tick(400);
    fixture.componentInstance.onOfferUrlChange('https://meli.la/oferta');
    tick(400);
    expect(fixture.componentInstance.editForm.storeName).toBe('MercadoLivre');
    expect(fixture.componentInstance.editForm.deliveredBy).toBe('MercadoLivre');

    fixture.componentInstance.onStoreNameChange('Loja corrigida');
    fixture.componentInstance.onDeliveredByChange('Entrega corrigida');
    fixture.componentInstance.onOfferUrlChange('https://s.shopee.com.br/oferta');
    tick(400);
    expect(fixture.componentInstance.editForm.storeName).toBe('Loja corrigida');
    expect(fixture.componentInstance.editForm.deliveredBy).toBe('Entrega corrigida');

    fixture.componentInstance.onOfferUrlChange('https://example.com/oferta');
    tick(400);
    expect(fixture.componentInstance.editForm.storeName).toBe('Loja corrigida');
    expect(fixture.componentInstance.editForm.deliveredBy).toBe('Entrega corrigida');
    fixture.destroy();
  }));

  it('formats currency through the rendered input and sends the decimal value', () => {
    const fixture = create();
    const input = fixture.nativeElement.querySelector('input[aria-label="Preço atual"]') as HTMLInputElement;
    input.value = '10000';
    input.setSelectionRange(5, 5);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(input.value).toBe('R$\u00a0100,00');
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
    expect(fixture.componentInstance.editForm.salesCount).toBe('2.500');
    expect(moderationFormToEditRequest(fixture.componentInstance.editForm, { promotion: fixture.componentInstance.promotion, inspectionApplied: false, inspectedFormUrl: null }).salesCount).toBe(2500);
    input.value = '';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(moderationFormToEditRequest(fixture.componentInstance.editForm, { promotion: fixture.componentInstance.promotion, inspectionApplied: false, inspectedFormUrl: null }).salesCount).toBeNull();
    fixture.destroy();
  });

  it('normalizes product ratings and preserves the last valid value after invalid typing', () => {
    const fixture = create();
    const input = fixture.nativeElement.querySelector('input[aria-label="Nota do produto"]') as HTMLInputElement;
    input.value = '4,8'; input.dispatchEvent(new Event('input')); fixture.detectChanges(); input.dispatchEvent(new Event('blur')); fixture.detectChanges();
    expect(input.value).toBe('4,8');
    expect(moderationFormToEditRequest(fixture.componentInstance.editForm, { promotion: fixture.componentInstance.promotion, inspectionApplied: false, inspectedFormUrl: null }).productRating).toBe(4.8);
    input.value = '48'; input.dispatchEvent(new Event('input')); fixture.detectChanges(); input.dispatchEvent(new Event('blur')); fixture.detectChanges();
    expect(input.value).toBe('4,8');
    expect(moderationFormToEditRequest(fixture.componentInstance.editForm, { promotion: fixture.componentInstance.promotion, inspectionApplied: false, inspectedFormUrl: null }).productRating).toBe(4.8);
    input.value = '60'; input.dispatchEvent(new Event('input')); fixture.detectChanges();
    expect(input.value).toBe('4,8');
    expect(moderationFormToEditRequest(fixture.componentInstance.editForm, { promotion: fixture.componentInstance.promotion, inspectionApplied: false, inspectedFormUrl: null }).productRating).toBe(4.8);
    input.value = 'abc'; input.dispatchEvent(new Event('input')); fixture.detectChanges();
    expect(input.value).toBe('4,8');
    fixture.destroy();
  });

  it('normalizes seller ratings and preserves API-loaded rating display', () => {
    const fixture = create();
    const seller = fixture.nativeElement.querySelector('input[aria-label="Nota do vendedor"]') as HTMLInputElement;
    seller.value = '49'; seller.dispatchEvent(new Event('input')); fixture.detectChanges(); seller.dispatchEvent(new Event('blur')); fixture.detectChanges();
    expect(seller.value).toBe('4,9');
    expect(moderationFormToEditRequest(fixture.componentInstance.editForm, { promotion: fixture.componentInstance.promotion, inspectionApplied: false, inspectedFormUrl: null }).sellerRating).toBe(4.9);
    seller.value = '50'; seller.dispatchEvent(new Event('input')); fixture.detectChanges(); seller.dispatchEvent(new Event('blur')); fixture.detectChanges();
    expect(seller.value).toBe('5,0');
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

  it('uses the Official chip as the only official-store source of truth', () => {
    const component = Object.create(ModerationPromotionPanelComponent.prototype) as ModerationPromotionPanelComponent;
    component.editForm = form();
    component.toggleTrustSignal(TrustSignal.OFFICIAL_STORE);
    expect(component.editForm.officialStore).toBeTrue();
    expect(component.editForm.trustSignals).toEqual([TrustSignal.OFFICIAL_STORE]);
    component.toggleTrustSignal(TrustSignal.OFFICIAL_STORE);
    expect(component.editForm.officialStore).toBeFalse();
    expect(component.editForm.trustSignals).toEqual([]);
  });

  it('renders all modes from the same component without diagnostics or the old checkbox', () => {
    const fixture = create();
    for (const mode of ['create', 'edit', 'validate'] as const) {
      fixture.componentInstance.mode = mode;
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.promotion-form')).not.toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('Diagnóstico');
      expect(fixture.nativeElement.textContent).not.toContain('Abrir oferta original');
      expect(fixture.nativeElement.textContent).not.toContain('Loja oficial da plataforma');
    }
    fixture.destroy();
  });

  it('keeps the canonical field order and exposes only the actions for each mode', () => {
    const fixture = create('create');
    const selectors = [
      'input[placeholder^="Título"]',
      'input[placeholder^="Link da oferta"]',
      'input[placeholder="Cupom"]',
      'input[aria-label="Preço atual"]',
      'input[aria-label="Preço original"]',
      'app-promotion-category-selector',
      'input[placeholder^="Nome da loja"]',
      'input[aria-label="Vendido por"]',
      'input[aria-label="Entregue por"]',
      'select[aria-label="Disponibilidade"]',
      'select[aria-label="Selo de preço"]',
      'input[aria-label="Quantidade de vendas"]',
      'input[aria-label="Nota do produto"]',
      'input[aria-label="Nota do vendedor"]',
    ];
    const elements = selectors.map(selector => fixture.nativeElement.querySelector(selector) as Element);
    expect(elements.every(Boolean)).toBeTrue();
    for (let index = 1; index < elements.length; index += 1) {
      expect(elements[index - 1].compareDocumentPosition(elements[index]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(fixture.nativeElement.textContent).toContain('Adicionar promoção');
    expect(fixture.nativeElement.textContent).not.toContain('Salvar ajustes');

    fixture.componentInstance.mode = 'validate';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Salvar ajustes');
    expect(fixture.nativeElement.textContent).toContain('Publicar promoção');
    expect(fixture.nativeElement.textContent).toContain('Rejeitar');

    fixture.componentInstance.mode = 'edit';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Salvar alterações');
    expect(fixture.nativeElement.textContent).not.toContain('Publicar promoção');
    fixture.destroy();
  });

  it('maps initial edit and moderation values including legacy category and official signal', async () => {
    const fixture = create('edit');
    await fixture.whenStable();
    for (const mode of ['edit', 'validate'] as const) {
      const promotion = {
        id: 'p1', title: 'Cafeteira', url: 'https://example.com/p', imageUrl: 'https://img/p.webp',
        storeName: 'Loja', currentPrice: 129.9, originalPrice: 199.9, category: 'Casa',
        officialStore: true, trustSignals: [TrustSignal.HIGH_SALES],
      } as any;
      fixture.componentInstance.mode = mode;
      fixture.componentInstance.promotion = promotion;
      Object.assign(fixture.componentInstance.editForm, promotionToModerationForm(promotion));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      expect((fixture.nativeElement.querySelector('input[placeholder^="Título"]') as HTMLInputElement).value).toBe('Cafeteira');
      expect((fixture.nativeElement.querySelector('input[aria-label="Preço atual"]') as HTMLInputElement).value).toBe('R$\u00a0129,90');
      expect(fixture.componentInstance.editForm.categories).toEqual(['Casa']);
      expect(fixture.componentInstance.editForm.trustSignals).toContain(TrustSignal.OFFICIAL_STORE);
    }
    fixture.destroy();
  });

  it('always offers the five administrative trust badges without a marketplace and after inspection changes it', () => {
    const fixture = create('create');
    fixture.componentInstance.editForm.marketplace = null;
    fixture.detectChanges();
    const baseLabels = ['Revisada pela curadoria', 'Oficial', 'Muitas vendas', 'Produto bem avaliado', 'Vendedor bem avaliado'];
    const labels = () => Array.from(fixture.nativeElement.querySelectorAll('.trust-chip')).map((button: any) => button.textContent.trim());
    expect(labels().length).toBe(5);
    expect(labels()).toEqual(jasmine.arrayContaining(baseLabels));
    fixture.componentInstance.editForm.marketplace = 'SHOPEE';
    fixture.detectChanges();
    expect(labels()).toEqual(jasmine.arrayContaining(baseLabels));
    expect(labels()).toContain('Garantia Shopee');
    fixture.destroy();
  });

  it('exposes the selected trust state with aria-pressed', () => {
    const fixture = create();
    fixture.componentInstance.toggleTrustSignal(TrustSignal.OFFICIAL_STORE);
    fixture.detectChanges();
    const chips = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.trust-chip'));
    const official = chips.find(button => button.textContent?.trim() === 'Oficial')!;
    expect(official.getAttribute('aria-pressed')).toBe('true');
    expect(fixture.componentInstance.editForm.officialStore).toBeTrue();
    fixture.destroy();
  });
});
