import { Pipe, PipeTransform } from '@angular/core';

/**
 * Simple JSON stringify pipe for debug previews of protocol data.
 */
@Pipe({
  name: 'jsonPreview',
  standalone: true
})
export class JsonPreviewPipe implements PipeTransform {
  // PUBLIC_INTERFACE
  transform(value: unknown, space: number = 2): string {
    /** Stringifies any value safely for preview. */
    try {
      return JSON.stringify(value, null, space);
    } catch {
      return String(value);
    }
  }
}
