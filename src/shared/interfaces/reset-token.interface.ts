export interface ResetToken {
  token: string;
  userId: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}
