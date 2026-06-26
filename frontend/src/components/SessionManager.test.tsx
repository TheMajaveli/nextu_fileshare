import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { SessionManager } from './SessionManager';
import {
  mockAuthenticatedUser,
  mockUnauthenticated,
  renderWithProviders,
} from '../test/test-utils';
import * as sessionManager from '../services/sessionManager';
import * as authService from '../services/auth';
import { useAuth } from '../context/AuthContext';

function AuthStatus() {
  const { user, loading } = useAuth();
  if (loading) return <div>auth-loading</div>;
  return <div>auth-user:{user?.username ?? 'none'}</div>;
}

describe('SessionManager', () => {
  it('redirects to login on unauthorized API callback', async () => {
    mockAuthenticatedUser();

    renderWithProviders(
      <>
        <SessionManager />
        <AuthStatus />
        <Routes>
          <Route path="/" element={<div>home</div>} />
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </>,
      { routerProps: { initialEntries: ['/'] } }
    );

    await waitFor(() => expect(screen.getByText('auth-user:alice')).toBeInTheDocument());

    sessionManager.notifyUnauthorized();

    await waitFor(() => expect(screen.getByText('login page')).toBeInTheDocument());
    expect(screen.getByText('Votre session a expiré. Veuillez vous reconnecter.')).toBeInTheDocument();
  });

  it('revalidates session when tab becomes visible', async () => {
    mockAuthenticatedUser();
    const getCurrentUserSpy = vi.spyOn(authService, 'getCurrentUser');

    renderWithProviders(
      <>
        <SessionManager />
        <AuthStatus />
        <Routes>
          <Route path="/" element={<div>home</div>} />
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </>,
      { routerProps: { initialEntries: ['/'] } }
    );

    await waitFor(() => expect(screen.getByText('auth-user:alice')).toBeInTheDocument());
    getCurrentUserSpy.mockClear();
    getCurrentUserSpy.mockResolvedValue(null);

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    document.dispatchEvent(new Event('visibilitychange'));

    await waitFor(() => expect(screen.getByText('login page')).toBeInTheDocument());
  });

  it('ignores unauthorized callback when user is already logged out', async () => {
    mockUnauthenticated();

    renderWithProviders(
      <>
        <SessionManager />
        <AuthStatus />
        <Routes>
          <Route path="/" element={<div>home</div>} />
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </>,
      { routerProps: { initialEntries: ['/'] } }
    );

    await waitFor(() => expect(screen.getByText('auth-user:none')).toBeInTheDocument());

    sessionManager.notifyUnauthorized();

    expect(screen.getByText('home')).toBeInTheDocument();
    expect(screen.queryByText('Votre session a expiré. Veuillez vous reconnecter.')).not.toBeInTheDocument();
  });
});
