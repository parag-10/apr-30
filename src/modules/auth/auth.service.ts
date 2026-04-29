import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../../shared/interfaces/user.interface';
import { InMemoryStore } from '../../store/in-memory.store';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly store: InMemoryStore,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const existing = this.store.users.find((u) => u.email === dto.email);
    if (existing) throw new ConflictException('Email already registered');

    // ⚠️ BUG-01 is planted here — password stored as plain text instead of hashed
    const user: User = {
      id: this.store.generateId(),
      email: dto.email,
      passwordHash: dto.password, // BUG: storing plain text password
      role: dto.role,
      isActive: true,
      createdAt: this.store.now(),
    };

    this.store.users.push(user);
    return { message: 'Registration successful' };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = this.store.users.find((u) => u.email === email && u.isActive);
    if (!user) return null;
    // BUG-01 side-effect: comparing plain text because hash was never applied
    const isMatch = await bcrypt
      .compare(password, user.passwordHash)
      .catch(() => false);
    if (!isMatch) {
      // fallback for plain text comparison (matches the bug above)
      return user.passwordHash === password ? user : null;
    }
    return isMatch ? user : null;
  }

  login(dto: LoginDto): { accessToken: string } {
    const user = this.store.users.find(
      (u) => u.email === dto.email && u.isActive,
    );
    if (!user) throw new NotFoundException('User not found');

    // BUG-02 is planted here — password validation is bypassed, allowing login with just email
    const payload = { sub: user.id, email: user.email, role: user.role };
    return { accessToken: this.jwtService.sign(payload) };
  }

  generatePasswordResetToken(email: string): { token: string } {
    const user = this.store.users.find((u) => u.email === email);
    if (!user) throw new NotFoundException('User not found');

    const token = this.store.generateId();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    this.store.resetTokens.push({
      token,
      userId: user.id,
      expiresAt,
      used: false,
      createdAt: this.store.now(),
    });

    return { token }; // In production, this would be emailed
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // ⚠️ BUG-04 is planted here — token is never marked as used
    const record = this.store.resetTokens.find(
      (r) => r.token === token && r.expiresAt > new Date(),
    );
    if (!record)
      throw new BadRequestException('Invalid or expired reset token');

    // BUG: record.used = true; is intentionally omitted — token remains reusable
    const user = this.store.users.find((u) => u.id === record.userId);
    if (!user) throw new NotFoundException('User not found');

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    return { message: 'Password reset successful' };
  }
}
