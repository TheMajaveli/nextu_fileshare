import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCurrentUser, login, logout } from './auth';
import * as sessionManager from './sessionManager';
import { mockLocationAssign, mockUser } from '../test/test-utils';

describe('auth service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('login redirects to Keycloak OAuth2 endpoint', async () => {
    const location = mockLocationAssign();

    const pending = login();
    expect(location.href).toBe('/oauth2/authorization/keycloak');
    location.restore();
    await expect(Promise.race([pending, Promise.resolve('never-resolves')])).resolves.toBe('never-resolves');
  });

  it('logout submits POST to /logout', () => {
    const submitSpy = vi.fn();
    const form = { method: '', action: '', submit: submitSpy } as unknown as HTMLFormElement;
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(form);
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);

    logout();

    expect(form.method).toBe('POST');
    expect(form.action).toBe('/logout');
    expect(submitSpy).toHaveBeenCalledOnce();

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
  });

  it('getCurrentUser returns user on success', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => mockUser,
    } as Response);

    await expect(getCurrentUser()).resolves.toEqual(mockUser);
    expect(fetch).toHaveBeenCalledWith('/api/me', { credentials: 'include' });
  });

  it('getCurrentUser returns null and notifies on 401', async () => {
    const notifySpy = vi.spyOn(sessionManager, 'notifyUnauthorized');
    vi.spyOn(global, 'fetch').mockResolvedValue({
      status: 401,
      ok: false,
    } as Response);

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(notifySpy).toHaveBeenCalledOnce();
  });

  it('getCurrentUser throws on other errors', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      status: 500,
      ok: false,
      statusText: 'Internal Server Error',
      json: async () => ({ error: 'ERROR', message: 'Serveur indisponible' }),
    } as Response);

    await expect(getCurrentUser()).rejects.toThrow('Serveur indisponible');
  });
});
