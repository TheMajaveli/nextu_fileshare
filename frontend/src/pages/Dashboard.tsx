import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToasts } from '../context/ToastContext';
import { Link } from 'react-router-dom';
import { 
  listMyFiles, 
  listSharedWithMe, 
  uploadFile, 
  deleteFile, 
  shareFile, 
  revokeShare, 
  listUsers,
  ApiError,
} from '../services/api';
import { 
  FileExtension, 
  FileItem, 
  UserSummary,
} from '../types';
import { getRoleLabel } from '../utils/roles';
import { 
  ShieldCheck, 
  UserCheck, 
  Folder, 
  Share2, 
  Download, 
  Trash2, 
  UploadCloud, 
  Users, 
  Search, 
  X, 
  Clock, 
  Layers, 
  HardDrive,
  FileText,
  FileCheck,
  Music,
  Video,
  AlertTriangle,
  FolderOpen,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EmptyState } from '../components/EmptyState';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToasts();
  const queryClient = useQueryClient();

  // Navigation State
  const [activeTab, setActiveTab] = useState<'my-files' | 'shared'>('my-files');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [shareFileItem, setShareFileItem] = useState<FileItem | null>(null);
  const [deleteFileItem, setDeleteFileItem] = useState<FileItem | null>(null);

  // Queries
  const { data: myFiles, isLoading: loadingMyFiles, isError: myFilesError } = useQuery({
    queryKey: ['myFiles', user?.id],
    queryFn: listMyFiles,
    enabled: !!user?.id,
  });

  const { data: sharedFiles, isLoading: loadingSharedFiles, isError: sharedFilesError } = useQuery({
    queryKey: ['sharedFiles', user?.id],
    queryFn: listSharedWithMe,
    enabled: !!user?.id,
  });

  const { data: directoryUsers } = useQuery({
    queryKey: ['directoryUsers'],
    queryFn: listUsers,
    enabled: !!user?.id && !!shareFileItem, // On charge seulement si le partage est ouvert
  });

  // Mutateurs
  const uploadMutation = useMutation({
    mutationFn: uploadFile,
    onSuccess: (newFile) => {
      queryClient.invalidateQueries({ queryKey: ['myFiles'] });
      showToast(`Fichier "${newFile.filename}" téléversé avec succès !`, 'success');
      setIsUploadOpen(false);
    },
    onError: (err: unknown) => {
      const message = err instanceof ApiError ? err.message : 'Erreur lors de l\'envoi du fichier.';
      showToast(message, 'error');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myFiles'] });
      showToast('Le fichier a été définitivement supprimé.', 'success');
      setDeleteFileItem(null);
    },
    onError: (err: unknown) => {
      const message = err instanceof ApiError ? err.message : 'Échec de la suppression.';
      showToast(message, 'error');
    }
  });

  const shareMutation = useMutation({
    mutationFn: ({ fileId, targetUserId }: { fileId: string; targetUserId: string }) => shareFile(fileId, targetUserId),
    onSuccess: (updatedFile) => {
      queryClient.invalidateQueries({ queryKey: ['myFiles'] });
      // Mettre à jour l'état local du modal de partage pour refléter la liste mise à jour en temps réel
      setShareFileItem(updatedFile);
      showToast('Accès de partage accordé avec succès !', 'success');
    },
    onError: (err: unknown) => {
      const message = err instanceof ApiError ? err.message : 'Erreur lors du partage.';
      showToast(message, 'error');
    }
  });

  const revokeMutation = useMutation({
    mutationFn: ({ fileId, targetUserId }: { fileId: string; targetUserId: string }) => revokeShare(fileId, targetUserId),
    onSuccess: (updatedFile) => {
      queryClient.invalidateQueries({ queryKey: ['myFiles'] });
      setShareFileItem(updatedFile);
      showToast('Accès révoqué avec succès.', 'success');
    },
    onError: (err: unknown) => {
      const message = err instanceof ApiError ? err.message : 'Erreur lors de la révocation.';
      showToast(message, 'error');
    }
  });

  // Helper pour formater la taille du fichier
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Octet';
    const k = 1024;
    const sizes = ['Octets', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper pour obtenir la date formatée
  const formatDateFrench = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Obtenir l'icône et la couleur appropriées selon l'extension
  const getFileIconConfig = (ext: FileExtension) => {
    switch (ext) {
      case 'pdf':
        return { icon: FileText, bg: 'bg-rose-50 text-rose-600 border-rose-100', accent: 'text-rose-600' };
      case 'xlsx':
      case 'xls':
        return { icon: FileCheck, bg: 'bg-emerald-50 text-emerald-600 border-emerald-100', accent: 'text-emerald-600' };
      case 'doc':
      case 'docx':
        return { icon: FileText, bg: 'bg-blue-50 text-blue-600 border-blue-100', accent: 'text-blue-600' };
      case 'mp3':
        return { icon: Music, bg: 'bg-purple-50 text-purple-600 border-purple-100', accent: 'text-purple-600' };
      case 'mp4':
        return { icon: Video, bg: 'bg-violet-50 text-violet-600 border-violet-100', accent: 'text-violet-600' };
      default:
        return { icon: Folder, bg: 'bg-slate-50 text-slate-600 border-slate-100', accent: 'text-slate-600' };
    }
  };

  const handleDownload = (fileId: string, filename: string) => {
    const link = document.createElement('a');
    link.href = `/api/files/${fileId}/download`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isAdmin = user?.roles.includes('ADMIN');

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="bg-white/95 border-b border-slate-200/80 sticky top-0 z-30 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                <Folder className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-base text-slate-900 tracking-tight block leading-tight font-display">NEXTU-FileShare</span>
                <span className="text-[10px] text-slate-500 block tracking-wider uppercase font-semibold">Espace documentaire sécurisé</span>
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
                    {user?.username.substring(0, 2)}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider leading-none">Connecté</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-sm font-semibold text-slate-850">{user?.username}</span>
                      {isAdmin ? (
                        <span className="bg-rose-50 border border-rose-200 text-[9px] text-rose-750 font-bold px-1.5 py-0.25 rounded">{getRoleLabel('ADMIN')}</span>
                      ) : (
                        <span className="bg-blue-50 border border-blue-200 text-[9px] text-blue-750 font-bold px-1.5 py-0.25 rounded">{getRoleLabel('USER')}</span>
                      )}
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
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Compte utilisateur</p>
                          <p className="text-xs font-semibold text-slate-700 truncate mt-0.5">{user?.email || `${user?.username}@nextu.fr`}</p>
                        </div>
                        
                        {isAdmin && (
                          <Link
                            to="/admin/users"
                            onClick={() => setIsUserDropdownOpen(false)}
                            className="w-full text-left px-4 py-2 text-xs font-semibold text-indigo-650 hover:bg-indigo-50/55 flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            <Users className="w-4 h-4 text-indigo-500" />
                            <span>Gérer les utilisateurs</span>
                          </Link>
                        )}
                        
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

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        
        {/* Banner with storage information */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl shadow-xl p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border border-indigo-700/10">
          <div className="space-y-1">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight font-display">Bonjour, {user?.username} !</h1>
            <p className="text-xs text-indigo-100/80 max-w-xl">
              Bienvenue sur votre espace de gestion documentaire sécurisé. Stockez et partagez des rapports, factures ou médias conformes aux politiques d'accès.
            </p>
          </div>
          
          <div className="flex gap-4 shrink-0">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-center gap-3">
              <HardDrive className="w-5 h-5 text-indigo-200" />
              <div>
                <span className="text-[10px] text-indigo-200 block uppercase font-bold tracking-wider">Quota partagé</span>
                <span className="text-xs font-bold block mt-0.5 text-white">Membres illimités</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-center gap-3">
              <Layers className="w-5 h-5 text-indigo-200" />
              <div>
                <span className="text-[10px] text-indigo-200 block uppercase font-bold tracking-wider">Limite unitaire</span>
                <span className="text-xs font-bold block mt-0.5 text-white">≤ 25 Mo / Fichier</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs - Mesh with permissions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-px">
          <div className="flex space-x-1 bg-slate-100/85 border border-slate-200/60 p-1.5 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('my-files')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'my-files'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/30'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/40'
              }`}
            >
              <FolderOpen className="w-4 h-4 text-indigo-600" />
              <span>Mes fichiers</span>
              {(myFiles && myFiles.length > 0) && (
                <span className="bg-indigo-100 text-indigo-700 text-[10px] h-5 px-1.5 rounded-full flex items-center justify-center font-bold border border-indigo-200">
                  {myFiles.length}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setActiveTab('shared')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'shared'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/30'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/40'
              }`}
            >
              <Share2 className="w-4 h-4 text-emerald-600" />
              <span>Partagés avec moi</span>
              {(sharedFiles && sharedFiles.length > 0) && (
                <span className="bg-emerald-100 text-emerald-700 text-[10px] h-5 px-1.5 rounded-full flex items-center justify-center font-bold border border-emerald-250">
                  {sharedFiles.length}
                </span>
              )}
            </button>

            {/* ADMISTRATEUR ONLY VIEW */}
            {isAdmin && (
              <Link
                to="/admin/users"
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 text-rose-650 hover:text-rose-750 hover:bg-rose-50"
              >
                <Users className="w-4 h-4" />
                <span>Utilisateurs (Admin)</span>
              </Link>
            )}
          </div>

          {/* Action Trigger for upload */}
          {activeTab === 'my-files' && (
            <button
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-550 active:bg-indigo-700 text-sm font-semibold text-white rounded-xl shadow-lg shadow-indigo-600/15 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-505 cursor-pointer w-full sm:w-auto"
            >
              <UploadCloud className="w-4.5 h-4.5" />
              <span>Téléverser un fichier</span>
            </button>
          )}
        </div>

        {/* Tab content screens */}
        <div className="bg-white rounded-3xl border border-slate-200/85 shadow-md overflow-hidden min-h-[300px]">
          {activeTab === 'my-files' ? (
            // TAB 1: OWN FILES
            loadingMyFiles ? (
              <div className="p-8 space-y-4">
                <div className="h-6 bg-slate-100 rounded-md w-1/5 animate-pulse"></div>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4 py-2.5 items-center">
                      <div className="w-9 h-9 rounded bg-slate-100 animate-pulse"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-100 rounded w-1/3 animate-pulse"></div>
                        <div className="h-3 bg-slate-100 rounded w-1/5 animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : myFilesError ? (
              <EmptyState
                icon={<AlertTriangle className="w-7 h-7 text-rose-500" />}
                title="Impossible de charger vos fichiers"
                description="Vérifiez votre connexion ou réessayez dans quelques instants."
              />
            ) : !myFiles?.length ? (
              <EmptyState
                icon={<Folder className="w-7 h-7 text-indigo-600" />}
                title="Aucun fichier sur votre espace"
                description="Ajoutez vos documents PDF, tableaux Excel, rapports Word ou fichiers média audios / vidéos."
                action={
                  <button
                    onClick={() => setIsUploadOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4" />
                    Sélectionner un premier fichier
                  </button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                {/* Desktop table view */}
                <table className="min-w-full divide-y divide-slate-100 text-left hidden md:table">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Nom du fichier</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Taille</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Ajouté le</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Partagé avec</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-transparent divide-y divide-slate-100">
                    {myFiles?.map((file) => {
                      const fileConf = getFileIconConfig(file.extension);
                      const FileIcon = fileConf.icon;
                      return (
                        <tr key={file.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4.5 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className={`h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 ${fileConf.bg}`}>
                                <FileIcon className="w-5 h-5" />
                              </div>
                              <div>
                                <span className="text-sm font-semibold text-slate-800 block max-w-sm truncate" title={file.filename}>
                                  {file.filename}
                                </span>
                                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                                  {file.extension}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4.5 whitespace-nowrap text-xs font-medium text-slate-650">
                            {formatBytes(file.sizeBytes)}
                          </td>
                          <td className="px-6 py-4.5 whitespace-nowrap text-xs text-slate-500 font-mono">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-slate-400" />
                              {formatDateFrench(file.createdAt)}
                            </span>
                          </td>
                          <td className="px-6 py-4.5 whitespace-nowrap">
                            {file.sharedWith.length === 0 ? (
                              <span className="text-slate-350 text-xs">—</span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <div className="flex -space-x-1.5 overflow-hidden">
                                  {file.sharedWith.slice(0, 3).map((share) => (
                                    <div 
                                      key={share.userId}
                                      className="inline-block h-6 w-6 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] font-bold text-indigo-650 flex items-center justify-center uppercase"
                                      title={`Partagé avec ${share.username}`}
                                    >
                                      {share.username.substring(0, 2)}
                                    </div>
                                  ))}
                                </div>
                                {file.sharedWith.length > 3 && (
                                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 rounded-full">
                                    +{file.sharedWith.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4.5 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2.5">
                              <button
                                onClick={() => handleDownload(file.id, file.filename)}
                                className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Télécharger le fichier"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              
                              <button
                                onClick={() => setShareFileItem(file)}
                                className="text-indigo-600 hover:text-indigo-850 p-1.5 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Gérer le partage"
                              >
                                <Share2 className="w-4 h-4" />
                              </button>
                              
                              <button
                                onClick={() => setDeleteFileItem(file)}
                                className="text-rose-600 hover:text-rose-750 p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Supprimer le fichier"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Mobile block card list view */}
                <div className="divide-y divide-slate-100 md:hidden block">
                  {myFiles?.map((file) => {
                    const fileConf = getFileIconConfig(file.extension);
                    const FileIcon = fileConf.icon;
                    return (
                      <div key={file.id} className="p-4 space-y-3.5">
                        <div className="flex items-start justify-between">
                          <div className="flex gap-3">
                            <div className={`h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 ${fileConf.bg}`}>
                              <FileIcon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-sm font-semibold text-slate-800 block truncate max-w-xs">{file.filename}</span>
                              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                                {formatBytes(file.sizeBytes)} • {file.extension.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-slate-100/85 pt-3 flex items-center justify-between text-xs text-slate-500">
                          <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                            <Clock className="w-3.5 h-3.5 text-slate-350" />
                            {new Date(file.createdAt).toLocaleDateString('fr-FR')}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleDownload(file.id, file.filename)}
                              className="text-slate-600 hover:text-slate-800 px-2.5 py-1 flex items-center gap-1 rounded-xl bg-slate-50 border border-slate-205 text-xs font-semibold"
                            >
                              <Download className="w-3.5 h-3.5 text-slate-550" />
                              <span>Télécharger</span>
                            </button>
                            <button
                              onClick={() => setShareFileItem(file)}
                              className="text-indigo-650 hover:text-indigo-805 px-2.5 py-1 flex items-center gap-1 rounded-xl bg-indigo-50 border border-indigo-150 text-xs font-semibold"
                            >
                              <Share2 className="w-3.5 h-3.5 text-indigo-550" />
                              <span>Partager</span>
                            </button>
                            <button
                              onClick={() => setDeleteFileItem(file)}
                              className="text-rose-600 hover:text-rose-705 p-1.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 rounded-xl"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {file.sharedWith.length > 0 && (
                          <div className="bg-slate-50/80 p-2.5 rounded-xl flex items-center justify-between text-[11px] border border-slate-100">
                            <span className="text-slate-400">Partagé avec :</span>
                            <span className="font-bold text-indigo-600">
                              {file.sharedWith.map((share) => share.username).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )) : (
              // TAB 2: SHARED WITH ME FILES
            loadingSharedFiles ? (
              <div className="p-8 space-y-4">
                <div className="h-6 bg-slate-100 rounded-md w-1/5 animate-pulse"></div>
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex gap-4 py-2.5 items-center">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 animate-pulse"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-100 rounded w-1/4 animate-pulse"></div>
                        <div className="h-3 bg-slate-100 rounded w-1/6 animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : sharedFilesError ? (
              <EmptyState
                icon={<AlertTriangle className="w-7 h-7 text-rose-500" />}
                title="Impossible de charger les fichiers partagés"
                description="Vérifiez votre connexion ou réessayez dans quelques instants."
              />
            ) : !sharedFiles?.length ? (
              <EmptyState
                icon={<Share2 className="w-7 h-7 text-emerald-600" />}
                title="Aucun fichier partagé avec vous"
                description="Les documents partagés par vos collaborateurs apparaîtront automatiquement ici."
              />
            ) : (
              <div className="overflow-x-auto">
                {/* Desktop table view */}
                <table className="min-w-full divide-y divide-slate-100 text-left hidden md:table">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Nom du fichier</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Taille</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Ajouté le</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Partagé par</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-transparent divide-y divide-slate-100">
                    {sharedFiles?.map((file) => {
                      const fileConf = getFileIconConfig(file.extension);
                      const FileIcon = fileConf.icon;
                      return (
                        <tr key={file.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4.5 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className={`h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 ${fileConf.bg}`}>
                                <FileIcon className="w-5 h-5" />
                              </div>
                              <div>
                                <span className="text-sm font-semibold text-slate-800 block max-w-sm truncate" title={file.filename}>
                                  {file.filename}
                                </span>
                                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                                  {file.extension}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4.5 whitespace-nowrap text-xs font-medium text-slate-650">
                            {formatBytes(file.sizeBytes)}
                          </td>
                          <td className="px-6 py-4.5 whitespace-nowrap text-xs text-slate-500 font-mono">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-slate-400" />
                              {formatDateFrench(file.createdAt)}
                            </span>
                          </td>
                          <td className="px-6 py-4.5 whitespace-nowrap">
                            <span className="text-xs bg-emerald-50 text-emerald-750 border border-emerald-100 font-extrabold px-2 py-1 rounded-lg">
                              {file.ownerUsername}
                            </span>
                          </td>
                          <td className="px-6 py-4.5 whitespace-nowrap text-right">
                            <button
                              onClick={() => handleDownload(file.id, file.filename)}
                              className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Télécharger le fichier partagé"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Mobile stacked list (Partagés avec moi) */}
                <div className="divide-y divide-slate-100 md:hidden block">
                  {sharedFiles?.map((file) => {
                    const fileConf = getFileIconConfig(file.extension);
                    const FileIcon = fileConf.icon;
                    return (
                      <div key={file.id} className="p-4 space-y-3.5">
                        <div className="flex items-start justify-between">
                          <div className="flex gap-3">
                            <div className={`h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 ${fileConf.bg}`}>
                              <FileIcon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-sm font-semibold text-slate-800 block truncate max-w-xs">{file.filename}</span>
                              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                                {formatBytes(file.sizeBytes)} • {file.extension.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-slate-100/80 pt-3 flex items-center justify-between text-xs text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <span className="text-slate-400 text-[11px] font-mono">Par :</span>
                            <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-150 px-1.5 py-0.5 rounded-lg">{file.ownerUsername}</span>
                          </span>

                          <button
                            onClick={() => handleDownload(file.id, file.filename)}
                            className="text-indigo-600 hover:text-indigo-755 font-bold flex items-center gap-1 hover:underline text-xs"
                          >
                            <Download className="w-4 h-4" />
                            <span>Télécharger</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      </main>

      {/* UPLOAD FILE MODAL */}
      <AnimatePresence>
        {isUploadOpen && (
          <UploadModal 
            onClose={() => setIsUploadOpen(false)}
            onUpload={(file) => uploadMutation.mutateAsync(file)}
            isPending={uploadMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* SHARE FILE MODAL */}
      <AnimatePresence>
        {shareFileItem && (
          <ShareModal 
            file={shareFileItem}
            directoryUsers={directoryUsers || []}
            onClose={() => setShareFileItem(null)}
            onShare={(targetUserId) => shareMutation.mutate({ fileId: shareFileItem.id, targetUserId })}
            onRevoke={(userId) => revokeMutation.mutate({ fileId: shareFileItem.id, targetUserId: userId })}
            sharePending={shareMutation.isPending}
            revokePending={revokeMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* DELETE FILE MODAL */}
      <AnimatePresence>
        {deleteFileItem && (
          <DeleteModal 
            file={deleteFileItem}
            onClose={() => setDeleteFileItem(null)}
            onConfirm={() => deleteMutation.mutate(deleteFileItem.id)}
            isPending={deleteMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Footer System Credits */}
      <footer className="bg-white border-t border-slate-200 mt-20 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-400">
          <p>© 2026 NEXTU-LILLE N4 • Plateforme de Gestion de Fichiers Securisée</p>
          <p className="mt-1">NEXTU-FileShare — Tous droits réservés</p>
        </div>
      </footer>
    </div>
  );
};


/* ==================== SUB-COMPONENTS ==================== */

// 1. UPLOAD FILE MODAL
interface UploadProps {
  onClose: () => void;
  onUpload: (file: File) => Promise<any>;
  isPending: boolean;
}

const UploadModal: React.FC<UploadProps> = ({ onClose, onUpload, isPending }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileSelected, setFileSelected] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Suffixes et tailles autorisés
  const allowedExtensions: FileExtension[] = ['pdf', 'xlsx', 'xls', 'doc', 'docx', 'mp3', 'mp4'];
  const maxSizeBytes = 25 * 1024 * 1024;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (file: File) => {
    setErrorMessage('');
    const dotIndex = file.name.lastIndexOf('.');
    const extension = (dotIndex !== -1 ? file.name.substring(dotIndex + 1).toLowerCase() : '') as FileExtension;

    if (!allowedExtensions.includes(extension)) {
      setErrorMessage(`Le format .${extension} n'est pas autorisé. Formats acceptés : ${allowedExtensions.join(', ')}`);
      return;
    }

    if (file.size > maxSizeBytes) {
      setErrorMessage(`Ce fichier dépasse la limite unitaire autorisée de 25 Mo (Taille : ${(file.size / (1024 * 1024)).toFixed(2)} Mo).`);
      return;
    }

    setFileSelected(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!fileSelected) return;
    try {
      await onUpload(fileSelected);
    } catch {
      // Error toast handled by parent mutation — keep modal open for retry
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" id="upload-file-modal">
      <div className="flex min-h-screen items-center justify-center p-4 text-center font-sans">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={isPending ? undefined : onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
        ></motion.div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative transform overflow-hidden rounded-2xl bg-[#090D14] text-left shadow-2xl transition-all w-full max-w-md border border-slate-900 z-10"
        >
          {/* Header */}
          <div className="bg-[#0C101A] px-6 py-4.5 border-b border-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-bold text-white font-sans">Téléverser un document</h3>
            </div>
            <button
              onClick={onClose}
              disabled={isPending}
              className="text-slate-450 hover:text-white p-1 rounded-lg hover:bg-slate-900 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-350 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {!fileSelected ? (
              // Drag & Drop Area
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[180px] ${
                  dragActive
                    ? 'border-indigo-500 bg-indigo-500/10 scale-[0.98]'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900/10'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.xlsx,.xls,.doc,.docx,.mp3,.mp4"
                  className="hidden"
                />
                <div className="p-3 bg-slate-900 rounded-2xl shadow-sm border border-slate-800 mb-3 text-slate-400">
                  <UploadCloud className="w-6 h-6 text-indigo-400" />
                </div>
                <p className="text-sm font-semibold text-slate-205">
                  Faites glisser votre fichier ou <span className="text-indigo-400 hover:underline">parcourez</span>
                </p>
                <p className="text-[11px] text-slate-450 mt-1.5 leading-relaxed">
                  Extensions autorisées : <strong>PDF, XLSX, XLS, DOC, DOCX, MP3, MP4</strong>
                </p>
                <p className="text-[10px] text-indigo-400 font-medium mt-1">Taille maximale : 25 Mo</p>
              </div>
            ) : (
              // File selected view
              <div className="bg-[#0F131E] border border-slate-850 rounded-2xl p-4.5 space-y-4">
                <div className="flex items-center justify-between gap-3 bg-slate-950 border border-slate-900 p-3 rounded-xl shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-white block truncate leading-tight">
                        {fileSelected.name}
                      </span>
                      <span className="text-[11px] text-slate-450 font-semibold block mt-0.5 font-mono">
                        {(fileSelected.size / (1024 * 1024)).toFixed(2)} Mo
                      </span>
                    </div>
                  </div>
                  
                  {!isPending && (
                    <button
                      onClick={() => setFileSelected(null)}
                      className="text-slate-450 hover:text-white p-1 hover:bg-slate-900 rounded-lg shrink-0 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {isPending && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-slate-400">
                      <span>Téléversement en cours...</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div className="bg-indigo-500 h-full w-full rounded-full animate-pulse" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer controls */}
          <div className="bg-[#0C101A] px-6 py-4.5 border-t border-slate-900 flex justify-end gap-3 rounded-b-2xl">
            <button
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-slate-350 hover:bg-slate-900 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              Annuler
            </button>
            {fileSelected && (
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-450 border-t-white rounded-full animate-spin"></div>
                    <span>Transmission...</span>
                  </>
                ) : (
                  <span>Confirmer le transfert</span>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};


// 2. SHARE MODAL
interface ShareProps {
  file: FileItem;
  directoryUsers: UserSummary[];
  onClose: () => void;
  onShare: (targetUserId: string) => Promise<any>;
  onRevoke: (targetUserId: string) => Promise<any>;
  sharePending: boolean;
  revokePending: boolean;
}

const ShareModal: React.FC<ShareProps> = ({ 
  file, 
  directoryUsers, 
  onClose, 
  onShare, 
  onRevoke,
  sharePending,
  revokePending
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrer l'annuaire pour enlever :
  // - le propriétaire du fichier (soit l'utilisateur actif loggé)
  // - les utilisateurs avec qui le fichier de travail est déjà expressément partagé
  const eligibleUsers = directoryUsers.filter((u) => {
    const isOwner = u.id === file.ownerId;
    const isAlreadyShared = file.sharedWith.some((shared) => shared.userId === u.id);
    const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase());
    return !isOwner && !isAlreadyShared && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" id="share-file-modal">
      <div className="flex min-h-screen items-center justify-center p-4 text-center font-sans">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
        ></motion.div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative transform overflow-hidden rounded-2xl bg-[#090D14] text-left shadow-2xl transition-all w-full max-w-md border border-slate-900 z-10"
        >
          {/* Header */}
          <div className="bg-[#0C101A] px-6 py-4.5 border-b border-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-indigo-450" />
              <div>
                <h3 className="text-base font-bold text-white font-sans leading-tight">Autorisations de partage</h3>
                <span className="text-[10px] text-slate-450 font-bold block truncate max-w-[280px]">Fichier : {file.filename}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-450 hover:text-white p-1 rounded-lg hover:bg-slate-900 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            
            {/* SEARCH DIRECTORY COMPONENT */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">
                Accorder un nouvel accès (Recherche)
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher par nom ou email d'utilisateur..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white rounded-xl text-sm outline-none transition-all placeholder-flat-dark"
                />
              </div>

              {/* Suggestions dropdown list */}
              {searchTerm && (
                <div className="border border-slate-900 rounded-xl bg-slate-950 max-h-[140px] overflow-y-auto divide-y divide-slate-900 shadow-xl">
                  {eligibleUsers.length === 0 ? (
                    <p className="text-xs text-slate-450 p-3 italic text-center">Aucun destinataire éligible trouvé.</p>
                  ) : (
                    eligibleUsers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          onShare(u.id);
                          setSearchTerm('');
                        }}
                        disabled={sharePending}
                        className="w-full text-left px-4 py-2.5 hover:bg-[#121927] flex justify-between items-center transition-colors text-xs cursor-pointer text-slate-200"
                      >
                        <div>
                          <span className="font-semibold text-slate-205 block">{u.username}</span>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                          Inviter
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* LIST OF ALREADY SHARED USERS */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">
                Liste des habilitations actives ({file.sharedWith.length})
              </label>
              
              {file.sharedWith.length === 0 ? (
                <div className="bg-slate-900/30 rounded-2xl border border-slate-900 p-4 text-center">
                  <p className="text-xs text-slate-450 italic">Ce document n'est partagé avec aucun autre collaborateur.</p>
                </div>
              ) : (
                <div className="border border-slate-900 rounded-xl bg-slate-950/50 max-h-[180px] overflow-y-auto divide-y divide-slate-900">
                  {file.sharedWith.map((share) => (
                    <div key={share.userId} className="p-3 flex justify-between items-center flex-wrap gap-2 hover:bg-[#0E1321]/45 transition-colors">
                      <div>
                        <span className="text-xs font-semibold text-slate-150 block">{share.username}</span>
                        <span className="text-[10px] text-slate-455 block font-medium">Partagé le {new Date(share.sharedAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                      
                      <button
                        onClick={() => onRevoke(share.userId)}
                        disabled={revokePending}
                        className="text-[10px] font-bold text-rose-400 hover:text-rose-350 hover:bg-rose-550/10 border border-rose-500/15 rounded-lg px-2.5 py-1 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        {revokePending ? 'Révocation...' : 'Révoquer'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
          </div>

          <div className="bg-[#0C101A] px-6 py-4 border-t border-slate-900 flex justify-end gap-3 rounded-b-2xl">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-bold text-slate-300 bg-slate-900 border border-slate-850 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};


// 3. DELETE FILE MODAL
interface DeleteProps {
  file: FileItem;
  onClose: () => void;
  onConfirm: () => Promise<any>;
  isPending: boolean;
}

const DeleteModal: React.FC<DeleteProps> = ({ file, onClose, onConfirm, isPending }) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" id="delete-file-confirm-modal">
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
        ></motion.div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative transform overflow-hidden rounded-2xl bg-[#090D14] text-left shadow-2xl transition-all w-full max-w-sm border border-slate-900 z-10 p-6 font-sans"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white font-sans leading-tight">
                Supprimer le document
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Êtes-vous sûr de vouloir supprimer le document <strong>{file.filename}</strong> ?
              </p>
              <p className="text-[10px] text-rose-350 font-bold bg-rose-550/10 p-2.5 border border-rose-500/10 rounded-xl mt-3.5 leading-normal flex gap-1.5 items-start">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Cette action est irréversible et révoquera immédiatement tous les accès de partage.</span>
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-3.5 border-t border-slate-900">
            <button
              onClick={onClose}
              disabled={isPending}
              className="px-3.5 py-1.5 text-xs text-slate-350 hover:bg-slate-900 rounded-lg font-semibold transition-all cursor-pointer"
            >
              Conserver
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-550 active:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
            >
              {isPending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-450 border-t-white rounded-full animate-spin"></div>
                  <span>Suppression...</span>
                </>
              ) : (
                <span>Oui, le retirer</span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
