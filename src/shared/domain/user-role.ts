export const UserRole = {
  PHOTOGRAPHER: 'PHOTOGRAPHER',
  USER: 'USER',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];
