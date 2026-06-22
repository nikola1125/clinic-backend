import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: any) {
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    if (typeof value === 'object' && value !== null) {
      return this.sanitizeObject(value);
    }

    return value;
  }

  private sanitizeString(str: string): string {
    // Remove HTML tags
    let cleaned = str.replace(/<[^>]*>/g, '');

    // Escape special characters for XSS prevention
    cleaned = cleaned
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    return cleaned.trim();
  }

  private sanitizeObject(obj: any): any {
    const sanitized: any = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];

        if (typeof value === 'string') {
          sanitized[key] = this.sanitizeString(value);
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = this.sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
    }

    return sanitized;
  }
}
