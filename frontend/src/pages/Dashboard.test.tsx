import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from './Dashboard';
import {
  mockAdmin,
  mockAuthenticatedUser,
  mockLocationAssign,
  mockUser,
  renderWithProviders,
} from '../test/test-utils';
import * as api from '../services/api';
import * as authService from '../services/auth';
import { FileItem } from '../types';

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof api>();
  return {
    ...actual,
    listMyFiles: vi.fn(),
    listSharedWithMe: vi.fn(),
    listUsers: vi.fn(),
    uploadFile: vi.fn(),
    deleteFile: vi.fn(),
    shareFile: vi.fn(),
    revokeShare: vi.fn(),
  };
});

const myFile: FileItem = {
  id: 'file-1',
  filename: 'rapport.pdf',
  extension: 'pdf',
  sizeBytes: 2048,
  ownerId: 'user-1',
  ownerUsername: 'alice',
  createdAt: '2026-01-15T10:00:00.000Z',
  sharedWith: [],
};

const sharedFile: FileItem = {
  id: 'file-2',
  filename: 'budget.xlsx',
  extension: 'xlsx',
  sizeBytes: 4096,
  ownerId: 'user-2',
  ownerUsername: 'bob',
  createdAt: '2026-01-20T10:00:00.000Z',
  sharedWith: [],
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedUser();
    vi.mocked(api.listMyFiles).mockResolvedValue([myFile]);
    vi.mocked(api.listSharedWithMe).mockResolvedValue([sharedFile]);
    vi.mocked(api.listUsers).mockResolvedValue([
      { id: 'user-2', username: 'bob' },
      { id: 'user-1', username: 'alice' },
    ]);
  });

  it('renders greeting and my files tab', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => expect(screen.getByText(/Bonjour, alice/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getAllByText('rapport.pdf').length).toBeGreaterThan(0));
    expect(screen.getByRole('button', { name: /Téléverser un fichier/i })).toBeInTheDocument();
  });

  it('shows empty state when user has no files', async () => {
    vi.mocked(api.listMyFiles).mockResolvedValue([]);

    renderWithProviders(<Dashboard />);

    await waitFor(() =>
      expect(screen.getByText('Aucun fichier sur votre espace')).toBeInTheDocument()
    );
  });

  it('switches to shared files tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Dashboard />);

    await waitFor(() => expect(screen.getByText(/Bonjour, alice/i)).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Partagés avec moi/i }));

    await waitFor(() => expect(screen.getAllByText('budget.xlsx').length).toBeGreaterThan(0));
    expect(screen.getAllByText('bob').length).toBeGreaterThan(0);
  });

  it('opens upload modal and validates file extension', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Dashboard />);

    await waitFor(() => expect(screen.getByText(/Bonjour, alice/i)).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Téléverser un fichier/i }));

    const input = document.querySelector('#upload-file-modal input[type="file"]') as HTMLInputElement;
    const invalidFile = new File(['bad'], 'virus.exe', { type: 'application/octet-stream' });

    fireEvent.change(input, { target: { files: [invalidFile] } });

    await waitFor(() =>
      expect(screen.getByText(/n'est pas autorisé/i)).toBeInTheDocument()
    );
    expect(screen.queryByRole('button', { name: /Confirmer le transfert/i })).not.toBeInTheDocument();
  });

  it.each(['pdf', 'xlsx', 'xls', 'doc', 'docx', 'mp3', 'mp4'] as const)(
    'accepts allowed extension .%s in upload modal',
    async (extension) => {
      const user = userEvent.setup();
      vi.mocked(api.uploadFile).mockResolvedValue({
        ...myFile,
        filename: `file.${extension}`,
        extension,
      });

      renderWithProviders(<Dashboard />);

      await waitFor(() => expect(screen.getByText(/Bonjour, alice/i)).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: /Téléverser un fichier/i }));

      const input = document.querySelector('#upload-file-modal input[type="file"]') as HTMLInputElement;
      const validFile = new File(['content'], `file.${extension}`, { type: 'application/octet-stream' });
      fireEvent.change(input, { target: { files: [validFile] } });

      await waitFor(() =>
        expect(screen.getByRole('button', { name: /Confirmer le transfert/i })).toBeInTheDocument()
      );
      expect(screen.queryByText(/n'est pas autorisé/i)).not.toBeInTheDocument();
    }
  );

  it('rejects files larger than 25 MB in upload modal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Dashboard />);

    await waitFor(() => expect(screen.getByText(/Bonjour, alice/i)).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Téléverser un fichier/i }));

    const input = document.querySelector('#upload-file-modal input[type="file"]') as HTMLInputElement;
    const oversized = new File([new ArrayBuffer(26 * 1024 * 1024)], 'big.pdf', {
      type: 'application/pdf',
    });
    fireEvent.change(input, { target: { files: [oversized] } });

    await waitFor(() =>
      expect(screen.getByText(/dépasse la limite unitaire autorisée de 25 Mo/i)).toBeInTheDocument()
    );
    expect(screen.queryByRole('button', { name: /Confirmer le transfert/i })).not.toBeInTheDocument();
  });

  it('uploads a valid file successfully', async () => {
    const user = userEvent.setup();
    vi.mocked(api.uploadFile).mockResolvedValue(myFile);

    renderWithProviders(<Dashboard />);

    await waitFor(() => expect(screen.getByText(/Bonjour, alice/i)).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Téléverser un fichier/i }));

    const input = document.querySelector('#upload-file-modal input[type="file"]') as HTMLInputElement;
    const validFile = new File(['pdf'], 'rapport.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [validFile] } });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Confirmer le transfert/i })).toBeInTheDocument()
    );
    await user.click(screen.getByRole('button', { name: /Confirmer le transfert/i }));

    await waitFor(() => expect(api.uploadFile).toHaveBeenCalled());
    expect(vi.mocked(api.uploadFile).mock.calls[0][0]).toBe(validFile);
    expect(screen.getByText(/téléversé avec succès/i)).toBeInTheDocument();
  });

  it('opens delete confirmation and deletes file', async () => {
    const user = userEvent.setup();
    vi.mocked(api.deleteFile).mockResolvedValue(undefined);

    renderWithProviders(<Dashboard />);

    await waitFor(() => expect(screen.getAllByTitle('Supprimer le fichier').length).toBeGreaterThan(0));
    const deleteButtons = screen.getAllByTitle('Supprimer le fichier');
    await user.click(deleteButtons[0]);
    await user.click(screen.getByRole('button', { name: /Oui, le retirer/i }));

    await waitFor(() => expect(api.deleteFile).toHaveBeenCalled());
    expect(vi.mocked(api.deleteFile).mock.calls[0][0]).toBe('file-1');
    expect(screen.getByText(/définitivement supprimé/i)).toBeInTheDocument();
  });

  it('opens share modal and shares with eligible user', async () => {
    const user = userEvent.setup();
    const updatedFile: FileItem = {
      ...myFile,
      sharedWith: [{ userId: 'user-2', username: 'bob', sharedAt: '2026-02-01T10:00:00.000Z' }],
    };
    vi.mocked(api.shareFile).mockResolvedValue(updatedFile);

    renderWithProviders(<Dashboard />);

    await waitFor(() => expect(screen.getAllByTitle('Gérer le partage').length).toBeGreaterThan(0));
    await user.click(screen.getAllByTitle('Gérer le partage')[0]);

    const searchInput = screen.getByPlaceholderText(/Rechercher par nom ou email/i);
    await user.type(searchInput, 'bob');
    await user.click(screen.getByRole('button', { name: /Inviter/i }));

    await waitFor(() =>
      expect(api.shareFile).toHaveBeenCalled()
    );
    expect(vi.mocked(api.shareFile).mock.calls[0]).toEqual(['file-1', 'user-2']);
    expect(screen.getByText(/Accès de partage accordé/i)).toBeInTheDocument();
  });

  it('revokes share from share modal when user is already shared', async () => {
    const user = userEvent.setup();
    const sharedFile: FileItem = {
      ...myFile,
      sharedWith: [{ userId: 'user-2', username: 'bob', sharedAt: '2026-02-01T10:00:00.000Z' }],
    };
    vi.mocked(api.listMyFiles).mockResolvedValue([sharedFile]);
    vi.mocked(api.revokeShare).mockResolvedValue({ ...sharedFile, sharedWith: [] });

    renderWithProviders(<Dashboard />);

    await waitFor(() => expect(screen.getAllByTitle('Gérer le partage').length).toBeGreaterThan(0));
    await user.click(screen.getAllByTitle('Gérer le partage')[0]);
    await user.click(screen.getByRole('button', { name: /Révoquer/i }));

    await waitFor(() => expect(api.revokeShare).toHaveBeenCalled());
    expect(vi.mocked(api.revokeShare).mock.calls[0]).toEqual(['file-1', 'user-2']);
    expect(screen.getByText(/Accès révoqué/i)).toBeInTheDocument();
  });

  it('shows admin navigation for admin users', async () => {
    mockAuthenticatedUser(mockAdmin);
    vi.mocked(api.listMyFiles).mockResolvedValue([]);

    renderWithProviders(<Dashboard />);

    await waitFor(() => expect(screen.getByText(/Bonjour, admin/i)).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /Utilisateurs \(Admin\)/i })).toBeInTheDocument();
    expect(screen.getByText('Administrateur')).toBeInTheDocument();
  });

  it('logs out from user dropdown', async () => {
    const user = userEvent.setup();
    const logoutSpy = vi.spyOn(authService, 'logout').mockImplementation(() => Promise.resolve());

    renderWithProviders(<Dashboard />);

    await waitFor(() => expect(screen.getByText(/Bonjour, alice/i)).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /al/i }));
    await user.click(screen.getByRole('button', { name: /Se déconnecter/i }));

    expect(logoutSpy).toHaveBeenCalledOnce();
  });
});
