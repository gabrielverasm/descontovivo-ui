import { TestBed } from '@angular/core/testing';
import { throwError } from 'rxjs';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { Promotion } from '../../../core/models/promotion.model';
import { ToastService } from '../../../core/services/toast.service';
import { VoteService } from '../../../core/services/vote.service';
import { PromotionVoteButtonsComponent } from './promotion-vote-buttons.component';

describe('PromotionVoteButtonsComponent operational feedback', () => {
  it('rolls back a failed vote and reports it with an error toast', () => {
    const votes = jasmine.createSpyObj<VoteService>('VoteService', ['vote', 'removeVote']);
    votes.vote.and.returnValue(throwError(() => new Error('offline')));
    TestBed.configureTestingModule({
      providers: [
        { provide: VoteService, useValue: votes },
        { provide: AnalyticsService, useValue: jasmine.createSpyObj('AnalyticsService', ['trackPromotionVote']) },
      ],
    });
    const component = TestBed.runInInjectionContext(() => new PromotionVoteButtonsComponent());
    component.promotion = {
      id: 'promo-1', slug: 'promo-1', likesCount: 2, dislikesCount: 1,
    } as Promotion;
    component.toggleLikePrice();
    expect(component.localLikesCount).toBe(2);
    expect(component.userPriceVote).toBeNull();
    expect(TestBed.inject(ToastService).toasts()[0]).toEqual(jasmine.objectContaining({
      type: 'error',
      message: 'Não foi possível registrar seu voto. Tente novamente.',
    }));
  });
});

describe('PromotionVoteButtonsComponent counters', () => {
  function render(likesCount: number, dislikesCount: number): HTMLElement {
    TestBed.configureTestingModule({
      providers: [
        { provide: VoteService, useValue: jasmine.createSpyObj<VoteService>('VoteService', ['vote', 'removeVote']) },
        { provide: AnalyticsService, useValue: jasmine.createSpyObj('AnalyticsService', ['trackPromotionVote']) },
      ],
    });
    const fixture = TestBed.createComponent(PromotionVoteButtonsComponent);
    fixture.componentInstance.promotion = { id: 'p', slug: 'p', likesCount, dislikesCount } as Promotion;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('keeps the buttons but hides the counters while they are zero', () => {
    const host = render(0, 0);
    expect(host.querySelectorAll('button').length).toBe(2);
    expect(host.querySelectorAll('button span').length).toBe(0);
  });

  it('shows only the counters that are above zero', () => {
    const host = render(3, 0);
    expect(host.querySelector('.promotion-vote--like span')?.textContent?.trim()).toBe('3');
    expect(host.querySelector('.promotion-vote--dislike span')).toBeNull();
  });
});
