export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  USER: 'Collaborateur',
};

export const getRoleLabel = (role: string): string =>
  ROLE_LABELS[role] ?? role;
