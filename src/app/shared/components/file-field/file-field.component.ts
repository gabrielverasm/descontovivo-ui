import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-file-field',
  standalone: true,
  imports: [],
  templateUrl: './file-field.component.html',
  styleUrl: './file-field.component.scss',
})
export class FileFieldComponent {
  @Input() label = '';
  @Input() name = '';
  @Input() accept = '';
  @Input() hint = '';
  @Input() required = false;
  @Input() ariaDescribedby: string | null = null;
  @Input() previewUrl: string | null = null;
  @Input() sizeKB: number | null = null;
  @Input() statusText: string | null = null;
  @Input() error: string | null = null;
  @Output() fileSelected = new EventEmitter<File>();

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.fileSelected.emit(file);
    }
  }
}
