import { AppUser, FileItem, FileExtension, Role } from '../types';

export const SEED_USERS: AppUser[] = [
  {
    id: 'user-alice-uuid',
    username: 'alice',
    email: 'alice@nextu.fr',
    roles: ['USER'],
    createdAt: '2026-01-15T09:30:00Z',
  },
  {
    id: 'user-bob-uuid',
    username: 'bob',
    email: 'bob@nextu.fr',
    roles: ['USER'],
    createdAt: '2026-02-12T14:15:00Z',
  },
  {
    id: 'user-admin-smith-uuid',
    username: 'admin.smith',
    email: 'admin.smith@nextu.fr',
    roles: ['ADMIN'],
    createdAt: '2025-12-01T08:00:00Z',
  },
];

export const SEED_FILES: FileItem[] = [
  {
    id: 'file-1',
    filename: 'rapport-financier-2026.xlsx',
    extension: 'xlsx',
    sizeBytes: 14200000,
    ownerId: 'user-alice-uuid',
    ownerUsername: 'alice',
    createdAt: '2026-05-10T10:00:00Z',
    sharedWith: [
      {
        userId: 'user-bob-uuid',
        username: 'bob',
        sharedAt: '2026-05-11T12:00:00Z',
      },
    ],
  },
  {
    id: 'file-2',
    filename: 'contrat-prestataire.pdf',
    extension: 'pdf',
    sizeBytes: 2340000,
    ownerId: 'user-alice-uuid',
    ownerUsername: 'alice',
    createdAt: '2026-06-01T15:30:00Z',
    sharedWith: [
      {
        userId: 'user-admin-smith-uuid',
        username: 'admin.smith',
        sharedAt: '2026-06-02T09:00:00Z',
      },
    ],
  },
  {
    id: 'file-3',
    filename: 'video-presentation.mp4',
    extension: 'mp4',
    sizeBytes: 22500000,
    ownerId: 'user-bob-uuid',
    ownerUsername: 'bob',
    createdAt: '2026-05-20T16:45:00Z',
    sharedWith: [
      {
        userId: 'user-alice-uuid',
        username: 'alice',
        sharedAt: '2026-05-21T10:30:00Z',
      },
    ],
  },
  {
    id: 'file-4',
    filename: 'notes-reunion.docx',
    extension: 'docx',
    sizeBytes: 450000,
    ownerId: 'user-bob-uuid',
    ownerUsername: 'bob',
    createdAt: '2026-06-18T11:00:00Z',
    sharedWith: [],
  },
  {
    id: 'file-5',
    filename: 'schema-infrastructure.pdf',
    extension: 'pdf',
    sizeBytes: 5120000,
    ownerId: 'user-admin-smith-uuid',
    ownerUsername: 'admin.smith',
    createdAt: '2026-04-05T08:15:00Z',
    sharedWith: [
      {
        userId: 'user-alice-uuid',
        username: 'alice',
        sharedAt: '2026-04-06T14:00:00Z',
      },
      {
        userId: 'user-bob-uuid',
        username: 'bob',
        sharedAt: '2026-04-06T14:05:00Z',
      },
    ],
  },
  {
    id: 'file-6',
    filename: 'podcast-comm.mp3',
    extension: 'mp3',
    sizeBytes: 18300000,
    ownerId: 'user-admin-smith-uuid',
    ownerUsername: 'admin.smith',
    createdAt: '2026-06-10T17:00:00Z',
    sharedWith: [],
  },
  {
    id: 'file-7',
    filename: 'planning-q3.xlsx',
    extension: 'xlsx',
    sizeBytes: 1200000,
    ownerId: 'user-alice-uuid',
    ownerUsername: 'alice',
    createdAt: '2026-06-20T09:00:00Z',
    sharedWith: [],
  },
  {
    id: 'file-8',
    filename: 'rapport-audit.doc',
    extension: 'doc',
    sizeBytes: 980000,
    ownerId: 'user-bob-uuid',
    ownerUsername: 'bob',
    createdAt: '2026-06-21T13:20:00Z',
    sharedWith: [],
  },
];

const LOCAL_STORAGE_USERS_KEY = 'nextu_fileshare_users';
const LOCAL_STORAGE_FILES_KEY = 'nextu_fileshare_files';
const LOCAL_STORAGE_CURRENT_USER_KEY = 'nextu_fileshare_current_user';

export function getStoredUsers(): AppUser[] {
  const data = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
  if (!data) {
    localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(SEED_USERS));
    return SEED_USERS;
  }
  return JSON.parse(data);
}

export function saveStoredUsers(users: AppUser[]): void {
  localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
}

export function getStoredFiles(): FileItem[] {
  const data = localStorage.getItem(LOCAL_STORAGE_FILES_KEY);
  if (!data) {
    localStorage.setItem(LOCAL_STORAGE_FILES_KEY, JSON.stringify(SEED_FILES));
    return SEED_FILES;
  }
  return JSON.parse(data);
}

export function saveStoredFiles(files: FileItem[]): void {
  localStorage.setItem(LOCAL_STORAGE_FILES_KEY, JSON.stringify(files));
}

export function getActiveUser(): AppUser | null {
  const data = localStorage.getItem(LOCAL_STORAGE_CURRENT_USER_KEY);
  return data ? JSON.parse(data) : null;
}

export function setActiveUser(user: AppUser | null): void {
  if (user) {
    localStorage.setItem(LOCAL_STORAGE_CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(LOCAL_STORAGE_CURRENT_USER_KEY);
  }
}

// Simple deterministic latency generator
export const delay = (ms?: number) => {
  const time = ms ?? Math.floor(Math.random() * 400) + 400; // 400-800ms as requested
  return new Promise((resolve) => setTimeout(resolve, time));
};
