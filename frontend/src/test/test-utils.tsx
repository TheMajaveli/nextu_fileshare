import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, MemoryRouterProps } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { AppUser } from '../types';
import { vi } from 'vitest';
import * as authService from '../services/auth';

export function mockLocationAssign() {
  const original = window.location;
  const href = { value: original.href };
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...original,
      get href() {
        return href.value;
      },
      set href(url: string) {
        href.value = url;
      },
    },
  });
  return {
    get href() {
      return href.value;
    },
    restore() {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: original,
      });
    },
  };
}


export const mockUser: AppUser = {
  id: 'user-1',
  username: 'alice',
  email: 'alice@nextu.fr',
  roles: ['USER'],
  createdAt: '2026-01-15T10:00:00.000Z',
};

export const mockAdmin: AppUser = {
  id: 'admin-1',
  username: 'admin',
  email: 'admin@nextu.fr',
  roles: ['ADMIN'],
  createdAt: '2026-01-01T10:00:00.000Z',
};

export function mockAuthenticatedUser(user: AppUser = mockUser) {
  vi.spyOn(authService, 'getCurrentUser').mockResolvedValue(user);
}

export function mockUnauthenticated() {
  vi.spyOn(authService, 'getCurrentUser').mockResolvedValue(null);
}

interface ProvidersOptions {
  routerProps?: MemoryRouterProps;
  queryClient?: QueryClient;
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  { routerProps, queryClient = createTestQueryClient() }: ProvidersOptions = {},
  renderOptions?: Omit<RenderOptions, 'wrapper'>
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <MemoryRouter {...routerProps}>{children}</MemoryRouter>
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    );
  }

  return {
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}
