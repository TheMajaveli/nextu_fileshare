import { AppUser } from '../types';
import { notifyUnauthorized } from './sessionManager';

/**
 * Authentication via BFF session cookie.
 */

function submitLogoutRequest(): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = '/logout';
  document.body.appendChild(form);
  form.submit();
}

export async function login(): Promise<AppUser> {
  window.location.href = '/oauth2/authorization/keycloak';
  return new Promise(() => {});
}

export async function logout(): Promise<void> {
  submitLogoutRequest();
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
