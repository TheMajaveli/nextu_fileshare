import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastMessage } from '../types';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto delete after 4s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Container Toast */}
      <div className="fixed top-5 right-5 z-[100] flex flex-col gap-3 w-full max-w-sm pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`p-4 rounded-xl shadow-lg border pointer-events-auto flex gap-3 items-start justify-between backdrop-blur-md ${
                toast.type === 'success'
                  ? 'bg-emerald-50/95 text-emerald-800 border-emerald-200/50'
                  : toast.type === 'error'
                  ? 'bg-rose-50/95 text-rose-800 border-rose-200/50'
                  : 'bg-slate-50/95 text-slate-800 border-slate-200/55'
              }`}
            >
              <div className="flex gap-2.5 items-start">
                <div className="mt-0.5 shrink-0">
                  {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-600" />}
                  {toast.type === 'info' && <Info className="w-5 h-5 text-slate-600" />}
                </div>
                <div className="text-sm font-medium leading-tight">{toast.message}</div>
              </div>
              
              <button
                onClick={() => removeToast(toast.id)}
                className={`shrink-0 rounded-lg p-0.5 transition-colors focus:outline-none focus:ring-1 focus:ring-offset-2 ${
                  toast.type === 'success'
                    ? 'hover:bg-emerald-100 text-emerald-500'
                    : toast.type === 'error'
                    ? 'hover:bg-rose-100 text-rose-500'
                    : 'hover:bg-slate-100 text-slate-500'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToasts = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToasts doit être utilisé au sein d\'un ToastProvider');
  }
  return context;
};
