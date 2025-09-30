import { Injectable } from '@angular/core';

/**
 * ThemeService provides access to Ocean Professional theme values
 * defined in CSS variables and utility helpers for dynamic styling.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  // PUBLIC_INTERFACE
  getColorVariable(name: string): string {
    /** Returns the computed value of a CSS variable. */
    try {
      const g: any = typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;
      const doc: any = g?.document;
      const gcs: any = g?.getComputedStyle;

      if (doc && gcs) {
        const root = gcs(doc.documentElement as any);
        const val = root?.getPropertyValue?.(name);
        return (val || '').trim?.() ?? '';
      }
    } catch {
      // ignore
    }
    return '';
  }

  // PUBLIC_INTERFACE
  getPrimary(): string {
    /** Primary brand color. */
    return this.getColorVariable('--color-primary') || '#2563EB';
  }

  // PUBLIC_INTERFACE
  getSecondary(): string {
    /** Secondary accent color. */
    return this.getColorVariable('--color-secondary') || '#F59E0B';
  }
}
