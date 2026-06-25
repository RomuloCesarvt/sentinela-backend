'use client';
import { useState, useEffect } from 'react';
import AuraIsland from '../../components/AuraIsland';
import { ShieldCheck, Cpu, Database, Save, RotateCcw, Zap, Shield, Scan, Monitor } from 'lucide-react';

export default function SettingsPage() {
  const [config, setConfig] = useState({
    morada_login: '',
    morada_pass: '',
    openai_key: '',
    perplexity_key: '',
    periodo_analise: '24h',
    groq_key: '',
    email_sender: '',
    email_password: '',
    email_recipient: '',
    preferred_browser: 'auto'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const API_BASE = '/api';

  useEffect(() => {
    const load = async () => {
      try {
        const { db } = await import('../../lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        const docRef = doc(db, 'system', 'config');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setConfig(snap.data() as any);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const { db } = await import('../../lib/firebase');
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'system', 'config'), config, { merge: true });
      setMessage('✓ CONFIGURAÇÕES SINCRONIZADAS');
    } catch (e) {
      console.error(e);
      setMessage('❌ FALHA NA CONEXÃO COM O FIREBASE');
    }
    setSaving(false);
    setTimeout(() => setMessage(''), 3000);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center">
       <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] font-black uppercase text-blue-500 tracking-[0.3em]">Carregando Sistema...</span>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#030303] text-white p-6 md:p-12 overflow-x-hidden font-inter">
      <AuraIsland status="saudavel" message="SINCRONIA DE CONFIGURAÇÕES" />
      
      <div className="max-w-[1000px] mx-auto mt-20 relative z-10">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase font-orbitron mb-1">Painel de Controle</h1>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">Moura Leite // Sentinela IA // Version 4.8</p>
          </div>
          <div className="h-0.5 flex-1 bg-gradient-to-r from-blue-500/50 to-transparent hidden md:block mb-3 mx-8" />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* NAVEGADOR PREFERIDO */}
          <div className="bg-gradient-to-br from-blue-600/10 via-transparent to-transparent border border-blue-500/20 p-8 rounded-3xl relative overflow-hidden group col-span-1 lg:col-span-2">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-blue-500">
                <Monitor size={80} />
            </div>
            
            <div className="flex flex-col md:flex-row items-start justify-between gap-8 relative z-10">
               <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <Monitor size={16} />
                     </div>
                     <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Navegador para Scan</h3>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed mb-6 max-w-xl">
                     Escolha qual navegador o Sentinela deve usar para abrir o Morada AI e fazer a auditoria. O sistema usará o perfil real do navegador (onde você já está logado).
                  </p>
                  
                  <div className="flex flex-wrap gap-3">
                    {[
                      { value: 'auto', label: 'Automático', desc: 'Detecta automaticamente' },
                      { value: 'chrome', label: 'Google Chrome', desc: 'Prioriza Chrome' },
                      { value: 'edge', label: 'Microsoft Edge', desc: 'Prioriza Edge' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setConfig({...config, preferred_browser: opt.value})}
                        className={`px-6 py-4 rounded-2xl border transition-all text-left ${
                          config.preferred_browser === opt.value 
                            ? 'bg-blue-600/20 border-blue-500/50 shadow-lg shadow-blue-600/10' 
                            : 'bg-black/30 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <span className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${
                          config.preferred_browser === opt.value ? 'text-blue-400' : 'text-slate-400'
                        }`}>{opt.label}</span>
                        <span className="block text-[8px] font-bold text-slate-600 uppercase tracking-wider">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
               </div>
               
               <div className="w-full md:w-[300px] bg-black/40 border border-white/5 p-6 rounded-[2rem] backdrop-blur-sm">
                  <h4 className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-4">Como funciona:</h4>
                  <ul className="text-[9px] text-slate-500 space-y-3 font-bold uppercase tracking-[0.05em]">
                     <li className="flex gap-2">
                        <span className="text-blue-500">01.</span>
                        <span>O <span className="text-slate-300">backend local</span> roda no seu PC.</span>
                     </li>
                     <li className="flex gap-2">
                        <span className="text-blue-500">02.</span>
                        <span>Ao clicar <span className="text-slate-300">Master Scan</span>, ele abre o navegador.</span>
                     </li>
                     <li className="flex gap-2">
                        <span className="text-blue-500">03.</span>
                        <span>Usa seu <span className="text-slate-300">perfil logado</span> no Morada AI.</span>
                     </li>
                     <li className="flex gap-2">
                        <span className="text-blue-500">04.</span>
                        <span>O navegador <span className="text-slate-300">fecha em 2 min</span> após o scan.</span>
                     </li>
                  </ul>
               </div>
            </div>
          </div>

          {/* Automação Section */}
          <div className="bg-[#0a0a0c] border border-white/[0.03] p-8 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Database size={60} />
            </div>
            
            <div className="flex items-center gap-3 mb-8">
               <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <ShieldCheck size={16} />
               </div>
               <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Credenciais Morada AI</h3>
            </div>
            
            <div className="space-y-6 relative z-10">
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest pl-1">Login de Acesso</label>
                <input 
                  type="text" 
                  value={config.morada_login}
                  onChange={e => setConfig({...config, morada_login: e.target.value})}
                  className="w-full bg-[#0d0d10] border border-white/5 rounded-2xl px-5 py-4 text-[11px] font-medium text-white focus:border-blue-500/50 focus:outline-none transition-all placeholder:text-white/10 shadow-inner"
                  placeholder="E-mail ou Usuário"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest pl-1">Senha Segura</label>
                <input 
                  type="password" 
                  value={config.morada_pass}
                  onChange={e => setConfig({...config, morada_pass: e.target.value})}
                  className="w-full bg-[#0d0d10] border border-white/5 rounded-2xl px-5 py-4 text-[11px] font-medium text-white focus:border-blue-500/50 focus:outline-none transition-all placeholder:text-white/10 shadow-inner"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          {/* Notificações e Relatórios */}
          <div className="bg-[#0a0a0c] border border-white/[0.03] p-8 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Database size={60} />
            </div>
            
            <div className="flex items-center gap-3 mb-8">
               <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <ShieldCheck size={16} />
               </div>
               <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Notificação e Relatório em PDF</h3>
            </div>
            
            <div className="space-y-6 relative z-10">
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest pl-1">Seu E-mail (Para Envio)</label>
                <input 
                  type="email" 
                  value={config.email_sender}
                  onChange={e => setConfig({...config, email_sender: e.target.value})}
                  className="w-full bg-[#0d0d10] border border-white/5 rounded-2xl px-5 py-4 text-[11px] font-medium text-white focus:border-indigo-500/50 focus:outline-none transition-all placeholder:text-white/10 shadow-inner"
                  placeholder="seuemail@outlook.com ou gmail"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest pl-1">Senha (ou Senha de App SMTP)</label>
                <input 
                  type="password" 
                  value={config.email_password}
                  onChange={e => setConfig({...config, email_password: e.target.value})}
                  className="w-full bg-[#0d0d10] border border-white/5 rounded-2xl px-5 py-4 text-[11px] font-medium text-white focus:border-indigo-500/50 focus:outline-none transition-all placeholder:text-white/10 shadow-inner"
                  placeholder="••••••••"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest pl-1">E-mails que Receberão o PDF (separar por vírgula)</label>
                <input 
                  type="text" 
                  value={config.email_recipient}
                  onChange={e => setConfig({...config, email_recipient: e.target.value})}
                  className="w-full bg-[#0d0d10] border border-white/5 rounded-2xl px-5 py-4 text-[11px] font-medium text-white focus:border-indigo-500/50 focus:outline-none transition-all placeholder:text-white/10 shadow-inner"
                  placeholder="gestor1@hmouraleite.com.br, gestor2@hmouraleite.com.br"
                />
              </div>
            </div>
          </div>

          {/* Motor de Inteligência - DUAL ENGINE */}
          <div className="bg-[#0a0a0c] border border-white/[0.03] p-8 rounded-3xl relative overflow-hidden group border-emerald-500/10">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-emerald-500">
                <Cpu size={60} />
            </div>

            <div className="flex items-center gap-3 mb-8">
               <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Cpu size={16} />
               </div>
               <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Motor de Inteligência Dual</h3>
            </div>
            
            <div className="space-y-6 relative z-10">
              {/* GROQ - MOTOR PRIMÁRIO 100% GRÁTIS */}
              <div className="space-y-2 p-4 bg-orange-500/[0.03] border border-orange-500/10 rounded-2xl">
                <div className="flex items-center gap-2 mb-1">
                   <Zap size={10} className="text-orange-400" />
                   <label className="text-[8px] font-black text-orange-400 uppercase tracking-widest">Motor Primário — Groq (100% Grátis · 14.400 req/dia)</label>
                </div>
                <input 
                  type="password" 
                  value={config.groq_key || ''}
                  onChange={e => setConfig({...config, groq_key: e.target.value})}
                  className="w-full bg-[#0d0d10] border border-orange-500/20 rounded-2xl px-5 py-4 text-[11px] font-medium text-white focus:border-orange-500/50 focus:outline-none transition-all placeholder:text-white/10 shadow-inner"
                  placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
                <p className="text-[7px] text-slate-500 uppercase font-bold tracking-wider leading-tight mt-1">100% GRÁTIS sem cartão! Pegue em: console.groq.com → API Keys → Create. Até 14.400 análises/dia!</p>
              </div>

              {/* GEMINI - FALLBACK GRÁTIS */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                   <Shield size={10} className="text-emerald-500/50" />
                   <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Fallback — Gemini Free (Backup Grátis)</label>
                </div>
                <input 
                  type="password" 
                  value={config.openai_key}
                  onChange={e => setConfig({...config, openai_key: e.target.value})}
                  className="w-full bg-[#0d0d10] border border-white/5 rounded-2xl px-5 py-4 text-[11px] font-medium text-white focus:border-emerald-500/50 focus:outline-none transition-all placeholder:text-white/10 shadow-inner"
                  placeholder="AIzaSy... (Google Gemini) ou sk-... (OpenAI)"
                />
                <p className="text-[7px] text-slate-600 uppercase font-bold tracking-wider leading-tight mt-1">Chave de backup. Ativada automaticamente se o Groq atingir rate-limit.</p>
              </div>

              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest pl-1">Período Padrão de Auditoria</label>
                <select 
                  value={config.periodo_analise}
                  onChange={e => setConfig({...config, periodo_analise: e.target.value})}
                  className="w-full bg-[#0d0d10] border border-white/5 rounded-2xl px-5 py-4 text-[11px] font-black text-white focus:border-emerald-500/50 focus:outline-none transition-all cursor-pointer appearance-none uppercase"
                >
                  <option value="24h">Últimas 24 Horas</option>
                  <option value="Semana">Última Semana</option>
                  <option value="Mês">Todo o Histórico</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col md:flex-row items-center justify-between bg-[#0a0a0c] border border-white/[0.03] p-5 rounded-[2rem] gap-4">
           <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-[#0d0d10] rounded-2xl flex items-center justify-center border border-white/5">
                <div className={`w-2 h-2 rounded-full ${message ? 'bg-emerald-500 animate-pulse outline outline-4 outline-emerald-500/20' : 'bg-slate-700'}`} />
             </div>
             <div className="flex flex-col">
                <span className="text-[9px] font-black text-white uppercase tracking-widest">Status do Sistema</span>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{message || 'Sincronizado com o motor interno'}</span>
             </div>
           </div>

           <div className="flex items-center gap-3 w-full md:w-auto">
             <button 
                onClick={() => window.location.reload()}
                className="flex-1 md:flex-none h-12 px-6 bg-white/5 hover:bg-white/10 text-slate-400 font-black text-[9px] uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2"
             >
               <RotateCcw size={12} />
               Descartar
             </button>
             <button 
               onClick={handleSave}
               disabled={saving}
               className="flex-1 md:flex-none h-12 px-10 bg-blue-600 hover:bg-blue-500 text-white font-black text-[9px] uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
             >
               <Save size={12} />
               {saving ? 'SINCRONIZANDO...' : 'SALVAR E ATIVAR'}
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
