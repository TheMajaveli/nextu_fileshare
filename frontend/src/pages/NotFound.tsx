import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50/70 flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xl text-center space-y-6"
      >
        <div className="mx-auto h-16 w-16 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center text-rose-600">
          <ShieldAlert className="w-8 h-8" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">Page non trouvée (404)</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            La ressource ou l'adresse demandée est introuvable ou vous n'avez pas les habilitations d'accès Keycloak requises.
          </p>
        </div>

        <div className="pt-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/15 hover:shadow transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Retourner au tableau de bord
          </Link>
        </div>
      </motion.div>
    </div>
  );
};
