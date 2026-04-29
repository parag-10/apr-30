export type UserRole = 'hr_admin' | 'manager' | 'employee';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}
