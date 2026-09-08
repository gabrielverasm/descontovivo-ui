import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  templateUrl: './empty-state.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './empty-state.component.scss'
})
export class EmptyStateComponent {
  @Input() title = 'Nada encontrado';
  @Input() description = 'Tente ajustar os filtros ou voltar mais tarde.';
}
