import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Login } from './Login';
import { mockLocationAssign } from '../test/test-utils';

describe('Login page', () => {
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
});
