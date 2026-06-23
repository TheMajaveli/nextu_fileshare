export type FileExtension = 'pdf' | 'xlsx' | 'xls' | 'doc' | 'docx' | 'mp3' | 'mp4';
export type Role = 'USER' | 'ADMIN';

export interface AppUser {
  id: string;          // Keycloak subject UUID
  username: string;
  email: string;
  roles: Role[];
  createdAt: string;   // ISO date
}

export interface FileShareEntry {
  userId: string;
  username: string;
  sharedAt: string;    // ISO date
}

export interface FileItem {
  id: string;
  filename: string;          // original filename, e.g. "rapport-q3.pdf"
  extension: FileExtension;
  sizeBytes: number;
  ownerId: string;
  ownerUsername: string;
  createdAt: string;         // ISO date
  sharedWith: FileShareEntry[];
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface CreateUserResponse {
  id: string;
  username: string;
  email: string;
  roles: Role[];
  createdAt: string;
  temporaryPassword: string;
}

export interface UserSummary {
  id: string;
  username: string;
}
