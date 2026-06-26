import { describe, expect, it } from 'vitest';
import { getRoleLabel, ROLE_LABELS } from './roles';

describe('roles utils', () => {
  it('returns French labels for known roles', () => {
    expect(getRoleLabel('ADMIN')).toBe('Administrateur');
    expect(getRoleLabel('USER')).toBe('Collaborateur');
  });

  it('falls back to raw role string for unknown roles', () => {
    expect(getRoleLabel('CUSTOM')).toBe('CUSTOM');
  });

  it('exposes ROLE_LABELS map', () => {
    expect(ROLE_LABELS.ADMIN).toBe('Administrateur');
    expect(ROLE_LABELS.USER).toBe('Collaborateur');
  });
});
