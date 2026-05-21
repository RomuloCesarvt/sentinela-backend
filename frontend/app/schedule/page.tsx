'use client';
import { useState, useEffect } from 'react';
import AuraIsland from '../../components/AuraIsland';
import { Bell, Clock, Calendar, Repeat, CheckCircle2 } from 'lucide-react';

export default function SchedulePage() {
  const [schedule, setSchedule] = useState({ 
    enabled: false, 
    hours: '09:00', 
    frequency: 'diario', 
    intervalDays: 1, 
    specificDays: [] as string[],
    period: '24h',
    notify: 'dashboard'
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { db } = await import('../../lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'system', 'config'));
        if (snap.exists()) {
           const data = snap.data();
           if (data.schedule) setSchedule(data.schedule);
        }
      } catch (e) {
        console.warn('[Cronos] Erro ao carregar do firebase', e);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      const { db } = await import('../../lib/firebase');
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'system', 'config'), { schedule }, { merge: true });
    } catch (e) {
      console.error('[Cronos] Erro ao salvar configuração:', e);
    }
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const toggleDay = (day: string) => {
    const spec = schedule.specificDays || [];
    const list = spec.includes(day) 
        ? spec.filter((d: string) => d !== day)
        : [...spec, day];
    setSchedule({...schedule, specificDays: list});
  };

  return (
    <div className="min-h-screen p-12 bg-[#030712] relative overflow-hidden">
      <AuraIsland status="atencao" message="PROGRAMAÇÃO AUTOMÁTICA" />

      <div className="max-w-4xl mx-auto mt-24 relative z-10 flex flex-col gap-8">
        <header className="mb-4 text-center">
          <h1 className="text-4xl font-black text-white font-orbitron tracking-[0.2em] uppercase">Módulo Cronos</h1>
          <p className="text-slate-500 text-xs font-bold tracking-widest mt-2 uppercase">Agendamento de Varredura Autônoma</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Block: Core Toggle and Time */}
          <div className="space-y-6">
            <div className={`glass-panel p-8 flex flex-col gap-6 transition-all duration-500 ${schedule.enabled ? 'border-blue-500/30' : 'opacity-60 grayscale'}`}>
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${schedule.enabled ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                     <Clock size={18} />
                   </div>
                   <h4 className="font-black text-white uppercase text-xs tracking-widest">Estado do Robô</h4>
                 </div>
                 <button 
                   onClick={() => setSchedule({...schedule, enabled: !schedule.enabled})}
                   className={`w-14 h-8 rounded-full transition-all duration-300 relative ${schedule.enabled ? 'bg-blue-600' : 'bg-slate-800'}`}
                 >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 ${schedule.enabled ? 'left-7' : 'left-1'} shadow-lg`} />
                 </button>
               </div>
               
               <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Horário de Início</label>
                  <input 
                    type="time" 
                    value={schedule.hours}
                    onChange={e => setSchedule({...schedule, hours: e.target.value})}
                    className="w-full bg-black/60 border border-slate-800 rounded-2xl py-6 px-10 text-5xl font-black text-center text-blue-400 focus:border-blue-600 focus:outline-none transition-all font-orbitron"
                  />
               </div>
            </div>

            <div className="glass-panel p-8 space-y-6">
                <div className="flex items-center gap-3">
                   <Bell size={18} className="text-blue-500" />
                   <h4 className="font-black text-white uppercase text-xs tracking-widest">Aviso de Conclusão</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   {['dashboard', 'notificacao_push'].map((opt) => (
                     <button
                       key={opt}
                       onClick={() => setSchedule({...schedule, notify: opt})}
                       className={`px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${schedule.notify === opt ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}
                     >
                       {opt.replace('_', ' ')}
                     </button>
                   ))}
                </div>
            </div>
          </div>

          {/* Right Block: Frequency and Period */}
          <div className="space-y-6">
            <div className="glass-panel p-8 space-y-8">
               <div className="flex items-center gap-3">
                  <Repeat size={18} className="text-blue-500" />
                  <h4 className="font-black text-white uppercase text-xs tracking-widest">Frequência Operacional</h4>
               </div>
               
               <div className="grid grid-cols-3 gap-2">
                  {[
                    {id: 'diario', label: 'Diário'},
                    {id: 'intervalo', label: 'X Dias'},
                    {id: 'especifico', label: 'Dias Fixos'}
                  ].map(btn => (
                    <button 
                      key={btn.id}
                      onClick={() => setSchedule({...schedule, frequency: btn.id})}
                      className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${schedule.frequency === btn.id ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'bg-white/5 border-white/5 text-slate-500'}`}
                    >
                      {btn.label}
                    </button>
                  ))}
               </div>

               {schedule.frequency === 'intervalo' && (
                  <div className="flex items-center gap-4 bg-black/40 p-4 rounded-xl border border-white/10">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A cada</span>
                     <input 
                       type="number" 
                       value={schedule.intervalDays}
                       onChange={e => setSchedule({...schedule, intervalDays: parseInt(e.target.value)})}
                       className="w-16 bg-transparent text-center font-black text-blue-400 focus:outline-none"
                     />
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">dias corridos</span>
                  </div>
               )}

               {schedule.frequency === 'especifico' && (
                  <div className="grid grid-cols-4 gap-2">
                     {['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map(day => {
                       const specDays = schedule.specificDays || [];
                       return (
                         <button
                           key={day}
                           onClick={() => toggleDay(day)}
                           className={`py-2 rounded-lg text-[9px] font-black uppercase border ${specDays.includes(day) ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}
                         >
                           {day}
                         </button>
                       )
                     })}
                  </div>
               )}

               <div className="pt-6 border-t border-white/10">
                  <div className="flex items-center gap-3 mb-4">
                     <Calendar size={18} className="text-blue-500" />
                     <h4 className="font-black text-white uppercase text-xs tracking-widest">Janela de Busca</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     {['2h', '12h', '24h', '7d'].map((p) => (
                       <button
                         key={p}
                         onClick={() => setSchedule({...schedule, period: p})}
                         className={`px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${schedule.period === p ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}
                       >
                         Últimas {p}
                       </button>
                     ))}
                  </div>
               </div>
            </div>

            <button 
              onClick={handleSave}
              disabled={saving}
              className={`w-full h-11 flex items-center justify-center gap-4 rounded-xl transition-all duration-300 font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg ${success ? 'bg-emerald-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
            >
              {saving ? 'PROCESSANDO...' : success ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>Configurações Salvas</span>
                </>
              ) : 'Confirmar Programação'}
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
