import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);

  setIndexFollow(): void {
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
  }

  setNoIndex(): void {
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
  }

  setTitleAndDescription(title: string, description: string): void {
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
  }

  setIndexable(title: string, description: string): void {
    this.setIndexFollow();
    this.setTitleAndDescription(title, description);
  }

  setNonIndexable(title: string, description: string): void {
    this.setNoIndex();
    this.setTitleAndDescription(title, description);
  }
}
