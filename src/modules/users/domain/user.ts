import type { UserRole } from '../../../shared/domain/user-role.js';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
