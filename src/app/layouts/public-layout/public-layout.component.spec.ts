import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { BehaviorSubject, of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { PublicNotificationStreamService } from '../../core/services/public-notification-stream.service';
import { ModerationNotificationStreamService } from '../../core/services/moderation-notification-stream.service';
import { AdminNotificationStreamService } from '../../core/services/admin-notification-stream.service';
import { VersionService } from '../../core/services/version.service';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { PublicLayoutComponent } from './public-layout.component';

describe('PublicLayoutComponent moderation navigation', () => {
  let fixture: ComponentFixture<PublicLayoutComponent>;
  let user$: BehaviorSubject<any>;
  let publicState$: BehaviorSubject<any>;
  let adminState$: BehaviorSubject<any>;
  let titleService: jasmine.SpyObj<Title>;

  beforeEach(() => {
    user$ = new BehaviorSubject<any>({ id: 'u1', username: 'moderador', roles: ['moderator'] });
    const auth = { currentUser$: user$.asObservable(), authReady$: of(true) };
    publicState$ = new BehaviorSubject({
      connected: true, error: false, publishedCount: 3, latestPromotionId: 'p3',
      latestPublishedAt: null, newPromotionsCount: 2, newPromotionsCountIsLowerBound: false,
    });
    const publicStream = {
      state$: publicState$, connect: jasmine.createSpy(), disconnect: jasmine.createSpy(),
      formatCount: (count: number, lowerBound: boolean) => count > 99 ? '99+' : `${count}${lowerBound ? '+' : ''}`,
    };
    const moderationStream = { state$: of({ connected: true, error: false, moderationPendingCount: 4 }), connect: jasmine.createSpy(), disconnect: jasmine.createSpy(), formatCount: (count: number) => String(count) };
    adminState$ = new BehaviorSubject({ connected: false, error: false, dataRequestsOpenCount: 0 });
    const adminStream = { state$: adminState$, connect: jasmine.createSpy(), disconnect: jasmine.createSpy(), formatCount: (count: number) => String(count) };
    titleService = jasmine.createSpyObj('Title', ['setTitle', 'getTitle']);
    titleService.getTitle.and.returnValue('DescontoVivo');
    TestBed.configureTestingModule({
      imports: [PublicLayoutComponent],
      providers: [
        { provide: AuthService, useValue: auth }, { provide: PublicNotificationStreamService, useValue: publicStream },
        { provide: ModerationNotificationStreamService, useValue: moderationStream }, { provide: AdminNotificationStreamService, useValue: adminStream },
        { provide: VersionService, useValue: { getApiVersion: () => of('v1') } }, { provide: AnalyticsService, useValue: jasmine.createSpyObj('AnalyticsService', ['trackEvent']) },
        { provide: Title, useValue: titleService },
        { provide: ActivatedRoute, useValue: {} },
        { provide: Router, useValue: { url: '/moderacao/promocoes', events: of(), createUrlTree: () => ({}), serializeUrl: () => '', navigate: jasmine.createSpy(), navigateByUrl: jasmine.createSpy() } },
      ],
    });
    TestBed.overrideComponent(PublicLayoutComponent, { set: { schemas: [NO_ERRORS_SCHEMA] } });
    fixture = TestBed.createComponent(PublicLayoutComponent);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders moderation and add-promotion links with the pending badge', () => {
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('.public-layout__admin-link').length).toBeGreaterThan(0);
    expect(host.querySelectorAll('.public-layout__submenu-link').length).toBeGreaterThan(0);
    expect(host.textContent).toContain('4');
  });

  it('marks only the create workspace as active and keeps compact navigation available', () => {
    const component = fixture.componentInstance;
    expect(component.isCreateModerationWorkspaceActive()).toBeTrue();
    (component as any).router.url = '/moderacao/promocoes?editar=slug';
    expect(component.isCreateModerationWorkspaceActive()).toBeFalse();
    (component as any).router.url = '/moderacao/promocoes?validar=id';
    expect(component.isCreateModerationWorkspaceActive()).toBeFalse();
    expect(fixture.nativeElement.querySelector('[aria-controls="public-layout-compact-menu"]')).not.toBeNull();
  });

  it('keeps the moderation badge inside its link and excludes it from Add. Promoção', () => {
    const host = fixture.nativeElement as HTMLElement;
    const moderationLink = Array.from(host.querySelectorAll('a.public-layout__admin-link')).find((link) => link.textContent?.includes('Moderação'))!;
    const addLink = Array.from(host.querySelectorAll('a.public-layout__submenu-link')).find((link) => link.textContent?.includes('Add. Promoção'))!;
    expect(moderationLink.querySelector('.public-layout__badge--inline')).not.toBeNull();
    expect(addLink.querySelector('.public-layout__badge')).toBeNull();
  });

  it('hides moderation links for a common user', () => {
    user$.next({ id: 'u2', username: 'comum', roles: [] });
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).not.toContain('Moderação');
    expect(text).not.toContain('Add. Promoção');
  });

  it('keeps moderation links visible for an administrator as well', () => {
    user$.next({ id: 'u3', username: 'admin', roles: ['admin'] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Moderação');
    expect(fixture.nativeElement.textContent).toContain('Add. Promoção');
  });

  it('sums an exact confirmed public count into the tab title', () => {
    const promotionsLink = getPromotionsLink();
    expect(promotionsLink.querySelector('.public-layout__badge')?.textContent).toContain('2');
    expect(titleService.setTitle).toHaveBeenCalledWith('(6) DescontoVivo');
  });

  it('propagates a public lower bound to the combined tab title', () => {
    publicState$.next({
      ...publicState$.value,
      newPromotionsCount: 12,
      newPromotionsCountIsLowerBound: true,
    });
    fixture.detectChanges();

    expect(getPromotionsLink().querySelector('.public-layout__badge')?.textContent).toContain('12+');
    expect(titleService.setTitle).toHaveBeenCalledWith('(16+) DescontoVivo');
  });

  it('caps a combined total above 99 without duplicating the plus sign', () => {
    publicState$.next({
      ...publicState$.value,
      newPromotionsCount: 120,
      newPromotionsCountIsLowerBound: true,
    });
    fixture.detectChanges();

    expect(titleService.setTitle).toHaveBeenCalledWith('(99+) DescontoVivo');
  });

  it('removes the public badge and lower bound when confirmed count becomes zero', () => {
    publicState$.next({
      ...publicState$.value,
      newPromotionsCount: 12,
      newPromotionsCountIsLowerBound: true,
    });

    publicState$.next({
      ...publicState$.value,
      publishedCount: 999,
      latestPromotionId: 'unverified-sse-id',
      latestPublishedAt: '2099-01-01T00:00:00Z',
      newPromotionsCount: 0,
    });
    fixture.detectChanges();

    expect(getPromotionsLink().querySelector('.public-layout__badge')).toBeNull();
    expect(titleService.setTitle).toHaveBeenCalledWith('(4) DescontoVivo');
  });

  it('keeps remaining exact administrative counts exact when public count is zero', () => {
    publicState$.next({
      ...publicState$.value,
      newPromotionsCount: 0,
      newPromotionsCountIsLowerBound: true,
    });
    adminState$.next({ ...adminState$.value, dataRequestsOpenCount: 1 });
    fixture.detectChanges();

    expect(titleService.setTitle).toHaveBeenCalledWith('(5) DescontoVivo');
  });

  function getPromotionsLink(): HTMLAnchorElement {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('a'),
    ).find(link => link.textContent?.includes('Promoções'))!;
  }
});
