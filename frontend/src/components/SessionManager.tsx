import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToasts } from '../context/ToastContext';
import { setUnauthorizedHandler } from '../services/sessionManager';
import * as authService from '../services/auth';

/**
 * Keeps the SPA in sync with the BFF session cookie:
 * - 401 from any API call → clear state and redirect to login
 * - tab refocus → revalidate session with /api/me
 */
export const SessionManager: React.FC = () => {
  const { user, clearSession } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToasts();
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    let sessionExpiredHandled = false;

    const handleUnauthorized = () => {
      if (sessionExpiredHandled || !userRef.current) {
        return;
      }
      sessionExpiredHandled = true;
      clearSession();
      queryClient.clear();
      showToast('Votre session a expiré. Veuillez vous reconnecter.', 'info');
      navigate('/login', { replace: true, state: { reason: 'session-expired' } });
    };

    setUnauthorizedHandler(handleUnauthorized);
    return () => setUnauthorizedHandler(null);
  }, [clearSession, navigate, queryClient, showToast]);

  useEffect(() => {
    const revalidateSession = async () => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      try {
        const active = await authService.getCurrentUser();
        if (!active && userRef.current) {
          clearSession();
          queryClient.clear();
          showToast('Votre session a expiré. Veuillez vous reconnecter.', 'info');
          navigate('/login', { replace: true, state: { reason: 'session-expired' } });
        }
      } catch {
        // Network errors are ignored on background refresh
      }
    };

    document.addEventListener('visibilitychange', revalidateSession);
    window.addEventListener('focus', revalidateSession);
    return () => {
      document.removeEventListener('visibilitychange', revalidateSession);
      window.removeEventListener('focus', revalidateSession);
    };
  }, [clearSession, navigate, queryClient, showToast]);

  return null;
};
