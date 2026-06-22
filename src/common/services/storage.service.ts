import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class StorageService {
  private readonly storageSecret: string;
  private readonly storageBucket: string;
  private readonly storageBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.storageSecret = this.configService.get<string>('STORAGE_SECRET');
    this.storageBucket = this.configService.get<string>('STORAGE_BUCKET');
    this.storageBaseUrl = this.configService.get<string>('STORAGE_BASE_URL');
  }

  generateStorageKey(prefix: string, filename: string): string {
    const timestamp = Date.now();
    const randomStr = crypto.randomBytes(8).toString('hex');
    const ext = filename.includes('.')
      ? filename.substring(filename.lastIndexOf('.'))
      : '';
    return `${prefix}/${timestamp}-${randomStr}${ext}`;
  }

  generateSignedUrl(
    storageKey: string,
    expirationMinutes: number = 60,
  ): string {
    const expiresAt = Math.floor(Date.now() / 1000) + expirationMinutes * 60;
    const dataToSign = `${storageKey}:${expiresAt}`;
    const signature = crypto
      .createHmac('sha256', this.storageSecret)
      .update(dataToSign)
      .digest('hex');

    const url = new URL(`${this.storageBaseUrl}/${storageKey}`);
    url.searchParams.set('expires', expiresAt.toString());
    url.searchParams.set('signature', signature);

    return url.toString();
  }

  verifySignedUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.substring(1);
      const expires = urlObj.searchParams.get('expires');
      const signature = urlObj.searchParams.get('signature');

      if (!expires || !signature) {
        return false;
      }

      const expiresAt = parseInt(expires, 10);
      if (isNaN(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
        return false;
      }

      const dataToSign = `${pathname}:${expiresAt}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.storageSecret)
        .update(dataToSign)
        .digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      return false;
    }
  }
}
