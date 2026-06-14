import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-publish-promotion',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './publish-promotion.component.html',
  styleUrl: './publish-promotion.component.scss'
})
export class PublishPromotionComponent {
  title = '';
}
