import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { mockAuthenticatedUser, mockUnauthenticated, renderWithProviders } from '../test/test-utils';

describe('ProtectedRoute', () => {
  it('shows loading state while auth initializes', () => {
    mockUnauthenticated();

    renderWithProviders(
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div>secret</div>
            </ProtectedRoute>
          }
        />
      </Routes>,
      { routerProps: { initialEntries: ['/'] } }
    );

    expect(screen.getByText('Chargement...')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to login', async () => {
    mockUnauthenticated();

    renderWithProviders(
      <Routes>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>secret</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>login page</div>} />
      </Routes>,
      { routerProps: { initialEntries: ['/dashboard'] } }
    );

    await waitFor(() => expect(screen.getByText('login page')).toBeInTheDocument());
  });

  it('renders children for authenticated users', async () => {
    mockAuthenticatedUser();

    renderWithProviders(
      <Routes>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>secret content</div>
            </ProtectedRoute>
          }
        />
      </Routes>,
      { routerProps: { initialEntries: ['/dashboard'] } }
    );

    await waitFor(() => expect(screen.getByText('secret content')).toBeInTheDocument());
  });
});
