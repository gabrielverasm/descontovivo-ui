import { SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ModerationCategoryService } from '../../../../core/services/moderation-category.service';
import { PromotionDetailAdminComponent } from './promotion-detail-admin.component';

describe('PromotionDetailAdminComponent', () => {
  let fixture: ComponentFixture<PromotionDetailAdminComponent>;
  let component: PromotionDetailAdminComponent;
  let categories: jasmine.SpyObj<ModerationCategoryService>;

  beforeEach(() => {
    categories = jasmine.createSpyObj('ModerationCategoryService', ['list']);
    categories.list.and.returnValue(of([
      { name: 'Tecnologia', promotionCount: 12 },
    ]));
    TestBed.configureTestingModule({
      imports: [PromotionDetailAdminComponent],
      providers: [{ provide: ModerationCategoryService, useValue: categories }],
    });
    fixture = TestBed.createComponent(PromotionDetailAdminComponent);
    component = fixture.componentInstance;
  });

  it('loads categories and selects one into the edit form', () => {
    component.ngOnInit();
    component.selectCategory('Tecnologia');

    expect(categories.list).toHaveBeenCalled();
    expect(component.categories[0].promotionCount).toBe(12);
    expect(component.editForm.category).toBe('Tecnologia');
  });

  it('exposes loading errors and retries category loading', () => {
    categories.list.and.returnValue(throwError(() => new Error('offline')));
    component.loadCategories();
    expect(component.categoriesError).toBeTrue();

    categories.list.and.returnValue(of([]));
    component.loadCategories();
    expect(component.categoriesError).toBeFalse();
    expect(component.categories).toEqual([]);
  });

  it('syncs the store checkbox only when both parties match', () => {
    component.editForm = { ...component.editForm, storeName: 'Amazon', soldBy: ' amazon ', deliveredBy: 'AMAZON' };
    component.ngOnChanges({ editForm: new SimpleChange(null, component.editForm, true) });
    expect(component.soldAndDeliveredByStore).toBeTrue();

    component.editForm.deliveredBy = 'Transportadora';
    component.ngOnChanges({ editForm: new SimpleChange(null, component.editForm, true) });
    expect(component.soldAndDeliveredByStore).toBeFalse();
  });

  it('copies store and seller values without clearing them when unchecked', () => {
    component.editForm.storeName = 'Magalu';
    component.toggleSoldDelivered(true);
    expect(component.editForm.soldBy).toBe('Magalu');
    expect(component.editForm.deliveredBy).toBe('Magalu');

    component.toggleSoldDelivered(false);
    expect(component.editForm.soldBy).toBe('Magalu');
    expect(component.editForm.deliveredBy).toBe('Magalu');
    component.copySoldByToDeliveredBy();
    expect(component.editForm.deliveredBy).toBe(component.editForm.soldBy);
  });
});
