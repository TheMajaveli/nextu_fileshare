import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminUsers } from './AdminUsers';
import { mockAdmin, mockAuthenticatedUser, renderWithProviders } from '../test/test-utils';
import * as api from '../services/api';
import { AppUser } from '../types';

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof api>();
  return {
    ...actual,
    listAllUsersAdmin: vi.fn(),
    createUser: vi.fn(),
    deleteUser: vi.fn(),
  };
});

const users: AppUser[] = [
  {
    id: 'admin-1',
    username: 'admin',
    email: 'admin@nextu.fr',
    roles: ['ADMIN'],
    createdAt: '2026-01-01T10:00:00.000Z',
  },
  {
    id: 'user-2',
    username: 'bob',
    email: 'bob@nextu.fr',
    roles: ['USER'],
    createdAt: '2026-02-01T10:00:00.000Z',
  },
];

describe('AdminUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedUser(mockAdmin);
    vi.mocked(api.listAllUsersAdmin).mockResolvedValue(users);
  });

  it('renders user directory', async () => {
    renderWithProviders(<AdminUsers />);

    await waitFor(() => expect(screen.getByText('Gestion de l\'Annuaire')).toBeInTheDocument());
    expect(screen.getAllByText('bob').length).toBeGreaterThan(0);
    expect(screen.getAllByText('admin@nextu.fr').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Moi').length).toBeGreaterThan(0);
  });

  it('shows empty state when no users exist', async () => {
    vi.mocked(api.listAllUsersAdmin).mockResolvedValue([]);

    renderWithProviders(<AdminUsers />);

    await waitFor(() => expect(screen.getByText('Aucun utilisateur trouvé')).toBeInTheDocument());
  });

  it('validates create user form', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminUsers />);

    await waitFor(() => expect(screen.getAllByText('bob').length).toBeGreaterThan(0));
    const createButtons = screen.getAllByRole('button', { name: /Créer un utilisateur/i });
    await user.click(createButtons[0]);
    await user.click(screen.getByRole('button', { name: /Enregistrer/i }));

    expect(screen.getByText(/nom d'utilisateur est requis/i)).toBeInTheDocument();
    expect(api.createUser).not.toHaveBeenCalled();
  });

  it('creates a new user successfully', async () => {
    const user = userEvent.setup();
    vi.mocked(api.createUser).mockResolvedValue({
      id: 'user-3',
      username: 'chloe',
      email: 'chloe@nextu.fr',
      roles: ['USER'],
      createdAt: '2026-03-01T10:00:00.000Z',
      temporaryPassword: 'Temp123!',
    });

    renderWithProviders(<AdminUsers />);

    await waitFor(() => expect(screen.getAllByText('bob').length).toBeGreaterThan(0));
    const createButtons = screen.getAllByRole('button', { name: /Créer un utilisateur/i });
    await user.click(createButtons[0]);
    await waitFor(() => expect(screen.getByPlaceholderText('Ex: chloe.martin')).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText('Ex: chloe.martin'), 'chloe');
    await user.type(screen.getByPlaceholderText('Ex: chloe.martin@nextu.fr'), 'chloe@nextu.fr');
    await user.click(screen.getByRole('button', { name: /Enregistrer/i }));

    await waitFor(() => expect(api.createUser).toHaveBeenCalled());
    expect(vi.mocked(api.createUser).mock.calls[0][0]).toEqual({
      username: 'chloe',
      email: 'chloe@nextu.fr',
      role: 'USER',
    });
    expect(screen.getByText(/chloe créé avec succès/i)).toBeInTheDocument();
  });

  it('prevents deleting own account', async () => {
    renderWithProviders(<AdminUsers />);

    await waitFor(() => expect(screen.getAllByText('Moi').length).toBeGreaterThan(0));
    const disabledDeleteButtons = screen.getAllByRole('button', { name: '' }).filter(
      (btn) => btn.hasAttribute('disabled')
    );
    expect(disabledDeleteButtons.length).toBeGreaterThan(0);
  });

  it('deletes another user after confirmation', async () => {
    const user = userEvent.setup();
    vi.mocked(api.deleteUser).mockResolvedValue(undefined);

    renderWithProviders(<AdminUsers />);

    await waitFor(() => expect(screen.getAllByText('bob').length).toBeGreaterThan(0));

    const trashButtons = screen.getAllByRole('button').filter(
      (btn) => btn.querySelector('.lucide-trash2') && !btn.hasAttribute('disabled')
    );
    await user.click(trashButtons[0]);
    await user.click(screen.getByRole('button', { name: /Oui, supprimer/i }));

    await waitFor(() => expect(api.deleteUser).toHaveBeenCalled());
    expect(vi.mocked(api.deleteUser).mock.calls[0][0]).toBe('user-2');
    expect(screen.getByText(/Utilisateur supprimé avec succès/i)).toBeInTheDocument();
  });

  it('shows error toast when user list fails to load', async () => {
    vi.mocked(api.listAllUsersAdmin).mockRejectedValue(
      new api.ApiError('FORBIDDEN', 'Accès refusé')
    );

    renderWithProviders(<AdminUsers />);

    await waitFor(() =>
      expect(screen.getByText(/Erreur lors du chargement de l'annuaire/i)).toBeInTheDocument()
    );
  });
});
