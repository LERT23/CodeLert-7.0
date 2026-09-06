import React, { useState } from 'react';
import { loginWithGoogle } from '../../services/firebase.ts';
import { User } from '../../types.ts';
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck, X } from 'lucide-react';

interface GoogleAuthModalProps {
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({ onClose, onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await loginWithGoogle();
      if (user) {
        onLoginSuccess(user);
        onClose();
      } else {
        setError('Не вдалося отримати дані профілю. Спробуйте ще раз.');
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setError('Вікно входу було закрито до завершення авторизації.');
      } else if (code === 'auth/popup-blocked') {
        setError('Спливаюче вікно заблоковано браузером. Будь ласка, дозвольте pop-up для цього сайту.');
      } else if (code === 'auth/network-request-failed') {
        setError('Помилка мережі при з\'єднанні з сервісом Google Auth.');
      } else {
        setError(err?.message || 'Помилка авторизації через Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-neutral-100 font-sans relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-200 p-1 rounded-lg hover:bg-neutral-800 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-7 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center p-3 shadow-md mb-4">
            <svg className="w-full h-full" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          </div>

          <h2 className="text-xl font-bold mb-1 tracking-tight">Авторизація через Google</h2>
          <p className="text-xs text-neutral-400 mb-6 max-w-xs">
            Безпечний вхід через Firebase Auth для збереження ваших проектів, налаштувань та персональних даних.
          </p>

          {error && (
            <div className="w-full bg-red-950/50 border border-red-800/80 rounded-xl p-3 mb-5 flex items-start gap-2 text-left">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <span className="text-xs text-red-200">{error}</span>
            </div>
          )}

          <div className="w-full space-y-3 mb-6">
            <div className="flex items-center gap-3 p-3 bg-neutral-800/60 rounded-xl border border-neutral-700/60 text-left">
              <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-neutral-200 block">Офіційний Google OAuth 2.0</span>
                <span className="text-neutral-400 text-[11px]">Захищений токен Firebase Authentication</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-neutral-800/60 rounded-xl border border-neutral-700/60 text-left">
              <CheckCircle2 size={18} className="text-blue-400 shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-neutral-200 block">Синхронізація з хмарою Firestore</span>
                <span className="text-neutral-400 text-[11px]">Автоматичне резервування коду та сесій</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 px-4 bg-white hover:bg-neutral-100 text-neutral-900 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all shadow-lg active:scale-[0.99] disabled:opacity-60 cursor-pointer text-sm"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin text-neutral-700" />
                <span>Авторизація...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Увійти з Google</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="mt-3 text-xs text-neutral-400 hover:text-neutral-200 transition-colors py-1"
          >
            Продовжити як гість
          </button>
        </div>
      </div>
    </div>
  );
};
