import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { ModerationCategoryService } from '../../../../core/services/moderation-category.service';
import { PromotionCategorySelectorComponent } from './promotion-category-selector.component';

@Component({
  standalone: true,
  imports: [PromotionCategorySelectorComponent],
  template: `
    <form (submit)="submits = submits + 1">
      <app-promotion-category-selector [selected]="selected" (selectedChange)="selected = $event" />
      <button type="submit">Enviar</button>
    </form>
  `,
})
class CategorySelectorHostComponent {
  selected = ['Games', 'Casa'];
  submits = 0;
}

describe('PromotionCategorySelectorComponent', () => {
  let fixture: ComponentFixture<PromotionCategorySelectorComponent>;
  let service: jasmine.SpyObj<ModerationCategoryService>;

  beforeEach(() => {
    service = jasmine.createSpyObj('ModerationCategoryService', ['list', 'rename']);
    service.list.and.returnValue(of([
      { name: 'Eletrônicos', promotionCount: 7 },
      { name: 'Casa', promotionCount: 3 },
      { name: 'Bebidas', promotionCount: 8 },
      { name: 'Games', promotionCount: 2 },
    ]));
    service.rename.and.returnValue(of({ name: 'Lar', promotionCount: 3 }));
    TestBed.configureTestingModule({
      imports: [PromotionCategorySelectorComponent, CategorySelectorHostComponent],
      providers: [{ provide: ModerationCategoryService, useValue: service }],
    });
    fixture = TestBed.createComponent(PromotionCategorySelectorComponent);
    fixture.componentInstance.selected = ['Games', 'Casa'];
    fixture.detectChanges();
  });

  const itemNames = (element: HTMLElement): string[] =>
    Array.from(element.querySelectorAll('.category-select__name')).map(item => item.textContent?.trim() || '');

  it('renders every category inside one contained, scrollable list without dropdown remnants', () => {
    expect(itemNames(fixture.nativeElement)).toEqual(['Games', 'Casa', 'Bebidas', 'Eletrônicos']);
    expect(fixture.nativeElement.querySelector('.category-select__viewport')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.category-select__panel')).toBeNull();
    expect(fixture.nativeElement.querySelector('.category-select__chips')).toBeNull();
    expect(fixture.nativeElement.querySelector('.category-select__search')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Selecionar mais categorias');
    expect(fixture.nativeElement.textContent).not.toContain('⌄');
    expect(getComputedStyle(fixture.nativeElement.querySelector('.category-select__viewport')).overflowY).toBe('auto');
    expect(getComputedStyle(fixture.nativeElement.querySelector('.category-select__item')).minHeight).toBe('32px');
  });

  it('shows the search field above the list with the plus button beside it', () => {
    const viewport = fixture.nativeElement.querySelector('.category-select__viewport') as HTMLElement;
    const search = viewport.querySelector('.category-select__search') as HTMLElement;
    expect(search.querySelector('input')?.getAttribute('placeholder')).toBe('Pesquisar ou adicionar categoria');
    expect(search.querySelector('button')?.textContent?.trim()).toBe('+');
    expect(viewport.firstElementChild).toBe(search);
  });

  it('filters without changing selection and ignores case and accents', () => {
    fixture.componentInstance.search = 'eleTRONI';
    fixture.detectChanges();
    expect(itemNames(fixture.nativeElement)).toEqual(['Eletrônicos']);
    expect(fixture.componentInstance.selected).toEqual(['Games', 'Casa']);

    fixture.componentInstance.search = 'beb';
    fixture.detectChanges();
    expect(itemNames(fixture.nativeElement)).toEqual(['Bebidas']);
  });

  it('disables addition for empty or already selected values', () => {
    const button = () => fixture.nativeElement.querySelector('.category-select__search button') as HTMLButtonElement;
    expect(button().disabled).toBeTrue();
    fixture.componentInstance.search = '  casa  ';
    fixture.detectChanges();
    expect(button().disabled).toBeTrue();
    expect(button().title).toBe('Categoria já selecionada');
  });

  it('selects a canonical existing category without duplicating or calling the API', () => {
    const changes = spyOn(fixture.componentInstance.selectedChange, 'emit');
    fixture.componentInstance.search = '  BEBÍDAS ';
    fixture.componentInstance.addOrSelect();
    expect(changes).toHaveBeenCalledWith(['Games', 'Casa', 'Bebidas']);
    expect(service.list).toHaveBeenCalledTimes(1);
    expect(service.rename).not.toHaveBeenCalled();
  });

  it('creates and selects a normalized local category with zero promotions', () => {
    const changes = spyOn(fixture.componentInstance.selectedChange, 'emit');
    fixture.componentInstance.search = '  Casa   e   Jardim  ';
    fixture.componentInstance.addOrSelect();
    const local = fixture.componentInstance.categories.find(category => category.name === 'Casa e Jardim');
    expect(local).toEqual({ name: 'Casa e Jardim', promotionCount: 0 });
    expect(changes).toHaveBeenCalledWith(['Games', 'Casa', 'Casa e Jardim']);
    expect(fixture.componentInstance.search).toBe('');
    expect(service.list).toHaveBeenCalledTimes(1);
  });

  it('handles Enter without submitting and Escape without changing selection', () => {
    const hostFixture = TestBed.createComponent(CategorySelectorHostComponent);
    hostFixture.detectChanges();
    const input = hostFixture.nativeElement.querySelector('.category-select__search input') as HTMLInputElement;
    input.value = 'Nova categoria';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    input.dispatchEvent(enter);
    hostFixture.detectChanges();
    expect(enter.defaultPrevented).toBeTrue();
    expect(hostFixture.componentInstance.submits).toBe(0);
    expect(hostFixture.componentInstance.selected).toEqual(['Games', 'Casa', 'Nova categoria']);

    input.value = 'texto';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    hostFixture.detectChanges();
    expect(input.value).toBe('');
    expect(hostFixture.componentInstance.selected).toEqual(['Games', 'Casa', 'Nova categoria']);
  });

  it('keeps selected categories in input order and sorts the remainder alphabetically', () => {
    expect(fixture.componentInstance.orderedCategories.map(category => category.name))
      .toEqual(['Games', 'Casa', 'Bebidas', 'Eletrônicos']);
  });

  it('adds a new selection to the end of the selected block', () => {
    const hostFixture = TestBed.createComponent(CategorySelectorHostComponent);
    hostFixture.detectChanges();
    const choices = Array.from(hostFixture.nativeElement.querySelectorAll('.category-select__choice')) as HTMLLabelElement[];
    const checkbox = choices
      .find(label => label.textContent?.includes('Bebidas'))!
      .querySelector('input') as HTMLInputElement;
    checkbox.click();
    hostFixture.detectChanges();

    expect(hostFixture.componentInstance.selected).toEqual(['Games', 'Casa', 'Bebidas']);
    expect(itemNames(hostFixture.nativeElement)).toEqual(['Games', 'Casa', 'Bebidas', 'Eletrônicos']);
  });

  it('returns an unselected category to the alphabetized block', () => {
    const hostFixture = TestBed.createComponent(CategorySelectorHostComponent);
    hostFixture.detectChanges();
    const choices = Array.from(hostFixture.nativeElement.querySelectorAll('.category-select__choice')) as HTMLLabelElement[];
    const checkbox = choices
      .find(label => label.textContent?.includes('Games'))!
      .querySelector('input') as HTMLInputElement;
    checkbox.click();
    hostFixture.detectChanges();

    expect(hostFixture.componentInstance.selected).toEqual(['Casa']);
    expect(itemNames(hostFixture.nativeElement)).toEqual(['Casa', 'Bebidas', 'Eletrônicos', 'Games']);
  });

  it('starts editing from the pencil without changing selection', () => {
    const changes = spyOn(fixture.componentInstance.selectedChange, 'emit');
    (fixture.nativeElement.querySelector('[aria-label="Editar categoria Casa"]') as HTMLButtonElement).click();

    expect(fixture.componentInstance.editing).toBe('Casa');
    expect(changes).not.toHaveBeenCalled();
  });

  it('renames on Enter without submitting and preserves the selected position', () => {
    const hostFixture = TestBed.createComponent(CategorySelectorHostComponent);
    hostFixture.detectChanges();
    (hostFixture.nativeElement.querySelector('[aria-label="Editar categoria Casa"]') as HTMLButtonElement).click();
    hostFixture.detectChanges();
    const input = hostFixture.nativeElement.querySelector('[aria-label="Novo nome da categoria"]') as HTMLInputElement;
    input.value = 'Lar';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    input.dispatchEvent(event);
    hostFixture.detectChanges();

    expect(event.defaultPrevented).toBeTrue();
    expect(hostFixture.componentInstance.submits).toBe(0);
    expect(service.rename).toHaveBeenCalledWith('Casa', 'Lar');
    expect(hostFixture.componentInstance.selected).toEqual(['Games', 'Lar']);
    expect(itemNames(hostFixture.nativeElement).slice(0, 2)).toEqual(['Games', 'Lar']);
  });

  it('cancels rename with Escape and keeps the selection unchanged', () => {
    const changes = spyOn(fixture.componentInstance.selectedChange, 'emit');
    (fixture.nativeElement.querySelector('[aria-label="Editar categoria Casa"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('[aria-label="Novo nome da categoria"]') as HTMLInputElement;
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    input.dispatchEvent(event);
    fixture.detectChanges();

    expect(event.defaultPrevented).toBeTrue();
    expect(fixture.componentInstance.editing).toBeNull();
    expect(changes).not.toHaveBeenCalled();
  });

  it('preserves rename errors and typed values', () => {
    service.rename.and.returnValue(throwError(() => ({ error: { message: 'Nome já existe.' } })));
    (fixture.nativeElement.querySelector('[aria-label="Editar categoria Casa"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('[aria-label="Novo nome da categoria"]') as HTMLInputElement;
    input.value = 'Lar';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    (fixture.nativeElement.querySelector('[aria-label="Salvar nome"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.editing).toBe('Casa');
    expect(fixture.componentInstance.editingName).toBe('Lar');
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Nome já existe.');
  });

  it('disables repeated rename actions while loading and respects the disabled input', async () => {
    const pending = new Subject<any>();
    service.rename.and.returnValue(pending);
    (fixture.nativeElement.querySelector('[aria-label="Editar categoria Casa"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('[aria-label="Novo nome da categoria"]') as HTMLInputElement;
    input.value = 'Lar';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    (fixture.nativeElement.querySelector('[aria-label="Salvar nome"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.renaming).toBeTrue();
    expect(
      (fixture.nativeElement.querySelector('[aria-label="Salvar nome"]') as HTMLButtonElement).disabled,
    ).toBeTrue();
    fixture.componentInstance.saveEdit('Casa');
    expect(service.rename).toHaveBeenCalledTimes(1);

    pending.next({ name: 'Lar', promotionCount: 3 });
    pending.complete();
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();
    expect(Array.from(fixture.nativeElement.querySelectorAll('input[type="checkbox"]'))
      .every((checkbox: any) => checkbox.disabled)).toBeTrue();
  });

  it('shows loading and load errors inside the category container', () => {
    const pending = new Subject<any>();
    service.list.and.returnValue(pending);
    const loadingFixture = TestBed.createComponent(PromotionCategorySelectorComponent);
    loadingFixture.detectChanges();
    expect(loadingFixture.nativeElement.querySelector('.category-select__viewport').textContent).toContain('Carregando');

    pending.error(new Error('offline'));
    loadingFixture.detectChanges();
    expect(loadingFixture.nativeElement.querySelector('[role="alert"]').textContent)
      .toContain('Não foi possível carregar as categorias');
  });
});
