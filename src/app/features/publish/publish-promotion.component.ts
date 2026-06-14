import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { FileFieldComponent } from '../../shared/components/file-field/file-field.component';
import { FloatingFieldComponent } from '../../shared/components/floating-field/floating-field.component';

@Component({
  selector: 'app-publish-promotion',
  standalone: true,
  imports: [FormsModule, BreadcrumbComponent, FloatingFieldComponent, FileFieldComponent],
  templateUrl: './publish-promotion.component.html',
  styleUrl: './publish-promotion.component.scss'
})
export class PublishPromotionComponent {
  title = '';
}
