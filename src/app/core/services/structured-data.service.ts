import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

/**
 * Service to manage JSON-LD structured data scripts in the document head.
 * Handles adding, updating, and removing structured data blocks safely
 * during SPA navigation.
 */
@Injectable({ providedIn: 'root' })
export class StructuredDataService {
  private readonly document = inject(DOCUMENT);

  /**
   * Sets a structured data block identified by the given id.
   * If a block with this id already exists, it will be updated.
   */
  setStructuredData(id: string, data: object): void {
    const scriptId = this.buildScriptId(id);
    let script = this.document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = this.document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      this.document.head.appendChild(script);
    }

    script.textContent = JSON.stringify(data);
  }

  /**
   * Removes a specific structured data block by id.
   */
  removeStructuredData(id: string): void {
    const scriptId = this.buildScriptId(id);
    this.document.getElementById(scriptId)?.remove();
  }

  /**
   * Removes all page-level structured data blocks (those with prefix 'sd-page-').
   * Useful when navigating away from a page.
   */
  clearPageStructuredData(): void {
    const scripts = this.document.querySelectorAll('script[type="application/ld+json"][id^="sd-page-"]');
    scripts.forEach((script) => script.remove());
  }

  /**
   * Removes all structured data blocks managed by this service.
   */
  clearAll(): void {
    const scripts = this.document.querySelectorAll('script[type="application/ld+json"][id^="sd-"]');
    scripts.forEach((script) => script.remove());
  }

  private buildScriptId(id: string): string {
    return id.startsWith('sd-') ? id : `sd-${id}`;
  }
}
