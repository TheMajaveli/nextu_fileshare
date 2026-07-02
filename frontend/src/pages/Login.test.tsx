import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Login } from './Login';
import { mockLocationAssign } from '../test/test-utils';

describe('Login page', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('renders branding and login button', () => {
    render(<Login />);

    expect(screen.getByRole('heading', { name: 'NEXTU-FileShare' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Se connecter/i })).toBeInTheDocument();
  });

  it('redirects to OAuth2 authorization on login click', async () => {
    const location = mockLocationAssign();
    const user = userEvent.setup();

    render(<Login />);
    await user.click(screen.getByRole('button', { name: /Se connecter/i }));

    expect(location.href).toBe('/oauth2/authorization/keycloak');
    location.restore();
  });

  it('hides registration link when env is unset', async () => {
    vi.stubEnv('VITE_KEYCLOAK_REGISTRATION_URL', '');
    vi.resetModules();
    const { Login: LoginWithoutReg } = await import('./Login');

    render(<LoginWithoutReg />);

    expect(screen.queryByRole('link', { name: /S'inscrire/i })).not.toBeInTheDocument();
  });

  it('shows registration link with OIDC params when env is set', async () => {
    vi.stubEnv(
      'VITE_KEYCLOAK_REGISTRATION_URL',
      'http://localhost:8180/realms/nextu-files/protocol/openid-connect/registrations'
    );
    vi.resetModules();
    const { Login: LoginWithReg } = await import('./Login');

    render(<LoginWithReg />);

    const link = screen.getByRole('link', { name: /S'inscrire/i });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toBe('/oauth2/authorization/keycloak-register');
  });
});
