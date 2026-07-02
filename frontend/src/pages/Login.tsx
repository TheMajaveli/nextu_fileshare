import React from 'react';
import { Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { buildRegistrationUrl } from '../utils/registrationUrl';

const registrationUrl = buildRegistrationUrl();

export const Login: React.FC = () => {
  const handleLogin = () => {
    window.location.href = '/oauth2/authorization/keycloak';
  };

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center"
        >
          <div className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-605/30">
            <Shield className="h-8 w-8 text-white" />
          </div>
        </motion.div>

        <h2 className="mt-5 text-center text-3xl font-extrabold tracking-tight text-slate-900 font-display">
          NEXTU-FileShare
        </h2>
        <p className="mt-2 text-center text-xs uppercase tracking-wider text-slate-500 font-bold">
          Système sécurisé en ligne de gestion et partage de fichiers • Lille N4
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white py-8 px-6 shadow-xl rounded-3xl border border-slate-200/80"
        >
          <button
            type="button"
            onClick={handleLogin}
            className="w-full flex justify-center items-center gap-3 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-550 active:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Shield className="h-5 w-5 text-indigo-200" />
            <span>Se connecter</span>
          </button>

          {registrationUrl && (
            <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px' }}>
              Pas encore de compte ?{' '}
              <a
                href={registrationUrl}
                style={{ color: 'inherit', textDecoration: 'underline' }}
              >
                S'inscrire
              </a>
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
};
