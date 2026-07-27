import { Component, inject } from '@angular/core';
import { Toast } from '../../../core/models/toast.model';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.scss',
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);

  roleFor(toast: Toast): 'status' | 'alert' {
    return toast.type === 'warning' || toast.type === 'error' ? 'alert' : 'status';
  }

  liveFor(toast: Toast): 'polite' | 'assertive' {
    return toast.type === 'warning' || toast.type === 'error' ? 'assertive' : 'polite';
  }

  iconFor(toast: Toast): string {
    return { success: '✓', error: '!', warning: '!', info: 'i' }[toast.type];
  }

  onFocusOut(toast: Toast, event: FocusEvent): void {
    const current = event.currentTarget as HTMLElement;
    const next = event.relatedTarget as Node | null;
    if (!next || !current.contains(next)) this.toastService.resume(toast.id, 'focus');
  }
}
