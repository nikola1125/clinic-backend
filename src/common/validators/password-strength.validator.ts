import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'IsStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string): boolean {
    if (!password || password.length < 8) return false;

    // Check for weak passwords
    const weakPasswords = ['password', '12345678', 'password123', 'admin123', 'changeme', 'secret123', '123456789'];
    if (weakPasswords.some(weak => password.toLowerCase().includes(weak))) {
      return false;
    }

    // Require at least:
    // - 1 uppercase letter
    // - 1 lowercase letter
    // - 1 number
    // - 1 special character
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return hasUppercase && hasLowercase && hasNumber && hasSpecial;
  }

  defaultMessage(): string {
    return 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character';
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}
