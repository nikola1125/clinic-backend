import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

// Mock SecurityService since it doesn't exist yet
class SecurityService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async comparePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  generateToken(payload: any): string {
    return this.jwtService.sign(payload);
  }

  verifyToken(token: string): any {
    return this.jwtService.verify(token);
  }

  sanitizeInput(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  generateRandomToken(length: number = 32): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

describe('SecurityService', () => {
  let service: SecurityService;
  let jwtService: JwtService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<SecurityService>(SecurityService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const password = 'testPassword123';
      const hashedPassword = '$2b$10$hashedPasswordExample';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await service.hashPassword(password);

      expect(result).toBe(hashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
    });

    it('should handle hashing errors', async () => {
      const password = 'testPassword123';
      const error = new Error('Hashing failed');

      (bcrypt.hash as jest.Mock).mockRejectedValue(error);

      await expect(service.hashPassword(password)).rejects.toThrow(
        'Hashing failed',
      );
    });
  });
});
