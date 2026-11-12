'use client';
import { useState, useEffect } from 'react';
import { Lock, KeyRound } from 'lucide-react';

export default function AdminAuthModal({ onAuthenticated }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const sessionAuth = sessionStorage.getItem('admin_auth_smkn1');
    if (sessionAuth === 'true') {
      setIsAuth(true);
      onAuthenticated();
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'admin123') {
      sessionStorage.setItem('admin_auth_smkn1', 'true');
      setIsAuth(true);
      onAuthenticated();
    } else {
      setError(true);
      setPassword('');
    }
  };

  if (isAuth) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-40">
      <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl text-center border border-slate-100">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Autentikasi Admin</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          Halaman ini khusus dikelola oleh Guru Piket / Administrator. Masukkan password admin untuk melanjutkan.
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <KeyRound className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              placeholder="Masukkan Password Admin..."
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              required
              autoFocus
              className="w-full pl-12 pr-4 py-3 rounded-full bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          {error && <p className="text-xs text-rose-500 font-semibold">Password salah! (Default: admin123)</p>}

          <button
            type="submit"
            className="w-full py-3 rounded-full bg-gradient-to-r from-blue-600 to-teal-500 text-white font-bold text-sm shadow-md hover:opacity-95 transition-all"
          >
            Masuk sebagai Admin
          </button>
        </form>
      </div>
    </div>
  );
}
