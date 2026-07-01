import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

const BASE_URL = 'https://descontovivo.com';
const DEFAULT_IMAGE = `${BASE_URL}/brand/logo-og-image.jpg`;

export interface SeoOptions {
  title: string;
  description: string;
  canonicalPath?: string;
  imageUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly document = inject(DOCUMENT);

  setIndexable(options: SeoOptions): void {
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    this.setTitleAndDescription(options.title, options.description);

    const canonicalUrl = this.buildCanonicalUrl(options.canonicalPath);
    this.setCanonical(canonicalUrl);
    this.setOpenGraph(options.title, options.description, canonicalUrl, options.imageUrl);
    this.setTwitterCard(options.title, options.description, options.imageUrl);
  }

  setNonIndexable(title: string, description: string): void {
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    this.setTitleAndDescription(title, description);
    this.removeCanonical();
  }

  setNoIndex(): void {
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    this.removeCanonical();
  }

  setIndexFollow(): void {
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
  }

  setTitleAndDescription(title: string, description: string): void {
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
  }

  private buildCanonicalUrl(path?: string): string {
    if (!path) return `${BASE_URL}/`;
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_URL}${normalized}`;
  }

  private setCanonical(url: string): void {
    const head = this.document.head;
    let link = this.document.getElementById('canonical') as HTMLLinkElement | null;
    if (!link) {
      link = this.document.createElement('link');
      link.id = 'canonical';
      link.rel = 'canonical';
      head.appendChild(link);
    }
    link.href = url;
  }

  private removeCanonical(): void {
    this.document.getElementById('canonical')?.remove();
  }

  private setOpenGraph(title: string, description: string, url: string, imageUrl?: string): void {
    const image = imageUrl || DEFAULT_IMAGE;
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: image });
  }

  private setTwitterCard(title: string, description: string, imageUrl?: string): void {
    const image = imageUrl || DEFAULT_IMAGE;
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: image });
  }
}
