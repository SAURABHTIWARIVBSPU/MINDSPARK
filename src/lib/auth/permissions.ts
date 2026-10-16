import { Role, Permission, User } from '@/types';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    'students.read',
    'students.create',
    'students.update',
    'students.archive',
    'imports.create',
    'imports.review',
    'exports.master',
    'registrationNumbers.manage',
    'admitCards.generate',
    'admitCards.read',
    'admitCards.download',
    'messages.prepare',
    'messages.send',
    'users.manage',
    'permissions.manage',
    'auditLogs.read',
    'settings.manage',
  ],
  ADMIN: [
    'students.read',
    'students.create',
    'students.update',
    'students.archive',
    'imports.create',
    'imports.review',
    'exports.master',
    'registrationNumbers.manage',
    'admitCards.generate',
    'admitCards.read',
    'admitCards.download',
    'messages.prepare',
    'messages.send',
    'auditLogs.read',
  ],
  REGISTRATION_OPERATOR: [
    'students.read',
    'students.create',
    'students.update',
    'admitCards.read',
    'admitCards.download',
    'messages.prepare',
  ],
  EXCEL_OPERATOR: [
    'students.read',
    'imports.create',
    'imports.review',
    'exports.master',
  ],
  READ_ONLY: [
    'students.read',
    'admitCards.read',
  ],
};

export function hasPermission(user: User | null | undefined, permission: Permission): boolean {
  if (!user || !user.active) return false;
  const permissions = ROLE_PERMISSIONS[user.role] || [];
  return permissions.includes(permission);
}

export function assertPermission(user: User | null | undefined, permission: Permission): void {
  if (!hasPermission(user, permission)) {
    throw new Error(`Unauthorized: Missing permission '${permission}'`);
  }
}
