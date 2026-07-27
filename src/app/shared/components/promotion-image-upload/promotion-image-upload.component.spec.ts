import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PromotionImageUploadComponent } from './promotion-image-upload.component';

describe('PromotionImageUploadComponent', () => {
  let fixture: ComponentFixture<PromotionImageUploadComponent>;
  let component: PromotionImageUploadComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PromotionImageUploadComponent] });
    fixture = TestBed.createComponent(PromotionImageUploadComponent);
    component = fixture.componentInstance;
    component.label = 'Imagem do produto *';
    fixture.detectChanges();
  });

  it('shows the complete file selector when there is no image', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-file-field')).not.toBeNull();
    expect(element.textContent).toContain('Imagem do produto *');
    expect(element.textContent).toContain('JPG, PNG ou WebP. Máx. 5 MB.');
    expect(element.querySelector('.promotion-image-upload__preview')).toBeNull();
  });

  it('shows only the image and overlay actions when an image exists', () => {
    component.previewUrl = 'https://img.example.com/product.webp';
    component.statusText = 'Imagem selecionada';
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.promotion-image-upload__preview img')).not.toBeNull();
    expect(element.querySelector('[aria-label="Alterar imagem"]')).not.toBeNull();
    expect(element.querySelector('[aria-label="Remover imagem"]')).not.toBeNull();
    expect(element.querySelector('app-file-field')).toBeNull();
    expect(element.textContent).not.toContain('Remover imagem selecionada');
    expect(element.textContent).not.toContain('Imagem do produto');
    expect(element.textContent).not.toContain('Escolher arquivo');
    expect(element.textContent).not.toContain('JPG, PNG ou WebP. Máx. 5 MB.');
    expect(element.textContent).not.toContain('Imagem selecionada');
  });

  it('opens the hidden JPEG, PNG and WebP input and permits reopening it', () => {
    component.previewUrl = 'blob:preview';
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('.promotion-image-upload__hidden-input') as HTMLInputElement;
    const click = spyOn(input, 'click');
    const pencil = fixture.nativeElement.querySelector('[aria-label="Alterar imagem"]') as HTMLButtonElement;

    pencil.click();
    pencil.click();

    expect(input.accept).toBe('image/jpeg,image/png,image/webp');
    expect(click).toHaveBeenCalledTimes(2);
  });

  it('provides visible tooltip content without relying on title', () => {
    component.previewUrl = 'blob:preview';
    fixture.detectChanges();
    const pencil = fixture.nativeElement.querySelector('[aria-label="Alterar imagem"]') as HTMLButtonElement;
    const remove = fixture.nativeElement.querySelector('[aria-label="Remover imagem"]') as HTMLButtonElement;

    expect(pencil.getAttribute('title')).toBeNull();
    expect(pencil.querySelector('[role="tooltip"]')?.textContent)
      .toContain('Alterar imagem — JPG, PNG ou WebP, máximo 5 MB');
    expect(remove.querySelector('[role="tooltip"]')?.textContent).toContain('Remover imagem');
  });

  it('emits removal and disables both image actions while busy', () => {
    component.previewUrl = 'blob:preview';
    const removed = spyOn(component.removed, 'emit');
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[aria-label="Remover imagem"]') as HTMLButtonElement).click();
    expect(removed).toHaveBeenCalled();

    component.disabled = true;
    fixture.detectChanges();
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('.promotion-image-upload__action')) as HTMLButtonElement[];
    expect(buttons.every(button => button.disabled)).toBeTrue();
  });
});
