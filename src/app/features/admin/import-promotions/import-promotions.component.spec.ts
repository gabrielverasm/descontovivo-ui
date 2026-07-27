import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminImportService } from '../../../core/services/admin-import.service';
import { SeoService } from '../../../core/services/seo.service';
import { ToastService } from '../../../core/services/toast.service';
import { ImportPromotionsComponent } from './import-promotions.component';

describe('ImportPromotionsComponent operational feedback', () => {
  let service: jasmine.SpyObj<AdminImportService>;
  let component: ImportPromotionsComponent;

  beforeEach(() => {
    service = jasmine.createSpyObj('AdminImportService', ['import']);
    TestBed.configureTestingModule({
      providers: [
        { provide: AdminImportService, useValue: service },
        { provide: SeoService, useValue: jasmine.createSpyObj('SeoService', ['setNoIndex']) },
      ],
    });
    component = TestBed.runInInjectionContext(() => new ImportPromotionsComponent());
    component.jsonText = JSON.stringify({ batchId: 'batch', items: [{}] });
  });

  it('shows completed imports as success toasts while retaining the result summary', () => {
    service.import.and.returnValue(of({ batchId: 'batch', dryRun: false, created: 1, skipped: 0, errors: [] }));
    component.importar();
    expect(TestBed.inject(ToastService).toasts()[0]).toEqual(jasmine.objectContaining({
      type: 'success',
      message: 'Importação concluída com sucesso.',
    }));
    expect(component.result?.created).toBe(1);
  });

  it('shows HTTP failures as error toasts without replacing JSON validation', () => {
    service.import.and.returnValue(throwError(() => ({ status: 503, message: 'Indisponível' })));
    component.importar();
    expect(TestBed.inject(ToastService).toasts()[0]).toEqual(jasmine.objectContaining({
      type: 'error',
      message: 'Indisponível',
    }));
    component.jsonText = '{';
    component.validateJson();
    expect(component.parseError).toContain('JSON inválido');
  });
});
