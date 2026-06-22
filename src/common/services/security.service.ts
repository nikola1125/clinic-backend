import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import * as jwksClient from "jwks-rsa";
import { UserRole } from "../interfaces/actor.interface";

export interface JwtPayload {
  sub: string;
  role: UserRole;
  doctor_id?: string;
  patient_id?: string;
  exp?: number;
  iat?: number;
}

@Injectable()
export class SecurityService {
  private readonly jwtSecret: string;
  private readonly jwtExpiration: string;
  private readonly jwksClient?: jwksClient.JwksClient;

  constructor(private readonly configService: ConfigService) {
    this.jwtSecret =
      this.configService.get<string>("JWT_SECRET_KEY") ||
      this.configService.get<string>("JWT_SECRET");
    this.jwtExpiration =
      this.configService.get<string>("JWT_EXPIRATION") || "24h";

    const jwksUri = this.configService.get<string>("JWKS_URI");
    if (jwksUri) {
      this.jwksClient = (jwksClient as any)({
        jwksUri,
        cache: true,
        rateLimit: true,
      });
    }
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  createJwt(payload: JwtPayload): string {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiration,
    });
  }

  decodeJwt(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JwtPayload;
      return decoded;
    } catch (error) {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  async verifyJwt(token: string): Promise<JwtPayload> {
    if (this.jwksClient) {
      return this.verifyJwksToken(token);
    }
    return this.decodeJwt(token);
  }

  private async verifyJwksToken(token: string): Promise<JwtPayload> {
    try {
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === "string" || !decoded.header.kid) {
        throw new UnauthorizedException("Invalid token format");
      }

      const key = await this.jwksClient.getSigningKey(decoded.header.kid);
      const publicKey = key.getPublicKey();

      const verified = jwt.verify(token, publicKey) as JwtPayload;
      return verified;
    } catch (error) {
      throw new UnauthorizedException("JWKS verification failed");
    }
  }
}
