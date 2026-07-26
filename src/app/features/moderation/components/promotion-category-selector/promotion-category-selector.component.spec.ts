import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Subject, of, throwError } from 'rxjs';
import { ModerationCategoryService } from '../../../../core/services/moderation-category.service';
import { PromotionCategorySelectorComponent } from './promotion-category-selector.component';

@Component({
  standalone: true,
  imports: [PromotionCategorySelectorComponent],
  template: `
    <form (submit)="submits = submits + 1">
      <app-promotion-category-selector selectorId="primary-categories" [selected]="selected" (selectedChange)="selected = $event" />
      <app-promotion-category-selector selectorId="secondary-categories" [selected]="other" (selectedChange)="other = $event" />
      <button type="submit">Enviar</button>
    </form>
  `,
})
class CategorySelectorHostComponent {
  selected = ['Casa', 'Games'];
  other: string[] = [];
  submits = 0;
}

describe('PromotionCategorySelectorComponent', () => {
  let fixture: ComponentFixture<PromotionCategorySelectorComponent>;
  let service: jasmine.SpyObj<ModerationCategoryService>;

  beforeEach(() => {
    service = jasmine.createSpyObj('ModerationCategoryService', ['list', 'rename']);
    service.list.and.returnValue(of([
      { name: 'Casa', promotionCount: 3 },
      { name: 'Eletrônicos', promotionCount: 7 },
      { name: 'Games', promotionCount: 2 },
    ]));
    service.rename.and.returnValue(of({ name: 'Lar', promotionCount: 3 }));
    TestBed.configureTestingModule({
      imports: [PromotionCategorySelectorComponent, CategorySelectorHostComponent],
      providers: [{ provide: ModerationCategoryService, useValue: service }],
    });
    fixture = TestBed.createComponent(PromotionCategorySelectorComponent);
    fixture.componentInstance.selectorId = 'isolated-categories';
    fixture.componentInstance.selected = ['Casa', 'Games'];
    fixture.detectChanges();
  });

  it('renders selected chips outside the panel button with real remove buttons', () => {
    const control = fixture.nativeElement.querySelector('.category-select__control') as HTMLButtonElement;
    expect(control.querySelector('button, input, [role="button"]')).toBeNull();
    const remove = fixture.nativeElement.querySelector('[aria-label="Remover categoria Casa"]') as HTMLButtonElement;
    expect(remove.tagName).toBe('BUTTON');
    expect(remove.type).toBe('button');
  });

  it('removes only the requested category without opening the panel', () => {
    const changes = spyOn(fixture.componentInstance.selectedChange, 'emit');
    const remove = fixture.nativeElement.querySelector('[aria-label="Remover categoria Casa"]') as HTMLButtonElement;
    remove.click();
    expect(changes).toHaveBeenCalledOnceWith(['Games']);
    expect(fixture.componentInstance.open).toBeFalse();
  });

  it('removes chips with the native Enter and Space button activation without submitting the form', () => {
    const hostFixture = TestBed.createComponent(CategorySelectorHostComponent);
    hostFixture.detectChanges();
    const activate = (button: HTMLButtonElement, key: 'Enter' | ' ') => {
      const down = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      button.dispatchEvent(down);
      if (!down.defaultPrevented) button.click();
      button.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
      hostFixture.detectChanges();
    };

    activate(hostFixture.nativeElement.querySelector('[aria-label="Remover categoria Casa"]'), 'Enter');
    expect(hostFixture.componentInstance.selected).toEqual(['Games']);
    activate(hostFixture.nativeElement.querySelector('[aria-label="Remover categoria Games"]'), ' ');
    expect(hostFixture.componentInstance.selected).toEqual([]);
    expect(hostFixture.componentInstance.submits).toBe(0);
  });

  it('filters categories while searching and has no delete action', () => {
    fixture.componentInstance.open = true;
    fixture.componentInstance.search = 'ele';
    fixture.detectChanges();
    const list = fixture.nativeElement.querySelector('.category-select__list') as HTMLElement;
    expect(list.textContent).toContain('Eletrônicos');
    expect(list.textContent).not.toContain('Games');
    expect(fixture.nativeElement.querySelector('[aria-label^="Excluir categoria"]')).toBeNull();
  });

  it('starts editing without changing selection or opening/closing the panel', () => {
    fixture.componentInstance.open = true;
    fixture.detectChanges();
    const changes = spyOn(fixture.componentInstance.selectedChange, 'emit');
    (fixture.nativeElement.querySelector('[aria-label="Editar categoria Casa"]') as HTMLButtonElement).click();
    expect(fixture.componentInstance.open).toBeTrue();
    expect(fixture.componentInstance.editing).toBe('Casa');
    expect(changes).not.toHaveBeenCalled();
  });

  it('renames on Enter, prevents form submission and updates the selected chip', () => {
    const hostFixture = TestBed.createComponent(CategorySelectorHostComponent);
    hostFixture.detectChanges();
    const selector = hostFixture.debugElement.queryAll(By.directive(PromotionCategorySelectorComponent))[0]
      .componentInstance as PromotionCategorySelectorComponent;
    selector.open = true;
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
    expect(hostFixture.componentInstance.selected).toEqual(['Lar', 'Games']);
  });

  it('keeps the typed name and exposes feedback when rename fails', () => {
    service.rename.and.returnValue(throwError(() => ({ error: { message: 'Nome já existe.' } })));
    fixture.componentInstance.open = true;
    fixture.detectChanges();
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

  it('cancels rename with Escape without changing selection', () => {
    fixture.componentInstance.open = true;
    fixture.detectChanges();
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

  it('blocks repeated rename actions while the request is pending', async () => {
    const pending = new Subject<any>();
    service.rename.and.returnValue(pending);
    fixture.componentInstance.open = true;
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[aria-label="Editar categoria Casa"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('[aria-label="Novo nome da categoria"]') as HTMLInputElement;
    input.value = 'Lar';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    (fixture.nativeElement.querySelector('[aria-label="Salvar nome"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('[aria-label="Novo nome da categoria"]') as HTMLInputElement).disabled).toBeTrue();
    expect((fixture.nativeElement.querySelector('[aria-label="Salvar nome"]') as HTMLButtonElement).disabled).toBeTrue();
    fixture.componentInstance.saveEdit('Casa');
    expect(service.rename).toHaveBeenCalledTimes(1);
  });

  it('uses unique label and panel ids for multiple instances', () => {
    const hostFixture = TestBed.createComponent(CategorySelectorHostComponent);
    hostFixture.detectChanges();
    const controls = Array.from(hostFixture.nativeElement.querySelectorAll('.category-select__control')) as HTMLButtonElement[];
    expect(controls.length).toBe(2);
    expect(controls[0].getAttribute('aria-controls')).not.toBe(controls[1].getAttribute('aria-controls'));
    expect(controls[0].getAttribute('aria-labelledby')).not.toBe(controls[1].getAttribute('aria-labelledby'));
    expect(controls[0].getAttribute('aria-controls')).toBe('primary-categories-panel');
    expect(controls[1].getAttribute('aria-controls')).toBe('secondary-categories-panel');
    expect(hostFixture.nativeElement.querySelectorAll('#primary-categories-label').length).toBe(1);
    expect(hostFixture.nativeElement.querySelectorAll('#secondary-categories-label').length).toBe(1);
    controls.forEach(control => {
      const labelId = control.getAttribute('aria-labelledby')!;
      expect(hostFixture.nativeElement.querySelector(`[id="${labelId}"]`)).not.toBeNull();
      control.click();
      hostFixture.detectChanges();
      const panelId = control.getAttribute('aria-controls')!;
      expect(hostFixture.nativeElement.querySelector(`[id="${panelId}"]`)).not.toBeNull();
      control.click();
      hostFixture.detectChanges();
    });
  });

  it('opens and closes without changing categories', () => {
    const changes = spyOn(fixture.componentInstance.selectedChange, 'emit');
    fixture.componentInstance.togglePanel();
    fixture.componentInstance.close();
    expect(changes).not.toHaveBeenCalled();
    expect(fixture.componentInstance.selected).toEqual(['Casa', 'Games']);
  });
});
