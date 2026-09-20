import { TestBed } from '@angular/core/testing';

import { SponsoredLabelComponent } from './sponsored-label.component';

describe('SponsoredLabelComponent', () => {
  it('renders the visible "Link patrocinado" text', () => {
    const fixture = TestBed.createComponent(SponsoredLabelComponent);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent?.trim()).toBe('Link patrocinado');
  });
});
