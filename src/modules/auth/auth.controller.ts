import { Controller, Post, Get, Body, UseGuards, Request } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthGuard } from "../../common/guards/auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { RateLimit } from "../../common/decorators/rate-limit.decorator";
import {
  LoginDto,
  RegisterDto,
  SyncRequestDto,
  SyncResponseDto,
  AssignRoleRequestDto,
  AssignRoleResponseDto,
  CreateStaffRequestDto,
  CreateStaffResponseDto,
  RefreshRequestDto,
  TokenResponseDto,
} from "./dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // bcrypt makes these CPU-heavy — cap them tighter than the global limit
  // so a login flood cannot starve the rest of the app
  @Post("login")
  async login(@Body() loginDto: LoginDto): Promise<TokenResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post("register")
  async register(@Body() registerDto: RegisterDto): Promise<TokenResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post("refresh")
  async refresh(
    @Body() refreshDto: RefreshRequestDto,
  ): Promise<TokenResponseDto> {
    return this.authService.refresh(refreshDto);
  }

  @Post("sync")
  @UseGuards(AuthGuard)
  async sync(
    @Request() req: any,
    @Body() syncDto: SyncRequestDto,
  ): Promise<SyncResponseDto> {
    return this.authService.syncUser(req.actor, syncDto);
  }

  @Post("assign-role")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  async assignRole(
    @Body() assignRoleDto: AssignRoleRequestDto,
  ): Promise<AssignRoleResponseDto> {
    return this.authService.assignRole(assignRoleDto);
  }

  @Post("create-staff")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  async createStaff(
    @Body() createStaffDto: CreateStaffRequestDto,
  ): Promise<CreateStaffResponseDto> {
    return this.authService.createStaff(createStaffDto);
  }

  @Post("logout")
  @UseGuards(AuthGuard)
  async logout(@Request() req: any): Promise<{ message: string }> {
    return this.authService.logout(req.actor);
  }

  @Get("me")
  @UseGuards(AuthGuard)
  async getMe(@Request() req: any) {
    return {
      id: req.actor.sub,
      role: req.actor.role,
      doctor_id: req.actor.doctor_id ?? null,
      patient_id: req.actor.patient_id ?? null,
    };
  }
}
