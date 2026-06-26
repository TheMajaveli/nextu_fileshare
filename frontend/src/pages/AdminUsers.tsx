import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listAllUsersAdmin, createUser, deleteUser, ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToasts } from '../context/ToastContext';
import { Link } from 'react-router-dom';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  ShieldAlert, 
  ArrowLeft, 
  Mail, 
  User, 
  ShieldCheck, 
  UserCheck, 
  Calendar,
  X,
  AlertTriangle,
  ChevronDown,
  LogOut,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Role } from '../types';
import { getRoleLabel } from '../utils/roles';
import { EmptyState } from '../components/EmptyState';

export const AdminUsers: React.FC = () => {
  const { user: currentUser, logout } = useAuth();
  const { showToast } = useToasts();
  const queryClient = useQueryClient();

  // Dialog State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; username: string } | null>(null);

  // Form State
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [roleInput, setRoleInput] = useState<Role>('USER');
  const [formError, setFormError] = useState('');

  // Fetch Users
  const { data: users, isLoading, error, isError } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: listAllUsersAdmin,
  });

  useEffect(() => {
    if (isError) {
      showToast('Erreur lors du chargement de l\'annuaire.', 'error');
    }
  }, [isError, error, showToast]);

  // Mutateurs TanStack Query
  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      const passwordHint = newUser.temporaryPassword
        ? ` Mot de passe temporaire : ${newUser.temporaryPassword}`
        : '';
      showToast(`Utilisateur ${newUser.username} créé avec succès.${passwordHint}`, 'success');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (err: unknown) => {
      const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Erreur lors de la création de l\'utilisateur.';
      showToast(message, 'error');
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['myFiles'] });
      showToast('Utilisateur supprimé avec succès.', 'success');
      setUserToDelete(null);
    },
    onError: (err: unknown) => {
      const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Erreur lors de la suppression.';
      showToast(message, 'error');
    }
  });

  const resetForm = () => {
    setUsernameInput('');
    setEmailInput('');
    setRoleInput('USER');
    setFormError('');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!usernameInput.trim()) {
      setFormError('Le nom d\'utilisateur est requis.');
      return;
    }
    if (!emailInput.trim()) {
      setFormError('L\'adresse email est requise.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput)) {
      setFormError('Veuillez renseigner une adresse email valide.');
      return;
    }

    createUserMutation.mutate({
      username: usernameInput.trim(),
      email: emailInput.trim(),
      role: roleInput
    });
  };

  const handleDeleteConfirm = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };

  const isAdmin = currentUser?.roles.includes('ADMIN');

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col font-sans">
      {/* Top Banner Nav */}
      <header className="bg-white/95 border-b border-slate-200/80 sticky top-0 z-30 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <Link to="/dashboard" className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-indigo-650" />
                </div>
                <span className="font-bold text-base text-slate-9 tracking-tight font-display">Console d'administration</span>
              </div>
            </div>
            
            {/* Profile Info & Logout Dropdown */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center gap-3 pl-3 pr-2.5 py-1.5 cursor-pointer select-none rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-205 transition-all text-left"
                >
                  <div className="h-9 w-9 rounded-xl bg-indigo-600 font-extrabold text-xs text-white flex items-center justify-center uppercase shrink-0">
                    {currentUser?.username.substring(0, 2)}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider leading-none">Admin actif</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-sm font-semibold text-slate-850">{currentUser?.username}</span>
                      <span className="bg-rose-50 border border-rose-200 text-[9px] text-rose-750 font-bold px-1.5 py-0.25 rounded">{getRoleLabel('ADMIN')}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </button>

                <AnimatePresence>
                  {isUserDropdownOpen && (
                    <>
                      {/* Invisible click backdrop to dismiss */}
                      <div 
                        className="fixed inset-0 z-40 cursor-default" 
                        onClick={() => setIsUserDropdownOpen(false)}
                      ></div>
                      
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-200/80 shadow-xl py-2.5 z-50 overflow-hidden font-sans"
                      >
                        <div className="px-4 py-2 border-b border-slate-100 mb-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Compte administratif</p>
                          <p className="text-xs font-semibold text-slate-700 truncate mt-0.5">{currentUser?.email || `${currentUser?.username}@nextu.fr`}</p>
                        </div>
                        
                        <Link
                          to="/dashboard"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-650 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Layers className="w-4 h-4 text-slate-500" />
                          <span>Retour aux fichiers</span>
                        </Link>
                        
                        <button
                          onClick={() => {
                            setIsUserDropdownOpen(false);
                            logout();
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-bold text-rose-605 hover:bg-rose-50 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <LogOut className="w-4 h-4 text-rose-500" />
                          <span>Se déconnecter</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-extrabold leading-7 text-slate-900 font-display sm:text-3xl sm:truncate flex items-center gap-3">
              <ShieldAlert className="w-7 h-7 text-indigo-600" />
              Gestion de l'Annuaire
            </h2>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed max-w-2xl">
              autorisés à utiliser NEXTU-FileShare.
            </p>
          </div>
          <div className="flex">
            <button
              onClick={() => {
                resetForm();
                setIsCreateOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-550 text-sm font-bold text-white rounded-xl shadow-lg shadow-indigo-600/15 transition-all cursor-pointer w-full sm:w-auto"
            >
              <UserPlus className="w-4 h-4" />
              Créer un utilisateur
            </button>
          </div>
        </div>

        {/* Users Table / View list */}
        <div className="bg-white border border-slate-200/85 rounded-3xl shadow-md overflow-hidden">
          {isLoading ? (
            // Skeleton Loader
            <div className="p-6 space-y-4">
              <div className="h-6 bg-slate-100 rounded-md w-1/4 animate-pulse"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="grid grid-cols-4 gap-4 py-3">
                    <div className="h-4 bg-slate-100 rounded animate-pulse col-span-2"></div>
                    <div className="h-4 bg-slate-100 rounded animate-pulse"></div>
                    <div className="h-4 bg-slate-100 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : isError ? (
            <EmptyState
              icon={<ShieldAlert className="w-7 h-7 text-rose-500" />}
              title="Échec du chargement des données"
              description="Impossible de charger l'annuaire d'utilisateurs. Vérifiez vos accréditations."
            />
          ) : !users?.length ? (
            <EmptyState
              icon={<Users className="w-7 h-7 text-slate-400" />}
              title="Aucun utilisateur trouvé"
              description="Créez un nouvel utilisateur pour commencer à gérer l'annuaire."
              action={
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsCreateOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  Créer un utilisateur
                </button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              {/* Desktop view */}
              <table className="min-w-full divide-y divide-slate-100 text-left hidden sm:table">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Nom d'utilisateur</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Adresse Email</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Rôle</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Créé le</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-transparent divide-y divide-slate-100">
                  {users?.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4.5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${
                              u.roles.includes('ADMIN') ? 'bg-rose-550/10 border border-rose-500/20 text-rose-600' : 'bg-slate-100 border border-slate-200 text-slate-500'
                            }`}>
                              {u.username.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                              {u.username}
                              {isSelf && (
                                <span className="bg-slate-100 text-slate-500 border border-slate-200 text-[10px] px-1.5 py-0.25 font-bold rounded">
                                  Moi
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4.5 whitespace-nowrap">
                          <span className="text-sm text-slate-600">{u.email}</span>
                        </td>
                        <td className="px-6 py-4.5 whitespace-nowrap">
                          {u.roles.includes('ADMIN') ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-150 rounded-lg">
                              <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
                              {getRoleLabel('ADMIN')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-150 rounded-lg">
                              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                              {getRoleLabel('USER')}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4.5 whitespace-nowrap text-sm text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {new Date(u.createdAt).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </td>
                        <td className="px-6 py-4.5 whitespace-nowrap text-right text-sm">
                          <div className="relative group inline-block">
                            {isSelf ? (
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  disabled
                                  className="text-slate-300 cursor-not-allowed p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="absolute right-0 bottom-full mb-1 w-48 hidden group-hover:block bg-slate-800 text-white text-[10px] rounded-lg p-2 text-center shadow-md font-medium pointer-events-none z-10 leading-snug border border-slate-700">
                                  Sécurisé : Auto-suppression interdite
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setUserToDelete({ id: u.id, username: u.username })}
                                className="text-rose-600 hover:text-rose-750 p-2 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile stacked view */}
              <div className="divide-y divide-slate-100 sm:hidden block">
                {users?.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <div key={u.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3.5">
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${
                            u.roles.includes('ADMIN') ? 'bg-rose-50 text-rose-700 border border-rose-150' : 'bg-slate-100 border border-slate-200 text-slate-500'
                          }`}>
                            {u.username.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                              {u.username}
                              {isSelf && (
                                <span className="bg-slate-105 text-slate-500 border border-slate-200 text-[9px] px-1 py-0.25 font-bold rounded">
                                  Moi
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">{u.email}</div>
                          </div>
                        </div>
                        <div>
                          {u.roles.includes('ADMIN') ? (
                            <span className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-150 px-1.5 py-0.5 rounded-md">
                              {getRoleLabel('ADMIN')}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold bg-blue-50 text-blue-750 border border-blue-150 px-1.5 py-0.5 rounded-md">
                              {getRoleLabel('USER')}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Créé le {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                        
                        <div>
                          {isSelf ? (
                            <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-1 border border-slate-200 rounded">
                              Auto-suppression bloquée
                            </span>
                          ) : (
                            <button
                              onClick={() => setUserToDelete({ id: u.id, username: u.username })}
                              className="text-rose-600 hover:text-rose-750 font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer text-xs"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Supprimer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* CREATE USER MODAL */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto" id="create-user-modal">
            <div className="flex min-h-screen items-center justify-center p-4 text-center">
              {/* Overlay Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCreateOpen(false)}
                className="fixed inset-0 bg-black/55 backdrop-blur-sm transition-opacity"
              ></motion.div>

              {/* Modal Container */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all w-full max-w-md border border-slate-200/85 z-10"
              >
                {/* Header */}
                <div className="bg-white px-6 py-4.5 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-base font-bold text-slate-900 font-sans leading-tight">Créer un utilisateur</h3>
                  </div>
                  <button
                    onClick={() => setIsCreateOpen(false)}
                    className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form body */}
                <form onSubmit={handleCreateSubmit}>
                  <div className="px-6 py-5 space-y-4 bg-white">
                    {formError && (
                      <div className="p-3 bg-rose-50 border border-rose-150 rounded-xl text-rose-700 text-xs font-semibold flex gap-2 items-center">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{formError}</span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label htmlFor="username-input" className="block text-xs font-bold uppercase tracking-wider text-slate-900 font-sans">
                        Nom d'utilisateur
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4.5 w-4.5 text-indigo-500" />
                        <input
                          id="username-input"
                          type="text"
                          value={usernameInput}
                          onChange={(e) => setUsernameInput(e.target.value)}
                          placeholder="Ex: chloe.martin"
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="email-input" className="block text-xs font-bold uppercase tracking-wider text-slate-900 font-sans">
                        Adresse Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4.5 w-4.5 text-indigo-500" />
                        <input
                          id="email-input"
                          type="email"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="Ex: chloe.martin@nextu.fr"
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="block text-xs font-bold uppercase tracking-wider text-slate-900 font-sans">
                        Niveau d'accès
                      </span>
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => setRoleInput('USER')}
                          className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                            roleInput === 'USER'
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold ring-1 ring-indigo-500/10'
                              : 'bg-white border-slate-200 text-slate-900 hover:bg-indigo-50/50 hover:border-indigo-200'
                          }`}
                        >
                          <span className="text-xs block">{getRoleLabel('USER')}</span>
                          <span className="text-[9px] font-normal text-indigo-600 block mt-0.5">Accès collaborateur</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRoleInput('ADMIN')}
                          className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                            roleInput === 'ADMIN'
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-800 font-bold ring-1 ring-indigo-500/20'
                              : 'bg-white border-slate-200 text-slate-900 hover:bg-indigo-50/50 hover:border-indigo-200'
                          }`}
                        >
                          <span className="text-xs block">{getRoleLabel('ADMIN')}</span>
                          <span className="text-[9px] font-normal text-indigo-600 block mt-0.5">Accès administrateur</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white px-6 py-4.5 border-t border-slate-200 flex justify-end gap-3 rounded-b-2xl">
                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(false)}
                      className="px-4 py-2 text-slate-900 hover:bg-slate-100 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={createUserMutation.isPending}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-550 text-white font-bold rounded-xl text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                    >
                      {createUserMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin"></div>
                          <span>Création...</span>
                        </>
                      ) : (
                        <span>Enregistrer</span>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE MODAL */}
      <AnimatePresence>
        {userToDelete && (
          <div className="fixed inset-0 z-50 overflow-y-auto" id="delete-confirm-modal">
            <div className="flex min-h-screen items-center justify-center p-4 text-center">
              {/* Overlay Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setUserToDelete(null)}
                className="fixed inset-0 bg-black/55 backdrop-blur-sm transition-opacity"
              ></motion.div>

              {/* Modal Container */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all w-full max-w-sm border border-slate-200 z-10 p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-150 shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-sans leading-tight">
                      Confirmer la suppression
                    </h3>
                    <p className="text-xs text-slate-900 mt-2 leading-relaxed">
                      Êtes-vous sûr de vouloir de supprimer le compte de <strong className="text-indigo-700">{userToDelete?.username}</strong> de l'annuaire de fichiers ?
                    </p>
                    <p className="text-[11px] text-rose-750 font-bold bg-rose-50 p-2.5 border border-rose-105 rounded-lg mt-3">
                      ⚠️ Cette action est irréversible et d'autres partages associés seront révoqués.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setUserToDelete(null)}
                    className="px-3.5 py-1.5 text-xs text-slate-900 hover:bg-slate-100 rounded-lg font-semibold transition-all cursor-pointer"
                  >
                    Conserver
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={deleteUserMutation.isPending}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-550 text-white rounded-lg text-xs font-semibold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                  >
                    {deleteUserMutation.isPending ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-rose-400 border-t-white rounded-full animate-spin"></div>
                        <span>Suppression...</span>
                      </>
                    ) : (
                      <span>Oui, supprimer</span>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
