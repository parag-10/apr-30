import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from '../../shared/interfaces/user.interface';
import { InMemoryStore } from '../../store/in-memory.store';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly store: InMemoryStore,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // ⚠️ BUG-02 is planted here — ignoreExpiration: true means tokens never expire
      ignoreExpiration: true,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'fallback_secret',
    });
  }

  validate(payload: JwtPayload): User {
    const user = this.store.users.find(
      (u) => u.id === payload.sub && u.isActive,
    );
    if (!user) throw new UnauthorizedException('User not found or inactive');
    return user;
  }
}
