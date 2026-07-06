import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
  Logger,
  OnApplicationBootstrap,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import * as jwt from "jsonwebtoken";
import { User, UserRole } from "../../entities/user.entity";
import { Patient } from "../../entities/patient.entity";
import { Doctor } from "../../entities/doctor.entity";
import { RedisService } from "../../common/services/redis.service";
import { SecurityService } from "../../common/services/security.service";
import {
  SyncRequestDto,
  SyncResponseDto,
  AssignRoleRequestDto,
  AssignRoleResponseDto,
  CreateStaffRequestDto,
  CreateStaffResponseDto,
  RefreshRequestDto,
  TokenResponseDto,
} from "./dto";
import { createClient } from "@supabase/supabase-js";

interface RefreshTokenPayload {
  sub: string;
  role: string;
  doctor_id?: string;
  patient_id?: string;
  jti: string;
  family: string;
  type: string;
  iat: number;
  exp: number;
}

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name);
  private readonly supabaseMode: boolean;
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly jwtExpireMinutes: number;
  private readonly jwtRefreshExpireMinutes: number;
  private readonly supabaseAdmin: any;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Patient)
    private patientRepository: Repository<Patient>,
    @InjectRepository(Doctor)
    private doctorRepository: Repository<Doctor>,
    private redisService: RedisService,
    private securityService: SecurityService,
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {
    this.supabaseMode = !!this.configService.get<string>("SUPABASE_JWT_SECRET");
    this.jwtSecret =
      this.configService.get<string>("JWT_SECRET_KEY") ||
      this.configService.get<string>("JWT_SECRET");
    this.jwtRefreshSecret =
      this.configService.get<string>("JWT_REFRESH_SECRET_KEY") ||
      this.jwtSecret;
    this.jwtExpireMinutes = parseInt(
      this.configService.get<string>("JWT_EXPIRE_MINUTES", "60"),
      10,
    );
    this.jwtRefreshExpireMinutes = parseInt(
      this.configService.get<string>("JWT_REFRESH_EXPIRE_MINUTES", "10080"),
      10,
    );

    // Initialize Supabase Admin client if in Supabase mode
    if (this.supabaseMode) {
      const supabaseUrl = this.configService.get<string>("SUPABASE_URL");
      const supabaseServiceKey = this.configService.get<string>(
        "SUPABASE_SERVICE_ROLE_KEY",
      );
      if (supabaseUrl && supabaseServiceKey) {
        this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      }
    }
  }

  // ── Token Generation Helpers ──────────────────────────────────────────────

  private createAccessToken(
    sub: string,
    role: string,
    doctorId?: string,
    patientId?: string,
  ): string {
    const payload: any = {
      sub,
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.jwtExpireMinutes * 60,
    };
    if (doctorId) payload.doctor_id = doctorId;
    if (patientId) payload.patient_id = patientId;
    return jwt.sign(payload, this.jwtSecret, { algorithm: "HS256" });
  }

  private createRefreshToken(
    sub: string,
    role: string,
    doctorId?: string,
    patientId?: string,
    family?: string,
  ): { token: string; jti: string; familyId: string } {
    const jti = crypto.randomBytes(16).toString("hex");
    const familyId = family || crypto.randomBytes(16).toString("hex");
    const payload: any = {
      sub,
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.jwtRefreshExpireMinutes * 60,
      jti,
      family: familyId,
      type: "refresh",
    };
    if (doctorId) payload.doctor_id = doctorId;
    if (patientId) payload.patient_id = patientId;
    const token = jwt.sign(payload, this.jwtRefreshSecret, {
      algorithm: "HS256",
    });
    return { token, jti, familyId };
  }

  private async issueTokens(
    sub: string,
    role: string,
    doctorId?: string,
    patientId?: string,
  ): Promise<TokenResponseDto> {
    const accessToken = this.createAccessToken(sub, role, doctorId, patientId);
    const {
      token: refreshToken,
      jti,
      familyId,
    } = this.createRefreshToken(sub, role, doctorId, patientId);

    // Store refresh token JTI in Redis with family_id as value
    const ttl = this.jwtRefreshExpireMinutes * 60;
    await this.redisService.set(`rt:${jti}`, familyId, ttl);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "bearer",
      expires_in: this.jwtExpireMinutes * 60,
      role,
      doctor_id: doctorId,
      patient_id: patientId,
    };
  }

  private decodeRefreshToken(token: string): RefreshTokenPayload {
    try {
      const payload = jwt.verify(token, this.jwtRefreshSecret, {
        algorithms: ["HS256"],
      }) as RefreshTokenPayload;

      if (payload.type !== "refresh") {
        throw new Error("Token is not a refresh token");
      }

      return payload;
    } catch (error) {
      throw new UnauthorizedException(
        `Invalid refresh token: ${error.message}`,
      );
    }
  }

  // ── Bootstrap seed ────────────────────────────────────────────────────────

  async onApplicationBootstrap() {
    const email = this.configService.get<string>('ADMIN_SEED_EMAIL', 'admin@clinic.com');
    const password = this.configService.get<string>('ADMIN_SEED_PASSWORD', '');
    if (!password) return;

    const exists = await this.userRepository.findOne({ where: { email } });
    if (exists) return;

    const hashedPw = await bcrypt.hash(password, 10);
    const admin = this.userRepository.create({
      email,
      username: 'admin',
      hashedPw,
      role: UserRole.ADMIN,
    });
    await this.userRepository.save(admin);
    this.logger.log(`✅ Admin account seeded: ${email}`);
  }

  // ── Legacy Mode Endpoints ──────────────────────────────────────────────────

  async login(loginDto: any): Promise<TokenResponseDto> {
    const { email, username, password } = loginDto;
    const identifier = String(email ?? username ?? "").trim();
    const user = await this.userRepository.findOne({
      where: [{ email: identifier }, { username: identifier }],
    });

    const storedHash = user?.hashedPw || "$2b$12$invalidhashplaceholder";
    const passwordOk = await bcrypt.compare(password, storedHash);

    if (!user || !passwordOk) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.isActive) {
      throw new BadRequestException("Inactive user");
    }

    return this.issueTokens(
      user.id,
      user.role,
      user.doctorId || undefined,
      user.patientId || undefined,
    );
  }

  async register(registerDto: any): Promise<TokenResponseDto> {
    const { email, password, full_name, phone } = registerDto;

    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new BadRequestException("Email already registered");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { patient, user } = await this.dataSource.transaction(
      async (manager) => {
        const patientRepo = manager.getRepository(Patient);
        const userRepo = manager.getRepository(User);

        const patient = patientRepo.create({
          fullName: full_name,
          email,
          phone: phone || null,
        });
        await patientRepo.save(patient);

        const user = userRepo.create({
          email,
          hashedPw: passwordHash,
          role: UserRole.PATIENT,
          patientId: patient.id,
        });
        await userRepo.save(user);

        return { patient, user };
      },
    );

    return this.issueTokens(user.id, user.role, undefined, patient.id);
  }

  async refresh(refreshDto: RefreshRequestDto): Promise<TokenResponseDto> {
    const claims = this.decodeRefreshToken(refreshDto.refresh_token);
    const jti = claims.jti;
    const familyId = claims.family;

    // Check if this refresh token JTI exists in Redis
    let storedFamily: string | null;
    try {
      storedFamily = await this.redisService.get(`rt:${jti}`);
    } catch {
      // Redis unavailable — can't validate JTI; return 503 so the client
      // retries rather than treating this as a token-reuse / auth failure.
      throw new ServiceUnavailableException(
        "Token store temporarily unavailable — please retry",
      );
    }
    if (!storedFamily) {
      // JTI not found: genuine token reuse or already-rotated token
      await this.redisService.del(`rt:family:${familyId}`).catch(() => {});
      throw new UnauthorizedException(
        "Refresh token reuse detected — please log in again",
      );
    }

    // Valid refresh — delete old JTI and issue new tokens
    await this.redisService.del(`rt:${jti}`);

    return this.issueTokens(
      claims.sub,
      claims.role,
      claims.doctor_id,
      claims.patient_id,
    );
  }

  // ── Supabase Mode Endpoints ───────────────────────────────────────────────

  async syncUser(
    actor: any,
    payload: SyncRequestDto,
  ): Promise<SyncResponseDto> {
    if (!actor) {
      throw new UnauthorizedException("Authentication required");
    }

    let user = await this.userRepository.findOne({
      where: { authUserId: actor.sub },
    });

    if (!user) {
      // First login — create local shadow record (role assigned later by admin)
      user = this.userRepository.create({
        authUserId: actor.sub,
        email: payload.email,
        hashedPw: null,
        role: UserRole.PATIENT, // default until admin assigns role
      });
      await this.userRepository.save(user);
    }

    return { status: "synced", role: user.role };
  }

  async assignRole(
    payload: AssignRoleRequestDto,
  ): Promise<AssignRoleResponseDto> {
    if (!["admin", "doctor", "patient"].includes(payload.role)) {
      throw new BadRequestException("Invalid role");
    }

    const user = await this.userRepository.findOne({
      where: { authUserId: payload.auth_user_id },
    });

    if (!user) {
      throw new NotFoundException("User not found — have them log in first");
    }

    user.role = payload.role as UserRole;
    user.doctorId = payload.doctor_id || null;
    user.patientId = payload.patient_id || null;
    await this.userRepository.save(user);

    return { status: "role assigned", role: payload.role };
  }

  async createStaff(
    payload: CreateStaffRequestDto,
  ): Promise<CreateStaffResponseDto> {
    if (!["admin", "doctor"].includes(payload.role)) {
      throw new BadRequestException("Invalid role");
    }

    if (this.supabaseMode && this.supabaseAdmin) {
      // Use Supabase Admin API to create auth user
      const { data: authUser, error } =
        await this.supabaseAdmin.auth.admin.createUser({
          email: payload.email,
          password: payload.password,
          email_confirm: true,
        });

      if (error) {
        throw new BadRequestException(
          `Supabase user creation failed: ${error.message}`,
        );
      }

      // Create local user record linked to Supabase auth user
      const doctorId = await this.dataSource.transaction(async (manager) => {
        const doctorRepo = manager.getRepository(Doctor);
        const userRepo = manager.getRepository(User);

        let doctorId: string | null = null;

        if (payload.role === "doctor") {
          const doctor = doctorRepo.create({
            name: payload.name,
            email: payload.email,
            specialty: payload.specialty || null,
          });
          await doctorRepo.save(doctor);
          doctorId = doctor.id;
        }

        const user = userRepo.create({
          authUserId: authUser.user.id,
          email: payload.email,
          hashedPw: null,
          role: payload.role as UserRole,
          doctorId,
        });
        await userRepo.save(user);

        return doctorId;
      });

      return {
        message: "Staff account created successfully",
        user_id: authUser.user.id,
      };
    } else {
      // Legacy mode: create user with hashed password
      const existing = await this.userRepository.findOne({
        where: { email: payload.email },
      });
      if (existing) {
        throw new BadRequestException("Email already registered");
      }

      const passwordHash = await bcrypt.hash(payload.password, 10);

      await this.dataSource.transaction(async (manager) => {
        const doctorRepo = manager.getRepository(Doctor);
        const userRepo = manager.getRepository(User);

        let doctorId: string | null = null;

        if (payload.role === "doctor") {
          const doctor = doctorRepo.create({
            name: payload.name,
            email: payload.email,
            specialty: payload.specialty || null,
          });
          await doctorRepo.save(doctor);
          doctorId = doctor.id;
        }

        const user = userRepo.create({
          email: payload.email,
          hashedPw: passwordHash,
          role: payload.role as UserRole,
          doctorId,
        });
        await userRepo.save(user);
      });

      return { message: "Staff account created successfully" };
    }
  }

  async logout(actor: any): Promise<{ message: string }> {
    // In a full implementation, you could revoke all refresh tokens for this user
    // by deleting all rt:* keys associated with their sub
    return { message: "Logged out successfully" };
  }
}
