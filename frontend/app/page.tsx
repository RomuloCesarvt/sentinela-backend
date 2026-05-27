'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuraIsland from '../components/AuraIsland';
import LeadKanban from '../components/LeadKanban';
import { BarChart3, ShieldAlert, Sparkles, CheckCircle2, Trash2, Scan, Clock, Shield, LayoutGrid, Download } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, doc, onSnapshot, addDoc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';

export default function Dashboard() {
  const router = useRouter();
  const [leads, setLeads] = useState<any[]>([]);
  const [aura, setAura] = useState({ status: 'healthy', message: 'SENTINELA ATIVO' });
  const [period, setPeriod] = useState('24h');
  const [scanLock, setScanLock] = useState({ is_locked: false, locked_by: null });
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [backendUrl, setBackendUrl] = useState('');

  // Usa URLs relativas para funcionar perfeitamente no Cloudflare Tunnel e localhost
  const API_BASE = '/api';

  useEffect(() => {
    const userStr = localStorage.getItem('sentinela_user');
    if (!userStr) { router.push('/login'); return; }
    const user = JSON.parse(userStr);

    // Conectar ao Firebase
    const unsubLeads = onSnapshot(collection(db, 'leads'), (snapshot) => {
      const loadedLeads: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        loadedLeads.push(data);
      });
      // Mantém a estrutura compatível com os componentes existentes [{ leads: [...] }]
      setLeads([{ leads: loadedLeads }]);
      setAura({ status: 'healthy', message: 'SENTINELA ATIVO' });
    }, (error) => {
      console.error('[Firebase] Erro leads:', error);
      setAura({ status: 'error', message: 'FALHA DE CONEXÃO COM BANCO' });
    });

    const unsubLock = onSnapshot(doc(db, 'system', 'lock'), async (docSnap) => {
      if (docSnap.exists()) {
        const lockData = docSnap.data();
        
        // Auto-heal: Detecta locks travados/residuais e desbloqueia automaticamente
        if (lockData.is_locked) {
          let shouldAutoHeal = false;
          
          if (lockData.timestamp) {
            // Calcula quanto tempo o lock está ativo
            let lockTime: number;
            if (lockData.timestamp.toDate) {
              lockTime = lockData.timestamp.toDate().getTime();
            } else if (lockData.timestamp.seconds) {
              lockTime = lockData.timestamp.seconds * 1000;
            } else {
              lockTime = new Date(lockData.timestamp).getTime();
            }
            
            const elapsedMs = Date.now() - lockTime;
            const TEN_MINUTES = 10 * 60 * 1000;
            
            if (isNaN(lockTime) || elapsedMs > TEN_MINUTES) {
              shouldAutoHeal = true;
              console.warn(`[Sentinela] Lock residual detectado (${Math.round(elapsedMs / 60000)}min). Auto-desbloqueando...`);
            }
          } else {
            // Lock sem timestamp = lock legado/órfão, sempre reseta
            shouldAutoHeal = true;
            console.warn('[Sentinela] Lock sem timestamp detectado (legado). Auto-desbloqueando...');
          }
          
          if (shouldAutoHeal) {
            try {
              await setDoc(doc(db, 'system', 'lock'), { is_locked: false, locked_by: null, error: null, timestamp: null }, { merge: true });
            } catch (e) {
              console.error('[Sentinela] Erro ao auto-desbloquear:', e);
            }
            setScanLock({ is_locked: false, locked_by: null });
            setAura({ status: 'healthy', message: 'SENTINELA ATIVO' });
            return;
          }
        }
        
        setScanLock({ is_locked: lockData.is_locked, locked_by: lockData.locked_by });
        if (lockData.error) {
          setAura({ status: 'error', message: `ERRO: ${lockData.error.substring(0, 60)}` });
        } else if (lockData.is_locked) {
          setAura({ status: 'scanning', message: `ESCANEANDO (${lockData.locked_by})` });
        } else {
          setAura({ status: 'healthy', message: 'SENTINELA ATIVO' });
        }
      }
    });

    const unsubConfig = onSnapshot(doc(db, 'system', 'config'), (doc) => {
      if (doc.exists()) {
        const configData = doc.data();
        setBackendUrl(configData.backend_url || '');
      }
    });

    return () => {
      unsubLeads();
      unsubLock();
      unsubConfig();
    };
  }, [router]);

  const handleForceUnlock = async () => {
    if (!confirm('O scan parece estar travado. Deseja forçar o desbloqueio?')) return;
    await setDoc(doc(db, 'system', 'lock'), { is_locked: false, locked_by: null, error: null }, { merge: true });
  };

  const handleScan = async () => {
    const user = JSON.parse(localStorage.getItem('sentinela_user') || '{}');
    
    if (scanLock.is_locked) {
      handleForceUnlock();
      return;
    }
    
    await setDoc(doc(db, 'system', 'lock'), { is_locked: true, locked_by: user.username, error: null, timestamp: new Date().toISOString() }, { merge: true });
    
    // 1. TENTA USAR A EXTENSÃO (Abre aba ao lado no seu Chrome atual)
    if (document.documentElement.dataset.sentinelaExtension === "true") {
        window.dispatchEvent(new CustomEvent('SENTINELA_SCAN_TRIGGER', { 
            detail: { 
                period, 
                username: user.username,
                backendUrl: backendUrl || process.env.NEXT_PUBLIC_API_URL || window.location.origin
            } 
        }));
    } 
    // 2. FALLBACK PARA O BACKEND PYTHON
    else {
        await addDoc(collection(db, 'commands'), {
            command: 'scan',
            status: 'pending',
            period,
            username: user.username,
            timestamp: Date.now()
        });
    }
  };

  const handleClear = async () => {
    if (!confirm("Deseja limpar TODOS os leads? Esta ação não pode ser desfeita.")) return;
    try {
      const user = JSON.parse(localStorage.getItem('sentinela_user') || '{}');
      
      // 1. Envia comando para o backend via Firebase (limpa JSON locais + Firestore no servidor)
      await addDoc(collection(db, 'commands'), {
        command: 'clear',
        status: 'pending',
        username: user.username || 'admin',
        timestamp: Date.now()
      });

      // 2. Limpa imediatamente no Firebase Firestore no cliente (feedback instantâneo)
      const snapshot = await getDocs(collection(db, 'leads'));
      const promises = snapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(promises);
      await setDoc(doc(db, 'system', 'lock'), { is_locked: false, locked_by: null, error: null }, { merge: true });
      
      setLeads([]);
      alert("✅ Leads limpos com sucesso!");
    } catch (e) {
      console.error(e);
      alert("❌ Erro ao limpar leads.");
    }
  };


  // Deduplicar leads por nome: mantém a entrada mais recente de cada lead
  const uniqueLeads = React.useMemo(() => {
    const allLeadsRaw = leads.flatMap((s: any) => s.leads || []);
    const leadsMap = new Map<string, any>();
    allLeadsRaw.forEach((lead: any) => {
      const key = (lead.nome || '').toLowerCase().trim();
      const existing = leadsMap.get(key);
      if (!existing || (lead.timestamp && (!existing.timestamp || lead.timestamp > existing.timestamp))) {
        leadsMap.set(key, lead);
      }
    });
    return Array.from(leadsMap.values());
  }, [leads]);

  const totals = React.useMemo(() => ({
    total: uniqueLeads.length,
    crit: uniqueLeads.filter((l: any) => l.classificacao?.toLowerCase().includes('crítico')).length,
    aten: uniqueLeads.filter((l: any) => l.classificacao?.toLowerCase().includes('atenção')).length,
    saud: uniqueLeads.filter((l: any) => l.classificacao?.toLowerCase().includes('saudável')).length,
  }), [uniqueLeads]);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-6 font-inter overflow-x-hidden selection:bg-blue-500/30 transition-colors duration-300">
      
      {/* AURA ISLAND */}
      <div className="w-full max-w-[1400px] mb-4 relative z-50">
         <AuraIsland status={aura.status as any} message={aura.message} />
      </div>

      <div className="w-full max-w-7xl relative z-10 flex flex-col gap-6 lg:gap-8 pt-4 lg:pt-0">
        
        {/* HEADER DA DASHBOARD */}
        <header 
          className="border p-4 lg:p-5 rounded-[1rem] flex flex-col lg:flex-row items-center justify-between gap-4 relative overflow-hidden shadow-xl transition-colors duration-300"
          style={{ backgroundColor: 'var(--background-2)', borderColor: 'var(--card-border)' }}
        >
          {/* Subtle gradient glow */}
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[60px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>

          <div className="flex flex-col text-center lg:text-left z-10 w-full lg:w-auto">
            <h1 className="text-3xl font-extrabold italic tracking-tight flex items-center justify-center lg:justify-start gap-2 text-white/95" style={{fontFamily: 'Montserrat, sans-serif'}}>
               DASHBOARD <span className="text-blue-500 font-black">/</span>
            </h1>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Auditoria de Conversas • Moura Leite</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-center lg:justify-end z-10 w-full lg:w-auto">
             <div className="flex items-center gap-2 h-8 bg-black/40 border border-white/5 px-3 rounded-lg shadow-inner focus-within:border-blue-500/30 transition-all">
                <Clock size={12} className="text-blue-400" />
                <select 
                   value={period}
                   onChange={(e) => setPeriod(e.target.value)}
                   className="appearance-none bg-transparent outline-none cursor-pointer pr-4 font-bold text-[11px] uppercase tracking-widest hover:text-blue-400 transition-colors"
                   style={{ color: 'var(--foreground)' }}
                 >
                   <option value="24h" style={{ backgroundColor: 'var(--background-2)', color: 'var(--foreground)' }}>Últimas 24 Horas</option>
                   <option value="7d" style={{ backgroundColor: 'var(--background-2)', color: 'var(--foreground)' }}>Últimos 7 Dias</option>
                   <option value="30d" style={{ backgroundColor: 'var(--background-2)', color: 'var(--foreground)' }}>Mês Atual</option>
                 </select>
             </div>

             <div className="flex items-center gap-2">
                <button 
                  onClick={handleClear} 
                  className="h-8 px-4 bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/30 rounded-lg transition-all flex items-center gap-2 group"
                >
                   <Trash2 size={12} className="text-slate-400 group-hover:text-red-400" />
                   <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300 group-hover:text-red-400">Limpar</span>
                </button>

                <button
                 onClick={handleManualScan}
                 disabled={aura.status === 'scanning'}
                 className={`relative px-6 py-2.5 rounded-full font-black text-[11px] uppercase tracking-widest transition-all overflow-hidden group border
                   ${aura.status === 'scanning' 
                      ? 'text-blue-500 border-blue-500/20 cursor-wait' 
                      : 'text-blue-400 border-blue-500/20 hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                   }`}
                 style={{ backgroundColor: aura.status === 'scanning' ? 'var(--card-bg)' : 'transparent' }}
               >
                  <Scan size={12} className={scanLock.is_locked ? 'animate-spin' : 'animate-pulse'} />
                  {scanLock.is_locked ? 'Analisando...' : 'Master Scan'}
                </button>
             </div>
          </div>
        </header>

        {/* METRICS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 w-full">
           {[
             { label: 'Total em Auditoria', v: totals.total, filter: null, c: 'text-blue-400', b: 'bg-blue-500/10', r: 'border-blue-500/20', i: BarChart3 },
             { label: 'Leads Críticos', v: totals.crit, filter: 'crítico', c: 'text-red-400', b: 'bg-red-500/10', r: 'border-red-500/20', i: ShieldAlert },
             { label: 'Em Atenção', v: totals.aten, filter: 'atenção', c: 'text-yellow-400', b: 'bg-yellow-500/10', r: 'border-yellow-500/20', i: Sparkles },
             { label: 'Leads Saudáveis', v: totals.saud, filter: 'saudável', c: 'text-emerald-400', b: 'bg-emerald-500/10', r: 'border-emerald-500/20', i: CheckCircle2 },
           ].map((k, i) => (
             <div 
               key={k.label} 
               onClick={() => setActiveFilter(activeFilter === k.filter ? null : k.filter as any)}
               className={`p-3.5 rounded-xl border ${k.r} flex flex-col gap-1.5 group transition-all cursor-pointer ${activeFilter === k.filter ? 'ring-2 ring-blue-500/50 scale-[1.02]' : 'hover:scale-[1.02]'}`}
               style={{ backgroundColor: activeFilter === k.filter ? 'var(--background-3)' : 'var(--background-2)', borderColor: 'var(--card-border)' }}
             >
                <div className="flex items-center justify-between">
                   <div className={`w-6 h-6 rounded-md ${k.b} flex items-center justify-center`}>
                      <k.i size={12} className={k.c} />
                   </div>
                   <span className="text-xl font-bold tracking-tight text-white/95">{k.v}</span>
                </div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{k.label}</p>
             </div>
           ))}
        </div>

        {/* LISTA DE LEADS (KANBAN / CARDS) */}
        <main 
          className="border rounded-[1rem] p-4 lg:p-5 shadow-xl relative min-h-[500px] w-full transition-colors duration-300"
          style={{ backgroundColor: 'var(--background-2)', borderColor: 'var(--card-border)' }}
        >
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                 <div className="w-1 h-4 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.4)]"></div>
                 <h2 className="text-xs font-black uppercase tracking-wider text-white/90">
                    Quadro Operacional {activeFilter && <span className="text-slate-500 ml-2">/ Filtro: {activeFilter.toUpperCase()}</span>}
                 </h2>
              </div>
              <div className="flex items-center gap-2">
                 <div className="px-2.5 py-1 bg-white/5 border border-white/5 rounded-md text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <LayoutGrid size={10} /> Sincronização Ativa
                 </div>
              </div>
           </div>

           <LeadKanban leads={uniqueLeads} activeFilter={activeFilter} />
        </main>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
        body { font-family: 'Inter', sans-serif; background-color: #060608; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1a1a24; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #2a2a35; }
      `}</style>
    </div>
  );
}
