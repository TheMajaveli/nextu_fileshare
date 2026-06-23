import { AppUser, CreateUserResponse, FileItem, Role } from '../types';
import { notifyUnauthorized } from './sessionManager';

/**
 * BFF API client — all calls use session cookies via the Vite dev proxy.
 */

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
  });

  if (response.status === 401) {
    notifyUnauthorized();
    throw new ApiError('UNAUTHORIZED', 'Session expirée ou non authentifiée.');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    let body: { error?: string; message?: string } = {};
    try {
      body = await response.json();
    } catch {
      body = { error: 'UNKNOWN', message: response.statusText || 'Erreur serveur' };
    }
    throw new ApiError(body.error || 'ERROR', body.message || 'Erreur serveur');
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function listMyFiles(): Promise<FileItem[]> {
  return apiFetch<FileItem[]>('/api/files');
}

export async function listSharedWithMe(): Promise<FileItem[]> {
  return apiFetch<FileItem[]>('/api/files/shared-with-me');
}

export async function uploadFile(file: File): Promise<FileItem> {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch<FileItem>('/api/files', {
    method: 'POST',
    body: formData,
  });
}

export async function deleteFile(fileId: string): Promise<void> {
  await apiFetch<void>(`/api/files/${fileId}`, { method: 'DELETE' });
}

export async function shareFile(fileId: string, targetUserId: string): Promise<FileItem> {
  return apiFetch<FileItem>(`/api/files/${fileId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetUserId }),
  });
}

export async function revokeShare(fileId: string, userId: string): Promise<FileItem> {
  return apiFetch<FileItem>(`/api/files/${fileId}/share/${userId}`, {
    method: 'DELETE',
  });
}

export async function listUsers(): Promise<AppUser[]> {
  return apiFetch<AppUser[]>('/api/users');
}

export async function listAllUsersAdmin(): Promise<AppUser[]> {
  return apiFetch<AppUser[]>('/api/admin/users');
}

export async function createUser(input: {
  username: string;
  email: string;
  role: Role;
}): Promise<CreateUserResponse> {
  return apiFetch<CreateUserResponse>('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function deleteUser(userId: string): Promise<void> {
  await apiFetch<void>(`/api/admin/users/${userId}`, { method: 'DELETE' });
}
