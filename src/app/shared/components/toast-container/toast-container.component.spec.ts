import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastService } from '../../../core/services/toast.service';
import { ToastContainerComponent } from './toast-container.component';

describe('ToastContainerComponent', () => {
  let fixture: ComponentFixture<ToastContainerComponent>;
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ToastContainerComponent] });
    fixture = TestBed.createComponent(ToastContainerComponent);
    service = TestBed.inject(ToastService);
  });

  it('uses polite status semantics for success and assertive alert semantics for errors', () => {
    service.success('Tudo certo');
    service.error('Algo falhou');
    fixture.detectChanges();
    const toasts = fixture.nativeElement.querySelectorAll('.toast') as NodeListOf<HTMLElement>;
    expect(toasts[0].getAttribute('role')).toBe('alert');
    expect(toasts[0].getAttribute('aria-live')).toBe('assertive');
    expect(toasts[1].getAttribute('role')).toBe('status');
    expect(toasts[1].getAttribute('aria-live')).toBe('polite');
  });

  it('closes from the accessible button', () => {
    service.info('Informação');
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('[aria-label="Fechar notificação"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(service.toasts()).toEqual([]);
  });
});
