import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FloatingFieldComponent } from '../../../../shared/components/floating-field/floating-field.component';
import { PromotionImageUploadComponent } from '../../../../shared/components/promotion-image-upload/promotion-image-upload.component';

@Component({
  selector: 'app-promotion-detail-admin',
  standalone: true,
  imports: [FormsModule, FloatingFieldComponent, PromotionImageUploadComponent],
  templateUrl: './promotion-detail-admin.component.html',
  styleUrl: './promotion-detail-admin.component.scss',
})
export class PromotionDetailAdminComponent {
  @Input() isAdmin = false;
  @Input() isEditMode = false;
  @Input() isRemoveConfirm = false;
  @Input() isAdminSaving = false;
  @Input() adminMessage = '';
  @Input() adminError = '';
  @Input() editForm = { title: '', description: '', url: '', currentPrice: '', originalPrice: '', couponCode: '', storeSlug: '' };
  @Input() adminImagePreviewUrl: string | null = null;
  @Input() adminImageSizeKB: number | null = null;
  @Input() adminImageStatusText: string | null = null;
  @Input() adminImageError: string | null = null;

  @Output() openEdit = new EventEmitter<void>();
  @Output() cancelEdit = new EventEmitter<void>();
  @Output() submitEdit = new EventEmitter<void>();
  @Output() confirmRemove = new EventEmitter<void>();
  @Output() cancelRemove = new EventEmitter<void>();
  @Output() executeRemove = new EventEmitter<void>();
  @Output() imageSelected = new EventEmitter<File>();
  @Output() removeImage = new EventEmitter<void>();
}
