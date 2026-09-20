import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-sponsored-label',
  standalone: true,
  templateUrl: './sponsored-label.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './sponsored-label.component.scss',
})
export class SponsoredLabelComponent {}
