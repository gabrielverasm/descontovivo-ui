import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { parseBRLInputToNumber } from '../utils/money-input.util';
import { BrlCurrencyInputDirective } from './brl-currency-input.directive';

@Component({
  standalone: true,
  imports: [BrlCurrencyInputDirective],
  template: '<input aria-label="Preço" [appBrlCurrencyInput]="value" (appBrlCurrencyInputChange)="value = $event">',
})
class CurrencyHostComponent {
  value = '';
}

describe('BrlCurrencyInputDirective', () => {
  let fixture: ComponentFixture<CurrencyHostComponent>;
  let input: HTMLInputElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CurrencyHostComponent] });
    fixture = TestBed.createComponent(CurrencyHostComponent);
    fixture.detectChanges();
    input = fixture.nativeElement.querySelector('input');
  });

  function replaceSelection(text: string): void {
    input.setRangeText(text, input.selectionStart ?? 0, input.selectionEnd ?? 0, 'end');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  function setSelection(start: number, end = start): void {
    input.focus();
    input.setSelectionRange(start, end);
  }

  it('formats sequential typing and keeps the caret at the insertion point', () => {
    setSelection(0);
    for (const digit of '123456') {
      replaceSelection(digit);
      expect(input.selectionStart).toBe(input.value.length);
    }
    expect(input.value).toBe('R$\u00a01.234,56');
    expect(fixture.componentInstance.value).toBe('R$\u00a01.234,56');
    expect(parseBRLInputToNumber(fixture.componentInstance.value)).toBe(1234.56);
  });

  it('sanitizes pasted content and supports clearing the field', () => {
    setSelection(0);
    replaceSelection('abc R$ 12,34 xyz');
    expect(input.value).toBe('R$\u00a012,34');
    setSelection(0, input.value.length);
    replaceSelection('');
    expect(input.value).toBe('');
    expect(input.selectionStart).toBe(0);
  });

  it('supports insertion, Backspace, Delete and replacement in the middle', () => {
    fixture.componentInstance.value = 'R$\u00a01.234,56';
    fixture.detectChanges();

    const comma = input.value.indexOf(',');
    setSelection(comma);
    replaceSelection('9');
    expect(input.value).toBe('R$\u00a012.349,56');
    expect(input.selectionStart).toBe(input.value.indexOf(','));

    const digitFour = input.value.indexOf('4');
    setSelection(digitFour + 1);
    input.setRangeText('', digitFour, digitFour + 1, 'end');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(input.value).toBe('R$\u00a01.239,56');

    const digitThree = input.value.indexOf('3');
    setSelection(digitThree);
    input.setRangeText('', digitThree, digitThree + 1, 'end');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(input.value).toBe('R$\u00a0129,56');

    const start = input.value.indexOf('2');
    const end = input.value.indexOf(',');
    setSelection(start, end);
    replaceSelection('88');
    expect(input.value).toBe('R$\u00a0188,56');
    expect(input.selectionStart).toBe(input.value.indexOf(','));
  });
});
