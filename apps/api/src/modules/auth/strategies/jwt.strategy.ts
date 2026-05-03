import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  phone: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = configService.get<string>('jwt.accessSecret');
    if (!secret || secret.length < 32) {
      throw new Error(
        'JWT_ACCESS_SECRET is missing or too short — refusing to start',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      // Pin the algorithm so a downgrade to "alg: none" or RS->HS confusion
      // is rejected upstream of validate().
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<Record<string, unknown>> {
    const account = await this.prisma.account.findUnique({
      where: { id: payload.sub },
    });

    if (!account || account.deletedAt || !account.isActive || account.isBanned) {
      throw new UnauthorizedException();
    }

    return {
      id: account.id,
      phoneNumber: account.phoneNumber,
      isActive: account.isActive,
      role: account.role,
    };
  }
}
