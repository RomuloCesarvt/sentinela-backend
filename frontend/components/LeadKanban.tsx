'use client';
import { useState } from 'react';
import LeadDetails from './LeadDetails';

type Lead = {
  nome: string;
  classificacao: string;
  problema_detectado: string;
  acao_sugerida: string;
  mensagem_sugerida: string;
  porque: string;
  score_engajamento: number;
  ultima_mensagem_lead?: string;
  telefone?: string;
  email?: string;
  origem?: string;
  etapa?: string;
  produtos?: string[];
  acoes_ja_realizadas?: string;
};

export default function LeadKanban({ leads, activeFilter }: { leads: Lead[], activeFilter: string | null }) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const getStatusColor = (cl: string = '') => {
    const c = (cl || '').toLowerCase();
    if (c === 'crítico') return 'border-red-500 bg-red-500/5 text-red-400';
    if (c === 'atenção') return 'border-yellow-500 bg-yellow-500/5 text-yellow-400';
    if (c === 'saudável') return 'border-emerald-500 bg-emerald-500/5 text-emerald-400';
    return 'border-gray-500 bg-gray-500/5 text-gray-400';
  };

  const getStatusBadge = (cl: string = '') => {
    const c = (cl || '').toLowerCase();
    if (c === 'crítico') return { label: 'CRÍTICO', cls: 'bg-red-500/10 text-red-400 border-red-500/20' };
    if (c === 'atenção') return { label: 'ATENÇÃO', cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' };
    if (c === 'saudável') return { label: 'SAUDÁVEL', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    return { label: cl, cls: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };
  };

  // Filtra leads baseado no filtro ativo dos KPIs
  const filteredLeads = activeFilter 
    ? leads.filter(l => {
        const norm = (l.classificacao || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const normFilter = (activeFilter || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return norm.includes(normFilter);
      })
    : leads;

  // Ordena: Críticos primeiro, depois Atenção, Saudável
  const sortOrder: Record<string, number> = { 'crítico': 0, 'atenção': 1, 'saudável': 2 };
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    const aOrder = sortOrder[a.classificacao?.toLowerCase() ?? ''] ?? 4;
    const bOrder = sortOrder[b.classificacao?.toLowerCase() ?? ''] ?? 4;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (b.score_engajamento || 0) - (a.score_engajamento || 0);
  });

  return (
    <>
      {/* Grid ultra-compacto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 w-full">
        {sortedLeads.map((lead, idx) => {
          const badge = getStatusBadge(lead.classificacao);
          return (
            <div 
              key={idx} 
              onClick={() => setSelectedLead(lead)}
              className={`bg-[#0d0d0f] p-2.5 sm:p-3 cursor-pointer hover:bg-[#121215] transition-all rounded-xl border-l-2 ${getStatusColor(lead.classificacao)} group`}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-2">
                <h4 className="font-extrabold text-white text-[11px] sm:text-[12px] truncate flex-1 group-hover:text-blue-300 transition-colors">{lead.nome}</h4>
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  <span className={`px-2 py-0.5 rounded-md border text-[7px] font-black uppercase tracking-wider whitespace-nowrap ${badge.cls}`}>
                    {badge.label}
                  </span>
                  <div className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] sm:text-[10px] font-black shadow-[0_0_8px_rgba(59,130,246,0.2)]">
                    {lead.score_engajamento}
                  </div>
                </div>
              </div>
              <p className="text-[9px] sm:text-[10px] text-slate-400 line-clamp-2 leading-relaxed mb-2">
                {lead.problema_detectado || lead.ultima_mensagem_lead || "Auditado pelo Sentinela"}
              </p>
              
              {(lead.telefone || lead.email) && (
                 <div className="flex flex-col gap-1 mt-auto pt-2 border-t border-white/5">
                    {lead.telefone && (
                       <span className="text-[7px] sm:text-[8px] font-bold text-slate-300 bg-white/5 px-2 py-0.5 rounded flex items-center gap-1 truncate">
                          📞 {lead.telefone}
                       </span>
                    )}
                    {lead.email && (
                       <span className="text-[7px] sm:text-[8px] font-bold text-slate-300 bg-white/5 px-2 py-0.5 rounded flex items-center gap-1 truncate">
                          📧 {lead.email}
                       </span>
                    )}
                 </div>
              )}
            </div>
          );
        })}
        {sortedLeads.length === 0 && (
          <div className="col-span-full text-center p-6 border border-dashed border-white/[0.03] rounded-xl text-slate-600 text-[9px] uppercase tracking-widest font-bold">
            {activeFilter ? 'Nenhum lead nesta categoria' : 'Nenhum lead auditado ainda — Execute um Master Scan'}
          </div>
        )}
      </div>

      {selectedLead && <LeadDetails lead={selectedLead} onClose={() => setSelectedLead(null)} />}
    </>
  );
}
