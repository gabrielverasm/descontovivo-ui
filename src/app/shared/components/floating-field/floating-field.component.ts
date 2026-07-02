import { Component, EventEmitter, forwardRef, Input, Output } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-floating-field',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './floating-field.component.html',
  styleUrl: './floating-field.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FloatingFieldComponent),
      multi: true
    }
  ]
})
export class FloatingFieldComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() name = '';
  @Input() type = 'text';
  @Input() inputmode: string | null = null;
  @Input() autocomplete = 'off';
  @Input() required = false;
  @Input() min: string | number | null = null;
  @Input() textarea = false;
  @Input() ariaLabel: string | null = null;
  @Input() rows = 3;

  value = '';
  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  @Output() valueChange = new EventEmitter<string>();

  onInput(event: Event) {
    const val = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.value = val;
    this.onChange(val);
    this.valueChange.emit(val);
  }

  onBlur() {
    this.onTouched();
  }

  writeValue(val: string) {
    this.value = val ?? '';
  }

  registerOnChange(fn: (v: string) => void) {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }
}
