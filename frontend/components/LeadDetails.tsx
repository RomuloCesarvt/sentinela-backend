'use client';
import { useState } from 'react';

const STATUS_OPTIONS = [
  { value: 'Crítico', color: '#ef4444', label: 'CRÍTICO' },
  { value: 'Atenção', color: '#eab308', label: 'ATENÇÃO' },
  { value: 'Saudável', color: '#10b981', label: 'SAUDÁVEL' },
];

export default function LeadDetails({ lead, onClose, onStatusChange }: { lead: any, onClose: () => void, onStatusChange?: (nome: string, status: string) => void }) {
  const [activeTab, setActiveTab] = useState<'analise' | 'conversa'>('analise');
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(lead?.classificacao || 'Atenção');
  const [saving, setSaving] = useState(false);
  
  if (!lead) return null;

  const st = (currentStatus || 'Atenção').toLowerCase();
  const color = st === 'crítico' ? '#ef4444' : st === 'atenção' ? '#eab308' : '#10b981';

  const getUsername = () => {
    try {
      const raw = localStorage.getItem('sentinela_user');
      if (raw) return JSON.parse(raw).username || 'Sistema';
    } catch {}
    return 'Sistema';
  };

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true);
    try {
      const username = getUsername();
      const res = await fetch(`/api/leads/${encodeURIComponent(lead.nome)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classificacao: newStatus, username }),
      });
      if (res.ok) {
        setCurrentStatus(newStatus);
        setShowStatusPicker(false);
        if (onStatusChange) onStatusChange(lead.nome, newStatus);
      }
    } catch (e) {
      console.error('Erro ao atualizar status:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/98 backdrop-blur-2xl animate-in fade-in duration-300">
      <div 
        className="bg-[#0c0c0e] border border-white/[0.08] w-full max-w-sm sm:max-w-md rounded-2xl sm:rounded-[32px] overflow-hidden relative shadow-[0_0_80px_rgba(0,0,0,1)] flex flex-col animate-in zoom-in-95 h-fit max-h-[95vh] sm:max-h-[90vh]"
        style={{ borderTop: `4px solid ${color}` }}
      >
        <button onClick={onClose} className="absolute top-3 sm:top-4 right-3 sm:right-4 text-slate-500 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-all z-50">
          ✕
        </button>

        <div className="p-4 sm:p-6 flex flex-col h-full overflow-hidden">
          {/* Header Compacto */}
          <div className="mb-3 sm:mb-4">
            <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-2 mb-2">
              <span className="text-[6px] sm:text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none block">SENTINELA INSPECTION</span>
            </div>
            
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight mb-2 pr-2 break-words">
              {lead.nome}
            </h2>
            
               <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-2 flex-wrap">
                  <div className="px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded text-[#00ffff] font-black text-[9px] sm:text-[10px] shadow-[0_0_10px_rgba(0,255,255,0.2)]">
                     SCORE: {lead.score_engajamento ?? 0}
                  </div>
                  <span className="text-[7px] sm:text-[8px] font-bold text-indigo-400 uppercase tracking-widest">{lead.empreendimento_detectado || 'EM AUDITORIA'}</span>
                  {lead.tempo_medio_resposta && (
                    <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-slate-300 font-bold text-[8px] sm:text-[9px]">
                       ⏱️ {lead.tempo_medio_resposta}
                    </span>
                  )}
               </div>
               
               {/* DADOS DE CONTATO E ORIGEM */}
               {(lead.telefone || lead.email || lead.origem) && (
                  <div className="flex flex-col gap-1 mb-3 pt-2 border-t border-white/5">
                     <span className="text-[6px] sm:text-[7px] font-black text-slate-600 uppercase tracking-widest">Master Data</span>
                     {lead.telefone && <span className="text-[8px] sm:text-[9px] font-medium text-slate-300 flex items-center gap-1 truncate">📞 {lead.telefone}</span>}
                     {lead.email && <span className="text-[8px] sm:text-[9px] font-medium text-slate-300 flex items-center gap-1 truncate overflow-hidden">📧 {lead.email}</span>}
                     {lead.origem && <span className="text-[8px] sm:text-[9px] font-bold text-blue-300 flex items-center gap-1 truncate">{lead.origem}</span>}
                  </div>
               )}
            
            {lead.url_morada ? (
              <a 
                 href={lead.url_morada} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="mt-3 inline-flex items-center justify-center px-3 py-2 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20 rounded-lg text-[8px] sm:text-[9px] font-black text-white uppercase tracking-widest transition-all w-full hover:-translate-y-0.5 text-center leading-tight"
              >
                 ↗ ABRIR CONVERSA NO MORADA AI
              </a>
            ) : (
              <div 
                 title="Necessário rodar um novo Master Scan para gerar o link direto"
                 className="mt-3 inline-flex items-center justify-center px-3 py-2 bg-slate-800 text-slate-500 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-widest cursor-not-allowed w-full text-center leading-tight"
              >
                 🔗 Link Indisponível (Refaça o Scan)
              </div>
            )}
          </div>

          {/* ABAS (TABS) */}
          <div className="flex border-b border-white/5 mb-3 sm:mb-4">
             <button 
                onClick={() => setActiveTab('analise')}
                className={`flex-1 pb-2 text-[7px] sm:text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === 'analise' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-600 hover:text-slate-400'}`}
             >
                BIÓPSIA COMERCIAL
             </button>
             <button 
                onClick={() => setActiveTab('conversa')}
                className={`flex-1 pb-2 text-[7px] sm:text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === 'conversa' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-600 hover:text-slate-400'}`}
             >
                CONVERSA (PROVA)
             </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
             {activeTab === 'analise' ? (
                <div className="flex flex-col gap-3 sm:gap-4">
                  <div className="bg-[#111115] p-3 rounded-xl border border-white/[0.03]">
                    <h4 className="text-[7px] sm:text-[8px] uppercase font-black text-blue-500 mb-1.5 tracking-widest">Mensagem de Prova (Contexto)</h4>
                    <p className="text-blue-100 text-[9px] sm:text-[10px] italic leading-relaxed border-l-2 border-blue-500/50 pl-2">"{lead.mensagem_prova || lead.ultima_mensagem_lead || 'Aguardando auditoria completa.'}"</p>
                  </div>

                  <div className="p-1">
                    <h4 className="text-[7px] sm:text-[8px] uppercase font-black text-slate-500 mb-1.5 tracking-widest">Diagnóstico Moura Leite</h4>
                    <p className="text-slate-200 text-[9px] sm:text-[10px] leading-relaxed font-medium">{lead.porque || 'OpenAI Key não configurada.'}</p>
                  </div>

                  <div className="p-3 bg-blue-500/[0.04] rounded-xl border border-blue-500/10">
                    <h4 className="text-[7px] sm:text-[8px] uppercase font-black text-blue-400 mb-1.5 tracking-widest">Plano de Ação</h4>
                    <p className="text-blue-50 text-[9px] sm:text-[10px] font-bold leading-relaxed">{lead.acao_sugerida || 'Configure sua chave para gerar o plano.'}</p>
                  </div>

                  {lead.mensagem_sugerida && (
                    <div className="p-3 bg-emerald-500/[0.04] rounded-xl border border-emerald-500/10">
                      <h4 className="text-[7px] sm:text-[8px] uppercase font-black text-emerald-400 mb-1.5 tracking-widest">Resposta Sugerida</h4>
                      <p className="text-emerald-50 text-[9px] sm:text-[10px] leading-relaxed font-bold mb-3 italic">"{lead.mensagem_sugerida}"</p>
                      <button 
                        onClick={() => navigator.clipboard.writeText(lead.mensagem_sugerida)}
                        className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest bg-emerald-500 text-black px-4 py-2 rounded-lg hover:scale-[1.02] active:scale-[0.98] transition-all w-full shadow-lg"
                      >
                        Copiar Mensagem
                      </button>
                    </div>
                  )}

                  {/* Botão para marcar como resolvido */}
                  {st !== 'saudável' && (
                    <button
                      onClick={() => handleStatusChange('Saudável')}
                      disabled={saving}
                      className="mt-2 text-[8px] sm:text-[9px] font-black uppercase tracking-widest bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 px-4 py-2.5 rounded-xl hover:bg-emerald-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all w-full"
                    >
                      {saving ? '⏳ Salvando...' : '✓ Marcar como Resolvido (Saudável)'}
                    </button>
                  )}
                </div>
             ) : (
                <div className="flex flex-col gap-2">
                   {(() => {
                      const allMsgs = lead.raw_messages || [];
                      const evidenceText = lead.mensagem_prova || lead.ultima_mensagem_lead;
                      
                      let evidenceIdx = -1;
                      if (evidenceText && allMsgs.length > 0) {
                          // Try substring match from either side to find the exact message
                          evidenceIdx = allMsgs.findIndex((m:any) => m.text.toLowerCase().includes(evidenceText.toLowerCase()) || evidenceText.toLowerCase().includes(m.text.toLowerCase()));
                      }

                      if (evidenceIdx === -1) {
                          // Secrecy fallback se a string gerada pela IA não for um espelho exato do array
                          return (
                              <div className="flex flex-col gap-4">
                                  <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                                     <span className="text-[6px] sm:text-[7px] font-black uppercase tracking-widest text-amber-500 mb-2 block">GARGALO / PROVA DETECTADA</span>
                                     <p className="text-slate-200 leading-relaxed font-medium text-[8px] sm:text-[9px] italic">"{evidenceText}"</p>
                                  </div>
                                  <div className="flex flex-col gap-2 mt-4">
                                      <div className="text-center text-[7px] sm:text-[8px] text-slate-600 font-bold tracking-widest opacity-50 mb-2">••• Conversa Completa •••</div>
                                      {allMsgs.map((m: any, idx: number) => {
                                          const isSdr = m.from === 'SDR';
                                          return (
                                              <div key={idx} className={`p-2.5 rounded-xl text-[8px] sm:text-[9px] max-w-[95%] transition-all ${
                                                  isSdr ? 'bg-blue-600/5 ml-auto border border-blue-600/20' : 'bg-white/5 border border-white/10'
                                              }`}>
                                                  <div className="flex justify-between items-center mb-1">
                                                      <span className={`text-[6px] sm:text-[7px] font-black uppercase tracking-widest ${
                                                          isSdr ? 'text-blue-400' : 'text-emerald-400'
                                                      }`}>
                                                          {isSdr ? 'GLÓRIA / SDR' : 'CLIENTE'}
                                                      </span>
                                                  </div>
                                                  <p className="text-slate-200 leading-relaxed font-medium">{m.text}</p>
                                              </div>
                                          )
                                      })}
                                  </div>
                              </div>
                          )
                      }

                      return (
                         <div className="flex flex-col gap-2">
                            {allMsgs.map((m: any, idx: number) => {
                               const isEvidence = idx === evidenceIdx;
                               const isSdr = m.from === 'SDR';
                               return (
                                  <div key={idx} className={`p-2.5 rounded-xl text-[8px] sm:text-[9px] max-w-[95%] transition-all ${
                                    isEvidence ? 'bg-amber-500/10 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 
                                    isSdr ? 'bg-blue-600/5 ml-auto border border-blue-600/20' : 'bg-white/5 border border-white/10'
                                  }`}>
                                     <div className="flex justify-between items-center mb-1">
                                        <span className={`text-[6px] sm:text-[7px] font-black uppercase tracking-widest ${
                                          isEvidence ? 'text-amber-500' : isSdr ? 'text-blue-400' : 'text-emerald-400'
                                        }`}>
                                           {isSdr ? 'GLÓRIA / SDR' : 'CLIENTE'}
                                           {isEvidence && ' • FOCO DA IA (GARGALO)'}
                                        </span>
                                     </div>
                                     <p className="text-slate-200 leading-relaxed font-medium">{m.text}</p>
                                  </div>
                               );
                            })}
                         </div>
                      );
                   })()}
                   {(!lead.raw_messages || lead.raw_messages.length === 0) && (
                      <p className="text-[8px] sm:text-[9px] text-slate-500 text-center italic">Aguardando auditoria completa.</p>
                   )}
                </div>
             )}
          </div>
          
          {/* FOOTER: Mudar Status */}
          <div className="mt-4 pt-4 border-t border-white/5 flex flex-col items-center justify-center shrink-0">
             <span className="text-[6px] sm:text-[7px] font-black uppercase text-slate-500 tracking-widest mb-2">Classificação da Auditoria</span>
             <div className="relative">
                <button 
                  onClick={() => setShowStatusPicker(!showStatusPicker)}
                  className="px-4 py-1.5 rounded-md text-[8px] sm:text-[9px] font-black uppercase text-white shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2 border border-white/20"
                  style={{ backgroundColor: color }}
                  title="Clique para mudar o status"
                >
                  {currentStatus} <span className="opacity-70">▲</span>
                </button>
                
                {/* Dropdown de Status (Abre para cima para não cortar) */}
                {showStatusPicker && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1a1a1e] border border-white/10 rounded-xl shadow-[0_0_30px_rgba(0,0,0,1)] z-[300] overflow-hidden min-w-[150px]">
                    {STATUS_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => handleStatusChange(opt.value)}
                        disabled={saving}
                        className={`w-full text-left px-4 py-2.5 text-[8px] sm:text-[9px] font-black uppercase tracking-wider flex items-center gap-2 hover:bg-white/5 transition-all ${
                          currentStatus === opt.value ? 'bg-white/10' : ''
                        }`}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                        <span className="text-white">{opt.label}</span>
                        {currentStatus === opt.value && <span className="ml-auto text-[7px] sm:text-[8px]">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}
