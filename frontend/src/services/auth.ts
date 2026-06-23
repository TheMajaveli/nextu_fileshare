import { AppUser, Role } from '../types';
import { notifyUnauthorized } from './sessionManager';

/**
 * Authentication via BFF session cookie (OAuth2 / Keycloak).
 */

export async function login(_username: string, _role: Role): Promise<AppUser> {
  window.location.href = '/oauth2/authorization/keycloak';
  return new Promise(() => {});
}

export async function logout(): Promise<void> {
  window.location.href = '/logout';
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const response = await fetch('/api/me', { credentials: 'include' });
  if (response.status === 401) {
    notifyUnauthorized();
    return null;
  }
  if (!response.ok) {
    const body = await parseErrorBody(response);
    throw new Error(body.message);
  }
  return response.json() as Promise<AppUser>;
}

async function parseErrorBody(response: Response): Promise<{ error: string; message: string }> {
  try {
    return await response.json();
  } catch {
    return { error: 'UNKNOWN', message: response.statusText || 'Erreur serveur' };
  }
}
