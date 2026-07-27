import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { AccountDataService } from '../../core/services/account-data.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { AccountComponent } from './account.component';

describe('AccountComponent operational feedback', () => {
  let data: jasmine.SpyObj<AccountDataService>;
  let component: AccountComponent;

  beforeEach(() => {
    data = jasmine.createSpyObj('AccountDataService', ['createDataRequest', 'getMyDataRequests']);
    data.getMyDataRequests.and.returnValue(of([]));
    TestBed.configureTestingModule({
      providers: [
        { provide: AccountDataService, useValue: data },
        { provide: AuthService, useValue: { currentUser$: of(null), logout: jasmine.createSpy('logout') } },
        { provide: SeoService, useValue: jasmine.createSpyObj('SeoService', ['setNonIndexable']) },
      ],
    });
    component = TestBed.runInInjectionContext(() => new AccountComponent());
  });

  it('keeps request-type validation inline', () => {
    component.submitRequest();
    expect(component.requestTypeError).toBe('Selecione o tipo de solicitação.');
    expect(TestBed.inject(ToastService).toasts()).toEqual([]);
    expect(data.createDataRequest).not.toHaveBeenCalled();
  });

  it('shows API success as a toast and preserves the successful reset', () => {
    data.createDataRequest.and.returnValue(of({ message: 'Solicitação enviada.' } as any));
    component.requestType = 'ACCESS';
    component.requestDetails = 'Detalhes';
    component.submitRequest();
    expect(TestBed.inject(ToastService).toasts()[0]).toEqual(jasmine.objectContaining({
      type: 'success',
      message: 'Solicitação enviada.',
    }));
    expect(component.requestType).toBe('');
    expect(component.requestDetails).toBe('');
  });

  it('shows failures as error toasts without clearing the form', () => {
    data.createDataRequest.and.returnValue(throwError(() => ({ status: 500 })));
    component.requestType = 'CORRECTION';
    component.requestDetails = 'Manter';
    component.submitRequest();
    expect(TestBed.inject(ToastService).toasts()[0]).toEqual(jasmine.objectContaining({
      type: 'error',
      message: 'Não foi possível enviar a solicitação. Tente novamente.',
    }));
    expect(component.requestType).toBe('CORRECTION');
    expect(component.requestDetails).toBe('Manter');
  });
});
