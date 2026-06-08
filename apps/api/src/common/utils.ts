export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export function getDisplayName(user: {
  studentProfile?: { firstName: string; lastName: string; middleName?: string | null } | null;
  teacherProfile?: { firstName: string; lastName: string; middleName?: string | null } | null;
  email: string;
}): string {
  const profile = user.studentProfile ?? user.teacherProfile;
  if (!profile) return user.email;
  return [profile.lastName, profile.firstName, profile.middleName].filter(Boolean).join(' ');
}

export function normalizeUsername(raw: string): string {
  return raw.replace(/^@/, '').trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9_]{5,32}$/.test(username);
}

export function buildDmKey(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join(':');
}

export function formatUserPublic(user: {
  id: string;
  username?: string | null;
  role: string;
  studentProfile?: { firstName: string; lastName: string; avatarUrl?: string | null } | null;
  teacherProfile?: { firstName: string; lastName: string; avatarUrl?: string | null } | null;
  email: string;
}) {
  const profile = user.studentProfile ?? user.teacherProfile;
  return {
    id: user.id,
    username: user.username,
    displayName: getDisplayName(user),
    role: user.role,
    avatarUrl: profile?.avatarUrl ?? null,
  };
}
