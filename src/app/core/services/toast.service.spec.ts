import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  it('adds success and error messages newest first and limits the list to three', () => {
    service.success('Sucesso');
    service.error('Erro');
    service.info('Informação');
    service.warning('Aviso');
    expect(service.toasts().map(toast => toast.message)).toEqual(['Aviso', 'Informação', 'Erro']);
  });

  it('avoids a repeated message in a short interval', () => {
    service.success('Salvo');
    service.success('Salvo');
    expect(service.toasts().length).toBe(1);
  });

  [
    { type: 'success' as const, duration: 5_000 },
    { type: 'info' as const, duration: 5_000 },
    { type: 'warning' as const, duration: 7_000 },
    { type: 'error' as const, duration: 8_000 },
  ].forEach(({ type, duration }) => {
    it(`closes ${type} after ${duration} ms`, fakeAsync(() => {
      service.show(type, type);
      tick(duration - 1);
      expect(service.toasts().length).toBe(1);
      tick(1);
      expect(service.toasts().length).toBe(0);
    }));
  });

  it('pauses and resumes for hover or focus', fakeAsync(() => {
    service.success('Pausável');
    const id = service.toasts()[0].id;
    tick(2_000);
    service.pause(id, 'hover');
    tick(5_000);
    expect(service.toasts().length).toBe(1);
    service.resume(id, 'hover');
    tick(2_999);
    expect(service.toasts().length).toBe(1);
    tick(1);
    expect(service.toasts().length).toBe(0);
  }));

  it('keeps the timer paused while keyboard focus remains inside', fakeAsync(() => {
    service.warning('Revise os dados');
    const id = service.toasts()[0].id;
    service.pause(id, 'focus');
    tick(7_000);
    expect(service.toasts().length).toBe(1);
    service.resume(id, 'focus');
    tick(7_000);
    expect(service.toasts().length).toBe(0);
  }));

  it('dismisses immediately', () => {
    service.info('Fechar');
    service.dismiss(service.toasts()[0].id);
    expect(service.toasts()).toEqual([]);
  });
});
