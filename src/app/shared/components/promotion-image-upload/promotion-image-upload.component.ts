import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FileFieldComponent } from '../file-field/file-field.component';

@Component({
  selector: 'app-promotion-image-upload',
  standalone: true,
  imports: [FileFieldComponent],
  templateUrl: './promotion-image-upload.component.html',
  styleUrl: './promotion-image-upload.component.scss',
})
export class PromotionImageUploadComponent {
  @Input() label = 'Trocar imagem';
  @Input() previewUrl: string | null = null;
  @Input() previewLabel = 'Nova imagem selecionada';
  @Input() sizeKB: number | null = null;
  @Input() statusText: string | null = null;
  @Input() error: string | null = null;
  @Input() accept = 'image/jpeg,image/png,image/webp';
  @Input() hint = 'JPG, PNG ou WebP. Máx. 5 MB.';
  @Input() name = 'image-upload';
  @Input() previewSize: 'compact' | 'moderation' = 'compact';
  @Input() disabled = false;
  @Output() fileSelected = new EventEmitter<File>();
  @Output() removed = new EventEmitter<void>();

  onFileSelected(file: File): void {
    if (this.disabled) return;
    this.fileSelected.emit(file);
  }

  onRemove(): void {
    this.removed.emit();
  }
}
