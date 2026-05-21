'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { db } = await import('../../lib/firebase');
      const { collection, doc, getDoc, setDoc } = await import('firebase/firestore');
      
      const safeUsername = username.trim().toLowerCase();
      
      if (safeUsername === 'admin') {
         setError('Nome de usuário reservado.');
         setLoading(false);
         return;
      }
      
      const userRef = doc(db, 'users', safeUsername);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
         setError('Usuário já cadastrado. Escolha outro nome de usuário.');
         setLoading(false);
         return;
      }
      
      await setDoc(userRef, {
         username: safeUsername,
         password: password.trim(),
         name: name.trim(),
         role: 'sdr'
      });
      
      alert('Conta criada com sucesso! Faça o login agora.');
      router.push('/login');
    } catch (err) {
      console.error(err);
      setError('Erro ao conectar com o banco de dados Firebase.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-[#030712] to-[#030712] pointer-events-none" />
      
      <div className="w-full max-w-md glass-panel p-10 relative z-10 flex flex-col items-center">
        <div className="mb-8 flex flex-col items-center">
          <h1 className="text-3xl font-black text-white tracking-widest uppercase mb-2">CRIAR CONTA</h1>
          <p className="text-slate-400 text-xs uppercase tracking-[0.3em] font-bold">Identificação Segura</p>
        </div>

        <form onSubmit={handleRegister} className="w-full space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Nome Completo</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Ex: João Silva"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Nome de Usuário</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Ex: joao.sdr"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Escolha uma senha"
              required
            />
          </div>
          
          {error && <p className="text-red-500 text-xs font-bold text-center animate-shake">{error}</p>}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-50 text-blue-100 hover:text-blue-900 disabled:opacity-50 font-black py-4 rounded-xl transition-all duration-300 shadow-lg shadow-blue-900/20 uppercase tracking-widest text-xs mt-2"
          >
            {loading ? 'Processando...' : 'Finalizar Cadastro'}
          </button>
          
          <div className="pt-4 text-center">
            <button 
              type="button" 
              onClick={() => router.push('/login')}
              className="text-slate-400 hover:text-white transition-colors text-xs font-bold"
            >
              Voltar ao Login
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
