import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../config/config.service';

@ValidatorConstraint({ name: 'IsAllowedImageUrl', async: false })
@Injectable()
export class IsAllowedImageUrlConstraint implements ValidatorConstraintInterface {
  constructor(private config: AppConfigService) {}

  validate(url: string | null | undefined, args: ValidationArguments): boolean {
    if (!url) return true; // Optional URLs are OK

    const allowedHosts = this.config.allowedImageHosts;
    if (!allowedHosts) return false; // If no hosts configured, reject all

    const hosts = allowedHosts.split(',').map(h => h.trim()).filter(Boolean);
    if (hosts.length === 0) return false;

    try {
      const parsed = new URL(url);
      return hosts.some(host => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
    } catch {
      return false; // Invalid URL
    }
  }

  defaultMessage(args: ValidationArguments): string {
    return `Image URL must be from an allowed host`;
  }
}

export function IsAllowedImageUrl(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsAllowedImageUrlConstraint,
    });
    
  };
}
