import React from 'react';
import { Shield, KeyRound, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const Login: React.FC = () => {
  const handleKeycloakLogin = () => {
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
          <div className="mb-6 rounded-2xl bg-indigo-50/50 border border-indigo-100 p-4 shadow-sm">
            <div className="flex gap-3">
              <KeyRound className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-800">Connexion Keycloak</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Vous serez redirigé vers Keycloak pour vous authentifier, puis renvoyé vers le tableau de bord.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleKeycloakLogin}
            className="w-full flex justify-center items-center gap-3 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-550 active:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Shield className="h-5 w-5 text-indigo-200" />
            <span>Se connecter avec Keycloak</span>
          </button>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex gap-2 rounded-xl bg-slate-50 border border-slate-200 p-4">
              <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-600 leading-relaxed space-y-1">
                <p className="font-bold text-slate-700">Comptes de démo (realm nextu-files)</p>
                <p><strong>alice</strong> / <strong>bob</strong> — mot de passe : <code className="text-pink-600">password</code></p>
                <p><strong>admin.smith</strong> — admin, mot de passe : <code className="text-pink-600">password</code></p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
