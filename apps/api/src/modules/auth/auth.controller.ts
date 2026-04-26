import { Controller, Post, Get, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentAccount } from '../../common/decorators/current-account.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/request')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request an OTP code' })
  requestOtp(@Body() dto: RequestOtpDto, @Req() req: Request) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
    const deviceId = req.headers['x-device-id'] as string | undefined;
    return this.authService.requestOtp(dto.phoneNumber, dto.channel, ipAddress, deviceId);
  }

  @Post('otp/verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and get tokens' })
  verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: Request) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
    const deviceId = req.headers['x-device-id'] as string | undefined;
    return this.authService.verifyOtp(dto.phoneNumber, dto.code, ipAddress, deviceId);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  refreshTokens(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout (revoke tokens)' })
  logout(@CurrentAccount('id') accountId: string) {
    return this.authService.logout(accountId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current account info' })
  getMe(@CurrentAccount('id') accountId: string) {
    return this.authService.getMe(accountId);
  }
}
