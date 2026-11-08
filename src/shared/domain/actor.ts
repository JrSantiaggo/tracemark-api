import type { UserRole } from './user-role.js';

export interface Actor {
  id: string;
  role: UserRole;
}
