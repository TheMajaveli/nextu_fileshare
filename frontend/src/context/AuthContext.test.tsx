import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';
import * as authService from '../services/auth';
import { mockUser } from '../test/test-utils';

function AuthProbe() {
  const { user, loading, clearSession } = useAuth();
  if (loading) return <div>loading</div>;
  return (
    <div>
      <span data-testid="username">{user?.username ?? 'none'}</span>
      <button type="button" onClick={clearSession}>
        clear
      </button>
    </div>
  );
}

describe('AuthContext', () => {
  it('loads current user on mount', async () => {
    vi.spyOn(authService, 'getCurrentUser').mockResolvedValue(mockUser);

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    expect(screen.getByText('loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('username')).toHaveTextContent('alice'));
  });

  it('sets user to null when getCurrentUser fails', async () => {
    vi.spyOn(authService, 'getCurrentUser').mockRejectedValue(new Error('network'));

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('username')).toHaveTextContent('none'));
  });

  it('clearSession removes user from context', async () => {
    vi.spyOn(authService, 'getCurrentUser').mockResolvedValue(mockUser);
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('username')).toHaveTextContent('alice'));
    await user.click(screen.getByRole('button', { name: 'clear' }));
    expect(screen.getByTestId('username')).toHaveTextContent('none');
  });

  it('throws when useAuth is used outside provider', () => {
    const Broken = () => {
      useAuth();
      return null;
    };

    expect(() => render(<Broken />)).toThrow(/AuthProvider/);
  });
});
