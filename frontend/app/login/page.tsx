'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (username === 'admin' && password === 'sentinela2026') {
        localStorage.setItem('sentinela_auth', 'true');
        localStorage.setItem('sentinela_user', JSON.stringify({ username: "admin", name: "Admin", role: "admin" }));
        router.push('/');
        return;
      }

      const { db } = await import('../../lib/firebase');
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      
      const q = query(collection(db, 'users'), where('username', '==', username));
      const querySnapshot = await getDocs(q);
      
      let authenticated = false;
      let userData = null;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.password === password) {
          authenticated = true;
          userData = data;
        }
      });
      
      if (!authenticated) {
        setError('Usuário ou senha inválidos.');
        return;
      }
      
      localStorage.setItem('sentinela_auth', 'true');
      if (userData) {
          localStorage.setItem('sentinela_user', JSON.stringify(userData));
      }
      router.push('/');
    } catch (err) {
      console.error('Login error:', err);
      setError('Erro ao conectar com o banco de dados Firebase.');
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-[#030712] to-[#030712] pointer-events-none" />
      
      <div className="w-full max-w-sm glass-panel p-6 sm:p-10 relative z-10 flex flex-col items-center">
        <div className="mb-6 sm:mb-8 flex flex-col items-center">
          <div className="w-14 sm:w-16 h-14 sm:h-16 border-2 border-blue-500 rounded-full flex items-center justify-center mb-4 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
            <svg className="w-7 sm:w-8 h-7 sm:h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-widest uppercase mb-2">LOGIN</h1>
          <p className="text-slate-400 text-[10px] sm:text-xs uppercase tracking-[0.3em] font-bold">Sentinela IA Master</p>
        </div>

        <form onSubmit={handleAuth} className="w-full space-y-4 sm:space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Usuário</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Digite seu usuário"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Digite sua senha"
              required
            />
          </div>
          
          {error && <p className="text-red-500 text-xs font-bold text-center animate-shake">{error}</p>}

          <button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-50 text-blue-100 hover:text-blue-900 font-black py-4 rounded-xl transition-all duration-300 shadow-lg shadow-blue-900/20 uppercase tracking-widest text-xs"
          >
            Acessar Sistema
          </button>
          
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold w-full">
            <button 
              type="button" 
              onClick={() => router.push('/recover')}
              className="text-slate-400 hover:text-blue-400 transition-colors"
            >
              Esqueci minha senha
            </button>
            <button 
              type="button" 
              onClick={() => router.push('/register')}
              className="text-blue-500 hover:text-blue-400 transition-colors uppercase tracking-widest"
            >
              Criar Conta
            </button>
          </div>
        </form>
      </div>

      <style jsx global>{`
        .glass-panel {
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.15s ease-in-out 3; }
      `}</style>
    </div>
  );
}
