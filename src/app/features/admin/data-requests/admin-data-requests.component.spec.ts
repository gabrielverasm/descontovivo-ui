import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminDataRequestService } from '../../../core/services/admin-data-request.service';
import { SeoService } from '../../../core/services/seo.service';
import { ToastService } from '../../../core/services/toast.service';
import { AdminDataRequestsComponent } from './admin-data-requests.component';

describe('AdminDataRequestsComponent operational feedback', () => {
  let service: jasmine.SpyObj<AdminDataRequestService>;
  let component: AdminDataRequestsComponent;

  beforeEach(() => {
    service = jasmine.createSpyObj('AdminDataRequestService', ['list', 'updateStatus']);
    service.list.and.returnValue(of([]));
    TestBed.configureTestingModule({
      providers: [
        { provide: AdminDataRequestService, useValue: service },
        { provide: SeoService, useValue: jasmine.createSpyObj('SeoService', ['setNoIndex']) },
      ],
    });
    component = TestBed.runInInjectionContext(() => new AdminDataRequestsComponent());
  });

  it('keeps the required resolution note inline', () => {
    component.updateTargetId = 'request-1';
    component.updateTargetStatus = 'COMPLETED';
    component.confirmUpdate();
    expect(component.updateError).toContain('obrigatória');
    expect(TestBed.inject(ToastService).toasts()).toEqual([]);
  });

  it('shows successful updates in a success toast', () => {
    service.updateStatus.and.returnValue(of({} as any));
    component.updateTargetId = 'request-1';
    component.updateTargetStatus = 'IN_REVIEW';
    component.showUpdateModal = true;
    component.confirmUpdate();
    expect(TestBed.inject(ToastService).toasts()[0]).toEqual(jasmine.objectContaining({
      type: 'success',
      message: 'Solicitação atualizada com sucesso.',
    }));
  });

  it('uses warning for an update refused because it was finalized', () => {
    service.updateStatus.and.returnValue(throwError(() => ({ status: 400 })));
    component.updateTargetId = 'request-1';
    component.updateTargetStatus = 'IN_REVIEW';
    component.showUpdateModal = true;
    component.confirmUpdate();
    expect(TestBed.inject(ToastService).toasts()[0]).toEqual(jasmine.objectContaining({
      type: 'warning',
      message: 'Não foi possível atualizar. Verifique se a solicitação já foi finalizada.',
    }));
    expect(component.showUpdateModal).toBeTrue();
  });
});
