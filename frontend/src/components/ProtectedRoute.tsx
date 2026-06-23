import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium text-sm">Chargement de la session sécurisée...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Rediriger vers login s'il n'y a pas d'utilisateur, en mémorisant l'original
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
