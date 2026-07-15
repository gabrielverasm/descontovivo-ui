import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AnalyticsService } from '../../core/analytics/analytics.service';
import { SeoService } from '../../core/services/seo.service';
import { ServicesComponent } from './services.component';

describe('ServicesComponent', () => {
  let fixture: ComponentFixture<ServicesComponent>;
  let component: ServicesComponent;
  let analytics: jasmine.SpyObj<AnalyticsService>;

  const expectedStores = [
    {
      id: 'amazon',
      logo: '/assets/lojas/amazon.svg',
      alt: 'Logo da Amazon',
      href: 'https://link.amazon/B0b5nIch0',
    },
    {
      id: 'mercado_livre',
      logo: '/assets/lojas/mercado-livre.svg',
      alt: 'Logo do Mercado Livre',
      href: 'https://meli.la/2vZLHsF',
    },
    {
      id: 'magalu',
      logo: '/assets/lojas/magalu.svg',
      alt: 'Logo da Magalu',
      href: 'https://www.magazinevoce.com.br/magazinedescontovivo/',
    },
    {
      id: 'shopee',
      logo: '/assets/lojas/shopee.svg',
      alt: 'Logo da Shopee',
      href: 'https://s.shopee.com.br/9fJKQGm4sg',
    },
    {
      id: 'aliexpress',
      logo: '/assets/lojas/aliexpress.svg',
      alt: 'Logo do AliExpress',
      href: 'https://s.click.aliexpress.com/e/_c3okcdkb',
    },
  ] as const;

  beforeEach(() => {
    analytics = jasmine.createSpyObj('AnalyticsService', [
      'trackAffiliateStoreClick',
      'trackAffiliateServiceClick',
      'trackServiceClick',
    ]);

    TestBed.configureTestingModule({
      imports: [ServicesComponent],
      providers: [
        provideRouter([]),
        { provide: AnalyticsService, useValue: analytics },
        { provide: SeoService, useValue: jasmine.createSpyObj('SeoService', ['setIndexable']) },
      ],
    });

    fixture = TestBed.createComponent(ServicesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the five local store logos with reserved dimensions and useful alt text', () => {
    const logos = fixture.nativeElement.querySelectorAll('.service-detail__logo img') as NodeListOf<HTMLImageElement>;

    expect(logos.length).toBe(5);
    expectedStores.forEach((store, index) => {
      expect(logos[index].getAttribute('src')).toBe(store.logo);
      expect(logos[index].alt).toBe(store.alt);
      expect(logos[index].getAttribute('width')).toBe('140');
      expect(logos[index].getAttribute('height')).toBe('48');
    });
  });

  it('renders five sponsored native anchors with the approved URLs and attributes', () => {
    const links = fixture.nativeElement.querySelectorAll('.service-detail__affiliate a') as NodeListOf<HTMLAnchorElement>;

    expect(links.length).toBe(5);
    expectedStores.forEach((store, index) => {
      expect(links[index].getAttribute('href')).toBe(store.href);
      expect(links[index].target).toBe('_blank');
      expect(links[index].rel.split(' ')).toEqual(jasmine.arrayWithExactContents([
        'sponsored', 'noopener', 'noreferrer',
      ]));
      expect(links[index].getAttribute('aria-label')).toContain('link patrocinado');
    });
  });

  it('identifies every affiliate CTA and explains sponsorship in the disclosure', () => {
    const labels = fixture.nativeElement.querySelectorAll('.service-detail__affiliate small');
    const disclosure = fixture.nativeElement.querySelector('.services-disclosure')?.textContent ?? '';

    expect(labels.length).toBe(5);
    labels.forEach((label: Element) => expect(label.textContent?.trim()).toBe('Link patrocinado'));
    expect(disclosure).toContain('Alguns links desta página são patrocinados.');
    expect(disclosure).toContain('sem custo adicional para você');
  });

  it('renders the Amazon Prime and Meli+ local logos with reserved dimensions', () => {
    const logos = fixture.nativeElement.querySelectorAll('.service-related__heading img') as NodeListOf<HTMLImageElement>;

    expect(logos.length).toBe(2);
    expect(logos[0].getAttribute('src')).toBe('/assets/servicos/prime.webp');
    expect(logos[0].alt).toBe('Amazon Prime');
    expect(logos[1].getAttribute('src')).toBe('/assets/servicos/meli-plus.webp');
    expect(logos[1].alt).toBe('Meli+');
    logos.forEach((logo) => {
      expect(logo.getAttribute('width')).toBe('160');
      expect(logo.getAttribute('height')).toBe('48');
    });
  });

  it('renders Prime as sponsored and Meli+ as an informational native link', () => {
    const links = fixture.nativeElement.querySelectorAll('.service-related__action a') as NodeListOf<HTMLAnchorElement>;
    const labels = fixture.nativeElement.querySelectorAll('.service-related__action small');

    expect(links.length).toBe(2);
    expect(links[0].getAttribute('href')).toBe('https://link.amazon/B01Tr9PVc');
    expect(links[0].target).toBe('_blank');
    expect(links[0].rel.split(' ')).toEqual(jasmine.arrayWithExactContents([
      'sponsored', 'noopener', 'noreferrer',
    ]));
    expect(labels[0].textContent?.trim()).toBe('Link patrocinado');

    expect(links[1].getAttribute('href')).toBe('https://www.mercadolivre.com.br/assinaturas/melimais');
    expect(links[1].target).toBe('_blank');
    expect(links[1].rel.split(' ')).toEqual(jasmine.arrayWithExactContents(['noopener', 'noreferrer']));
    expect(links[1].rel).not.toContain('sponsored');
    expect(labels[1].textContent?.trim()).toBe('Link informativo');
  });

  it('tracks an affiliate click without replacing the anchor navigation', () => {
    const firstLink = fixture.debugElement.queryAll(By.css('.service-detail__affiliate a'))[0];

    firstLink.triggerEventHandler('click');

    expect(firstLink.nativeElement.tagName).toBe('A');
    expect(analytics.trackAffiliateStoreClick).toHaveBeenCalledWith({
      store: 'amazon',
      placement: 'services',
      ui_version: '0.5.18',
    });
  });

  it('tracks Prime and Meli+ with separate service events', () => {
    const links = fixture.debugElement.queryAll(By.css('.service-related__action a'));

    links[0].triggerEventHandler('click');
    links[1].triggerEventHandler('click');

    expect(analytics.trackAffiliateServiceClick).toHaveBeenCalledWith({
      service: 'amazon_prime',
      placement: 'services',
      ui_version: '0.5.18',
    });
    expect(analytics.trackServiceClick).toHaveBeenCalledWith({
      service: 'meli_plus',
      placement: 'services',
      ui_version: '0.5.18',
    });
    expect(analytics.trackAffiliateStoreClick).not.toHaveBeenCalled();
  });

  it('does not propagate analytics errors from the native link click handler', () => {
    analytics.trackAffiliateStoreClick.and.throwError('analytics unavailable');
    analytics.trackAffiliateServiceClick.and.throwError('analytics unavailable');
    analytics.trackServiceClick.and.throwError('analytics unavailable');

    expect(() => component.trackAffiliateClick('shopee')).not.toThrow();
    expect(() => component.trackAffiliateServiceClick()).not.toThrow();
    expect(() => component.trackServiceClick()).not.toThrow();
  });
});
