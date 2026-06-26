import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  createUser,
  deleteFile,
  deleteUser,
  listAllUsersAdmin,
  listMyFiles,
  listSharedWithMe,
  listUsers,
  revokeShare,
  shareFile,
  uploadFile,
} from './api';
import * as sessionManager from './sessionManager';
import { FileItem, AppUser } from '../types';

const sampleFile: FileItem = {
  id: 'file-1',
  filename: 'rapport.pdf',
  extension: 'pdf',
  sizeBytes: 1024,
  ownerId: 'user-1',
  ownerUsername: 'alice',
  createdAt: '2026-01-15T10:00:00.000Z',
  sharedWith: [],
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
    statusText: status === 204 ? 'No Content' : 'OK',
  } as Response;
}

describe('api service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('listMyFiles fetches /api/files with credentials', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse([sampleFile]));

    const files = await listMyFiles();

    expect(files).toEqual([sampleFile]);
    expect(fetch).toHaveBeenCalledWith('/api/files', { credentials: 'include' });
  });

  it('listSharedWithMe fetches shared files endpoint', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse([sampleFile]));

    await listSharedWithMe();

    expect(fetch).toHaveBeenCalledWith('/api/files/shared-with-me', { credentials: 'include' });
  });

  it('uploadFile posts multipart form data', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(sampleFile));
    const file = new File(['content'], 'rapport.pdf', { type: 'application/pdf' });

    const result = await uploadFile(file);

    expect(result).toEqual(sampleFile);
    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.body).toBeInstanceOf(FormData);
  });

  it('deleteFile sends DELETE request', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(undefined, 204));

    await deleteFile('file-1');

    expect(fetch).toHaveBeenCalledWith('/api/files/file-1', {
      credentials: 'include',
      method: 'DELETE',
    });
  });

  it('shareFile posts target user id', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(sampleFile));

    await shareFile('file-1', 'user-2');

    expect(fetch).toHaveBeenCalledWith('/api/files/file-1/share', {
      credentials: 'include',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: 'user-2' }),
    });
  });

  it('revokeShare deletes share for user', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(sampleFile));

    await revokeShare('file-1', 'user-2');

    expect(fetch).toHaveBeenCalledWith('/api/files/file-1/share/user-2', {
      credentials: 'include',
      method: 'DELETE',
    });
  });

  it('listUsers fetches user directory', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse([{ id: 'u1', username: 'bob' }]));

    const users = await listUsers();
    expect(users).toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith('/api/users', { credentials: 'include' });
  });

  it('listAllUsersAdmin fetches admin users', async () => {
    const adminUser: AppUser = {
      id: 'a1',
      username: 'admin',
      email: 'admin@nextu.fr',
      roles: ['ADMIN'],
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse([adminUser]));

    const users = await listAllUsersAdmin();
    expect(users[0].username).toBe('admin');
    expect(fetch).toHaveBeenCalledWith('/api/admin/users', { credentials: 'include' });
  });

  it('createUser posts new user payload', async () => {
    const created = {
      id: 'u2',
      username: 'bob',
      email: 'bob@nextu.fr',
      roles: ['USER'] as const,
      createdAt: '2026-02-01T00:00:00.000Z',
      temporaryPassword: 'Temp123!',
    };
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(created));

    const result = await createUser({ username: 'bob', email: 'bob@nextu.fr', role: 'USER' });

    expect(result.temporaryPassword).toBe('Temp123!');
    expect(fetch).toHaveBeenCalledWith('/api/admin/users', expect.objectContaining({ method: 'POST' }));
  });

  it('deleteUser sends DELETE to admin endpoint', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(undefined, 204));

    await deleteUser('u2');

    expect(fetch).toHaveBeenCalledWith('/api/admin/users/u2', {
      credentials: 'include',
      method: 'DELETE',
    });
  });

  it('throws ApiError on 401 and notifies session manager', async () => {
    const notifySpy = vi.spyOn(sessionManager, 'notifyUnauthorized');
    vi.spyOn(global, 'fetch').mockResolvedValue({
      status: 401,
      ok: false,
      headers: new Headers(),
      json: async () => ({}),
      statusText: 'Unauthorized',
    } as Response);

    await expect(listMyFiles()).rejects.toMatchObject({
      name: 'ApiError',
      code: 'UNAUTHORIZED',
    });
    expect(notifySpy).toHaveBeenCalledOnce();
  });

  it('throws ApiError with server message on failure', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      status: 400,
      ok: false,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ error: 'INVALID', message: 'Fichier invalide' }),
      statusText: 'Bad Request',
    } as Response);

    await expect(listMyFiles()).rejects.toEqual(
      expect.objectContaining<Partial<ApiError>>({
        code: 'INVALID',
        message: 'Fichier invalide',
      })
    );
  });
});
