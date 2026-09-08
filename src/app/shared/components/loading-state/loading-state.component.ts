import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  templateUrl: './loading-state.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './loading-state.component.scss'
})
export class LoadingStateComponent {
  @Input() label = 'Carregando promoções';
}
