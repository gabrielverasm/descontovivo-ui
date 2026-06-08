import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-publish-promotion',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent],
  templateUrl: './publish-promotion.component.html',
  styleUrl: './publish-promotion.component.scss'
})
export class PublishPromotionComponent {
  title = '';
}
