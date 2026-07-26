import { Directive, ElementRef, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';
import { formatCentsToBRL, onlyDigits } from '../utils/money-input.util';

@Directive({
  selector: 'input[appBrlCurrencyInput]',
  standalone: true,
})
export class BrlCurrencyInputDirective {
  private readonly input = inject(ElementRef<HTMLInputElement>).nativeElement;

  @Input()
  set appBrlCurrencyInput(value: string | null | undefined) {
    const next = value || '';
    if (this.input.value !== next) this.input.value = next;
  }

  @Output() appBrlCurrencyInputChange = new EventEmitter<string>();

  @HostListener('input')
  onInput(): void {
    const raw = this.input.value;
    const rawStart = this.input.selectionStart ?? raw.length;
    const rawEnd = this.input.selectionEnd ?? raw.length;
    const startDigitsToRight = this.countDigits(raw.slice(rawStart));
    const endDigitsToRight = this.countDigits(raw.slice(rawEnd));
    const digits = onlyDigits(raw);
    const formatted = digits ? formatCentsToBRL(digits) : '';

    this.input.value = formatted;
    const start = this.caretBeforeRightDigits(formatted, startDigitsToRight, raw, rawStart);
    const end = this.caretBeforeRightDigits(formatted, endDigitsToRight, raw, rawEnd);
    this.input.setSelectionRange(start, end);
    this.appBrlCurrencyInputChange.emit(formatted);
  }

  private countDigits(value: string): number {
    return onlyDigits(value).length;
  }

  private caretBeforeRightDigits(value: string, digitCount: number, raw: string, rawCaret: number): number {
    if (!value || digitCount <= 0) return value.length;
    let seen = 0;
    for (let index = value.length - 1; index >= 0; index -= 1) {
      if (!/\d/.test(value[index])) continue;
      seen += 1;
      if (seen === digitCount) {
        let caret = index;
        if (rawCaret < raw.length && /\D/.test(raw[rawCaret])) {
          while (caret > 0 && /\D/.test(value[caret - 1])) caret -= 1;
        }
        return caret;
      }
    }
    const firstDigit = value.search(/\d/);
    return firstDigit < 0 ? 0 : firstDigit;
  }
}
