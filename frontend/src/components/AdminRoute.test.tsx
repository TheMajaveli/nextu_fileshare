import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { AdminRoute } from './AdminRoute';
import { mockAdmin, mockAuthenticatedUser, mockUnauthenticated, renderWithProviders } from '../test/test-utils';

describe('AdminRoute', () => {
  it('redirects non-admin users to dashboard with toast', async () => {
    mockAuthenticatedUser();

    renderWithProviders(
      <Routes>
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <div>admin panel</div>
            </AdminRoute>
          }
        />
        <Route path="/dashboard" element={<div>dashboard</div>} />
      </Routes>,
      { routerProps: { initialEntries: ['/admin/users'] } }
    );

    await waitFor(() => expect(screen.getByText('dashboard')).toBeInTheDocument());
    expect(screen.getByText('Accès réservé aux administrateurs')).toBeInTheDocument();
  });

  it('renders children for admin users', async () => {
    mockAuthenticatedUser(mockAdmin);

    renderWithProviders(
      <Routes>
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <div>admin panel</div>
            </AdminRoute>
          }
        />
      </Routes>,
      { routerProps: { initialEntries: ['/admin/users'] } }
    );

    await waitFor(() => expect(screen.getByText('admin panel')).toBeInTheDocument());
  });

  it('redirects unauthenticated users to login', async () => {
    mockUnauthenticated();

    renderWithProviders(
      <Routes>
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <div>admin panel</div>
            </AdminRoute>
          }
        />
        <Route path="/login" element={<div>login page</div>} />
      </Routes>,
      { routerProps: { initialEntries: ['/admin/users'] } }
    );

    await waitFor(() => expect(screen.getByText('login page')).toBeInTheDocument());
  });
});
