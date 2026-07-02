import { afterEach, describe, expect, it, vi } from 'vitest';

describe('buildRegistrationUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns null when registration is disabled via env', async () => {
    vi.stubEnv('VITE_KEYCLOAK_REGISTRATION_URL', '');
    vi.resetModules();
    const { buildRegistrationUrl } = await import('./registrationUrl');

    expect(buildRegistrationUrl()).toBeNull();
  });

  it('returns the BFF registration OAuth2 path when enabled', async () => {
    vi.stubEnv(
      'VITE_KEYCLOAK_REGISTRATION_URL',
      'http://localhost:8180/realms/nextu-files/protocol/openid-connect/registrations'
    );
    vi.resetModules();
    const { buildRegistrationUrl } = await import('./registrationUrl');

    expect(buildRegistrationUrl()).toBe('/oauth2/authorization/keycloak-register');
  });
});
