'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, Trash2, Shield, UserCheck } from 'lucide-react';

type User = { username: string; name: string; role: string };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'sdr' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentUser, setCurrentUser] = useState<{role?: string} | null>(null);
  const router = useRouter();

  useEffect(() => {
    const auth = localStorage.getItem('sentinela_auth');
    if (!auth) { router.push('/login'); return; }

    try {
      const raw = localStorage.getItem('sentinela_user');
      if (raw) {
        const u = JSON.parse(raw);
        setCurrentUser(u);
        if (u.role !== 'admin') { router.push('/'); return; }
      }
    } catch {}

    loadUsers();
  }, [router]);

  const loadUsers = async () => {
    try {
      const { db } = await import('../../lib/firebase');
      const { collection, getDocs } = await import('firebase/firestore');
      const snapshot = await getDocs(collection(db, 'users'));
      const list: User[] = [];
      snapshot.forEach(doc => {
         const data = doc.data();
         list.push({ username: data.username, name: data.name, role: data.role });
      });
      setUsers(list);
    } catch (e) {
      console.error("Erro ao carregar usuários:", e);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const { db } = await import('../../lib/firebase');
      const { doc, getDoc, setDoc } = await import('firebase/firestore');
      
      const safeUsername = form.username.trim().toLowerCase();
      if (safeUsername === 'admin') {
         setError('Nome de usuário reservado.');
         return;
      }
      
      const userRef = doc(db, 'users', safeUsername);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
         setError('Usuário já existe.');
         return;
      }
      
      await setDoc(userRef, {
         username: safeUsername,
         password: form.password.trim(),
         name: form.name.trim(),
         role: form.role
      });
      
      setSuccess(`Usuário "${form.username}" criado com sucesso!`);
      setForm({ username: '', password: '', name: '', role: 'sdr' });
      setShowForm(false);
      loadUsers();
    } catch {
      setError('Erro de conexão com o banco de dados Firebase');
    }
  };

  const handleDelete = async (username: string) => {
    if (!confirm(`Remover o usuário "${username}"?`)) return;
    try {
      const { db } = await import('../../lib/firebase');
      const { doc, deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'users', username));
      loadUsers();
    } catch {}
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#030303] text-white flex items-center justify-center">
        <p className="text-slate-500 text-sm">Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030303] text-white flex flex-col p-4 md:p-6 font-inter">
      <div className="w-full max-w-[900px] mx-auto pt-10">

        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tighter uppercase font-orbitron italic flex items-center gap-3">
              <Users size={20} className="text-blue-400" />
              Gestão de Equipe
            </h1>
            <p className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest -mt-1">Cadastro e controle de acessos</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="h-8 px-5 bg-blue-600 hover:bg-blue-500 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-[0_4px_15px_rgba(37,99,235,0.25)]"
          >
            <Plus size={12} />
            {showForm ? 'CANCELAR' : 'NOVO USUÁRIO'}
          </button>
        </header>

        {/* Create Form */}
        {showForm && (
          <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-6 mb-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-4">Novo Membro da Equipe</h3>
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Nome Completo</label>
                <input
                  type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Ex: Maria Silva" required
                />
              </div>
              <div>
                <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Login</label>
                <input
                  type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})}
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Ex: maria" required
                />
              </div>
              <div>
                <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Senha</label>
                <input
                  type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  placeholder="••••••" required
                />
              </div>
              <div>
                <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Função</label>
                <select
                  value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="sdr">SDR (Comercial)</option>
                  <option value="gestor">Gestor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className="col-span-2 flex items-center gap-4">
                <button type="submit" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                  Criar Usuário
                </button>
                {error && <span className="text-red-400 text-[9px] font-bold">{error}</span>}
                {success && <span className="text-emerald-400 text-[9px] font-bold">{success}</span>}
              </div>
            </form>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-[#060608] border border-white/[0.03] rounded-[2rem] p-5 shadow-2xl">
          <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
            <div className="h-4 w-1.5 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-white italic">Membros Cadastrados</h2>
            <span className="ml-auto text-[8px] font-bold text-slate-500">{users.length} usuários</span>
          </div>

          <div className="space-y-2">
            {users.map(u => (
              <div key={u.username} className="flex items-center justify-between bg-[#0a0a0c] border border-white/[0.03] rounded-xl px-5 py-3 hover:bg-[#0d0d0f] transition-all group">
                <div className="flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${u.role === 'admin' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {u.role === 'admin' ? <Shield size={16} /> : <UserCheck size={16} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-white">{u.name}</span>
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">@{u.username} • {u.role === 'admin' ? 'Administrador' : u.role === 'gestor' ? 'Gestor' : 'SDR'}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(u.username)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-all"
                  title="Remover usuário"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {users.length === 0 && (
              <div className="text-center p-8 text-slate-600 text-[9px] uppercase tracking-widest font-bold">
                Nenhum usuário cadastrado ainda
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
