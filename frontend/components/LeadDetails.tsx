'use client';
import { useState } from 'react';

const STATUS_OPTIONS = [
  { value: 'Crítico', color: '#ef4444', label: 'CRÍTICO' },
  { value: 'Atenção', color: '#eab308', label: 'ATENÇÃO' },
  { value: 'Saudável', color: '#10b981', label: 'SAUDÁVEL' },
];

function ScoreBar({ score }: { score: number }) {
  const s = Math.max(0, Math.min(100, score ?? 0));
  const isHot = s >= 80;
  const isWarm = s >= 50 && s < 80;
  const barColor = isHot ? '#10b981' : isWarm ? '#f59e0b' : '#ef4444';
  const label = isHot ? '🔥 Quente' : isWarm ? '🔸 Morno' : '❄️ Frio';
  const labelColor = isHot ? '#10b981' : isWarm ? '#f59e0b' : '#60a5fa';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[7px] font-black uppercase tracking-widest text-slate-500">Score de Engajamento</span>
        <span className="text-[9px] font-black" style={{ color: labelColor }}>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${s}%`,
              background: `linear-gradient(90deg, ${barColor}88, ${barColor})`,
              boxShadow: `0 0 8px ${barColor}66`,
            }}
          />
        </div>
        <span
          className="text-[11px] font-black tabular-nums min-w-[28px] text-right"
          style={{ color: barColor }}
        >
          {s}
        </span>
      </div>
    </div>
  );
}

const SCORECARD_META: Record<string, { label: string; pts: number; group: string }> = {
  A1_perguntou_valor:           { label: 'Perguntou sobre valor/entrada/parcelas', pts: 15, group: 'A' },
  A2_mencionou_renda:           { label: 'Mencionou renda ou capacidade financeira', pts: 10, group: 'A' },
  A3_pediu_visita:              { label: 'Pediu visita ou demonstrou interesse presencial', pts: 15, group: 'A' },
  A4_comparou_concorrente:      { label: 'Comparou com outro empreendimento', pts: 5, group: 'A' },
  B1_respondeu_rapido:          { label: 'Respondeu em menos de 1h (pelo menos 1 msg)', pts: 10, group: 'B' },
  B2_volume_msgs_3plus:         { label: 'Enviou 3 ou mais mensagens na conversa', pts: 10, group: 'B' },
  B3_respondeu_qualificacao:    { label: 'Respondeu pergunta de qualificação do SDR', pts: 10, group: 'B' },
  C1_em_vacuo_ghosting:         { label: 'Em vácuo/ghosting (última msg é do SDR)', pts: -15, group: 'C' },
  C2_descartou_interesse:       { label: 'Descartou interesse explicitamente', pts: -20, group: 'C' },
  C3_sac_puro:                  { label: 'Conversa exclusivamente de suporte/SAC', pts: -10, group: 'C' },
  C4_objecao_preco_forte:       { label: 'Objeção forte de preço sem abertura', pts: -10, group: 'C' },
  C5_demorou_responder:         { label: 'Demorou +48h para responder (maioria das msgs)', pts: -5, group: 'C' },
  D1_mencionou_prazo:           { label: 'Mencionou prazo concreto de compra', pts: 15, group: 'D' },
  D2_perguntou_processo_compra: { label: 'Perguntou sobre documentação ou financiamento', pts: 10, group: 'D' },
};

const GROUP_LABELS: Record<string, { label: string; color: string }> = {
  A: { label: 'A — Intenção e Qualificação', color: '#3b82f6' },
  B: { label: 'B — Engajamento e Velocidade', color: '#8b5cf6' },
  C: { label: 'C — Penalizações', color: '#ef4444' },
  D: { label: 'D — Bônus de Urgência', color: '#10b981' },
};

function ScorecardPanel({ scorecard }: { scorecard: Record<string, any> }) {
  if (!scorecard) return null;
  const groups = ['A', 'B', 'C', 'D'];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-[7px] sm:text-[8px] uppercase font-black text-slate-500 tracking-widest">Scorecard Auditável</h4>
        {scorecard.pontuacao_detalhada && (
          <span className="text-[7px] font-bold text-slate-600 italic truncate max-w-[55%] text-right">
            {scorecard.pontuacao_detalhada}
          </span>
        )}
      </div>
      {groups.map(group => {
        const keys = Object.keys(SCORECARD_META).filter(k => SCORECARD_META[k].group === group);
        const activeKeys = keys.filter(k => scorecard[k] === true || scorecard[k] === 'true');
        const meta = GROUP_LABELS[group];

        return (
          <div key={group} className="rounded-lg border border-white/[0.04] overflow-hidden">
            <div
              className="px-2 py-1 text-[6px] font-black uppercase tracking-widest"
              style={{ color: meta.color, background: `${meta.color}10` }}
            >
              {meta.label}
            </div>
            <div className="flex flex-col divide-y divide-white/[0.03]">
              {activeKeys.length === 0 && group === 'C' ? (
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <span className="text-[10px] text-emerald-400 shrink-0">✓</span>
                  <span className="text-[8px] text-slate-400 flex-1 leading-tight italic">Nenhuma penalização detectada</span>
                  <span className="text-[8px] font-black text-emerald-400 shrink-0">0</span>
                </div>
              ) : activeKeys.length === 0 ? (
                <div className="px-2 py-1.5">
                  <span className="text-[8px] text-slate-600 italic">Nenhum sinal identificado</span>
                </div>
              ) : (
                activeKeys.map(k => {
                  const info = SCORECARD_META[k];
                  const isNegative = info.pts < 0;
                  return (
                    <div key={k} className="flex items-center gap-2 px-2 py-1.5">
                      <span className="text-[10px] shrink-0" style={{ color: isNegative ? '#ef4444' : '#10b981' }}>
                        {isNegative ? '✗' : '✓'}
                      </span>
                      <span className="text-[8px] text-slate-300 flex-1 leading-tight">{info.label}</span>
                      <span
                        className="text-[8px] font-black shrink-0 tabular-nums"
                        style={{ color: isNegative ? '#ef4444' : '#10b981' }}
                      >
                        {info.pts > 0 ? `+${info.pts}` : info.pts}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function LeadDetails({ lead, onClose, onStatusChange }: { lead: any, onClose: () => void, onStatusChange?: (nome: string, status: string) => void }) {
  const [activeTab, setActiveTab] = useState<'analise' | 'conversa' | 'scorecard'>('analise');
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(lead?.classificacao || 'Atenção');
  const [saving, setSaving] = useState(false);

  if (!lead) return null;

  const st = (currentStatus || 'Atenção').toLowerCase();
  const color = st === 'crítico' ? '#ef4444' : st === 'atenção' ? '#eab308' : '#10b981';
  const hasScorecard = lead.scorecard && typeof lead.scorecard === 'object';

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true);
    try {
      const { db } = await import('../lib/firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      const docId = lead.nome.toLowerCase().trim().replace(/ /g, '_').replace(/\//g, '_');
      const docRef = doc(db, 'leads', docId);
      await updateDoc(docRef, { classificacao: newStatus });
      setCurrentStatus(newStatus);
      setShowStatusPicker(false);
      if (onStatusChange) onStatusChange(lead.nome, newStatus);
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
          {/* Header */}
          <div className="mb-3 sm:mb-4">
            <span className="text-[6px] sm:text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none block mb-2">SENTINELA INSPECTION</span>

            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight mb-3 pr-6 break-words">
              {lead.nome}
            </h2>

            {/* Score Bar */}
            <div className="mb-3 p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
              <ScoreBar score={lead.score_engajamento ?? 0} />
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[7px] sm:text-[8px] font-bold text-indigo-400 uppercase tracking-widest">{lead.empreendimento_detectado || 'EM AUDITORIA'}</span>
              {lead.tempo_medio_resposta && (
                <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-slate-300 font-bold text-[8px]">
                  ⏱️ {lead.tempo_medio_resposta}
                </span>
              )}
            </div>

            {/* Contato */}
            {(lead.telefone || lead.email || lead.origem || lead.etapa || (lead.produtos && lead.produtos.length > 0)) && (
              <div className="flex flex-col gap-1 mb-3 pt-2 border-t border-white/5">
                <span className="text-[6px] sm:text-[7px] font-black text-slate-600 uppercase tracking-widest">Master Data</span>
                {lead.telefone && <span className="text-[8px] font-medium text-slate-300 flex items-center gap-1 truncate">📞 {lead.telefone}</span>}
                {lead.email && <span className="text-[8px] font-medium text-slate-300 flex items-center gap-1 truncate">📧 {lead.email}</span>}
                {lead.origem && <span className="text-[8px] font-bold text-blue-300 flex items-center gap-1 truncate">🌍 {lead.origem}</span>}
                {lead.etapa && <span className="text-[8px] font-bold text-indigo-300 flex items-center gap-1 truncate">📍 Funil: {lead.etapa}</span>}
                {lead.produtos && lead.produtos.length > 0 && (
                  <span className="text-[8px] font-bold text-[#00ffff] flex items-center gap-1 truncate" title={lead.produtos.join(', ')}>
                    🏷️ {lead.produtos.join(', ')}
                  </span>
                )}
              </div>
            )}

            {lead.url_morada ? (
              <a
                href={lead.url_morada}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-3 py-2 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20 rounded-lg text-[8px] font-black text-white uppercase tracking-widest transition-all w-full hover:-translate-y-0.5 text-center"
              >
                ↗ ABRIR CONVERSA NO MORADA AI
              </a>
            ) : (
              <div className="inline-flex items-center justify-center px-3 py-2 bg-slate-800 text-slate-500 rounded-lg text-[8px] font-black uppercase tracking-widest cursor-not-allowed w-full text-center">
                🔗 Link Indisponível (Refaça o Scan)
              </div>
            )}
          </div>

          {/* TABS */}
          <div className="flex border-b border-white/5 mb-3 sm:mb-4">
            <button
              onClick={() => setActiveTab('analise')}
              className={`flex-1 pb-2 text-[7px] font-black uppercase tracking-widest transition-all ${activeTab === 'analise' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-600 hover:text-slate-400'}`}
            >
              BIÓPSIA
            </button>
            {hasScorecard && (
              <button
                onClick={() => setActiveTab('scorecard')}
                className={`flex-1 pb-2 text-[7px] font-black uppercase tracking-widest transition-all ${activeTab === 'scorecard' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-600 hover:text-slate-400'}`}
              >
                SCORECARD
              </button>
            )}
            <button
              onClick={() => setActiveTab('conversa')}
              className={`flex-1 pb-2 text-[7px] font-black uppercase tracking-widest transition-all ${activeTab === 'conversa' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-600 hover:text-slate-400'}`}
            >
              CONVERSA
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {activeTab === 'analise' && (
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="bg-[#111115] p-3 rounded-xl border border-white/[0.03]">
                  <h4 className="text-[7px] uppercase font-black text-blue-500 mb-1.5 tracking-widest">Mensagem de Prova (Contexto)</h4>
                  <p className="text-blue-100 text-[9px] italic leading-relaxed border-l-2 border-blue-500/50 pl-2">"{lead.mensagem_prova || lead.ultima_mensagem_lead || 'Aguardando auditoria completa.'}"</p>
                </div>

                <div className="p-1">
                  <h4 className="text-[7px] uppercase font-black text-slate-500 mb-1.5 tracking-widest">Diagnóstico Moura Leite</h4>
                  <p className="text-slate-200 text-[9px] leading-relaxed font-medium">{lead.porque || 'Chave de IA não configurada.'}</p>
                </div>

                {lead.acoes_ja_realizadas && lead.acoes_ja_realizadas !== 'Nenhuma ação significativa identificada' && (
                  <div className="p-3 bg-violet-500/[0.04] rounded-xl border border-violet-500/10">
                    <h4 className="text-[7px] uppercase font-black text-violet-400 mb-1.5 tracking-widest">✓ Ações Já Realizadas pela SDR</h4>
                    <p className="text-violet-100 text-[9px] leading-relaxed font-medium">{lead.acoes_ja_realizadas}</p>
                  </div>
                )}

                <div className="p-3 bg-blue-500/[0.04] rounded-xl border border-blue-500/10">
                  <h4 className="text-[7px] uppercase font-black text-blue-400 mb-1.5 tracking-widest">Plano de Ação</h4>
                  <p className="text-blue-50 text-[9px] font-bold leading-relaxed">{lead.acao_sugerida || 'Configure sua chave para gerar o plano.'}</p>
                </div>

                {lead.mensagem_sugerida && (
                  <div className="p-3 bg-emerald-500/[0.04] rounded-xl border border-emerald-500/10">
                    <h4 className="text-[7px] uppercase font-black text-emerald-400 mb-1.5 tracking-widest">Resposta Sugerida</h4>
                    <p className="text-emerald-50 text-[9px] leading-relaxed font-bold mb-3 italic">"{lead.mensagem_sugerida}"</p>
                    <button
                      onClick={() => navigator.clipboard.writeText(lead.mensagem_sugerida)}
                      className="text-[8px] font-black uppercase tracking-widest bg-emerald-500 text-black px-4 py-2 rounded-lg hover:scale-[1.02] active:scale-[0.98] transition-all w-full shadow-lg"
                    >
                      Copiar Mensagem
                    </button>
                  </div>
                )}

                {st !== 'saudável' && (
                  <button
                    onClick={() => handleStatusChange('Saudável')}
                    disabled={saving}
                    className="mt-2 text-[8px] font-black uppercase tracking-widest bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 px-4 py-2.5 rounded-xl hover:bg-emerald-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all w-full"
                  >
                    {saving ? '⏳ Salvando...' : '✓ Marcar como Resolvido (Saudável)'}
                  </button>
                )}
              </div>
            )}

            {activeTab === 'scorecard' && <ScorecardPanel scorecard={lead.scorecard} />}

            {activeTab === 'conversa' && (
              <div className="flex flex-col gap-2">
                {(() => {
                  const allMsgs = lead.raw_messages || [];
                  const evidenceText = lead.mensagem_prova || lead.ultima_mensagem_lead;
                  let evidenceIdx = -1;
                  if (evidenceText && allMsgs.length > 0) {
                    evidenceIdx = allMsgs.findIndex((m: any) =>
                      m.text.toLowerCase().includes(evidenceText.toLowerCase()) ||
                      evidenceText.toLowerCase().includes(m.text.toLowerCase())
                    );
                  }

                  if (evidenceIdx === -1) {
                    return (
                      <div className="flex flex-col gap-4">
                        {evidenceText && (
                          <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded-xl">
                            <span className="text-[6px] font-black uppercase tracking-widest text-amber-500 mb-2 block">GARGALO / PROVA DETECTADA</span>
                            <p className="text-slate-200 leading-relaxed font-medium text-[8px] italic">"{evidenceText}"</p>
                          </div>
                        )}
                        <div className="flex flex-col gap-2">
                          <div className="text-center text-[7px] text-slate-600 font-bold tracking-widest opacity-50 mb-2">••• Conversa Completa •••</div>
                          {allMsgs.map((m: any, idx: number) => {
                            const isSdr = m.from === 'SDR';
                            return (
                              <div key={idx} className={`p-2.5 rounded-xl text-[8px] max-w-[95%] ${isSdr ? 'bg-blue-600/5 ml-auto border border-blue-600/20' : 'bg-white/5 border border-white/10'}`}>
                                <span className={`text-[6px] font-black uppercase tracking-widest block mb-1 ${isSdr ? 'text-blue-400' : 'text-emerald-400'}`}>
                                  {isSdr ? 'GLÓRIA / SDR' : 'CLIENTE'}
                                </span>
                                <p className="text-slate-200 leading-relaxed font-medium">{m.text}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col gap-2">
                      {allMsgs.map((m: any, idx: number) => {
                        const isEvidence = idx === evidenceIdx;
                        const isSdr = m.from === 'SDR';
                        return (
                          <div key={idx} className={`p-2.5 rounded-xl text-[8px] max-w-[95%] ${
                            isEvidence
                              ? 'bg-amber-500/10 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                              : isSdr
                              ? 'bg-blue-600/5 ml-auto border border-blue-600/20'
                              : 'bg-white/5 border border-white/10'
                          }`}>
                            <span className={`text-[6px] font-black uppercase tracking-widest block mb-1 ${
                              isEvidence ? 'text-amber-500' : isSdr ? 'text-blue-400' : 'text-emerald-400'
                            }`}>
                              {isSdr ? 'GLÓRIA / SDR' : 'CLIENTE'}
                              {isEvidence && ' • FOCO DA IA (GARGALO)'}
                            </span>
                            <p className="text-slate-200 leading-relaxed font-medium">{m.text}</p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
                {(!lead.raw_messages || lead.raw_messages.length === 0) && (
                  <p className="text-[8px] text-slate-500 text-center italic">Aguardando auditoria completa.</p>
                )}
              </div>
            )}
          </div>

          {/* Footer: Status */}
          <div className="mt-4 pt-4 border-t border-white/5 flex flex-col items-center justify-center shrink-0">
            <span className="text-[6px] font-black uppercase text-slate-500 tracking-widest mb-2">Classificação da Auditoria</span>
            <div className="relative">
              <button
                onClick={() => setShowStatusPicker(!showStatusPicker)}
                className="px-4 py-1.5 rounded-md text-[8px] font-black uppercase text-white shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2 border border-white/20"
                style={{ backgroundColor: color }}
              >
                {currentStatus} <span className="opacity-70">▲</span>
              </button>

              {showStatusPicker && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1a1a1e] border border-white/10 rounded-xl shadow-[0_0_30px_rgba(0,0,0,1)] z-[300] overflow-hidden min-w-[150px]">
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleStatusChange(opt.value)}
                      disabled={saving}
                      className={`w-full text-left px-4 py-2.5 text-[8px] font-black uppercase tracking-wider flex items-center gap-2 hover:bg-white/5 transition-all ${currentStatus === opt.value ? 'bg-white/10' : ''}`}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                      <span className="text-white">{opt.label}</span>
                      {currentStatus === opt.value && <span className="ml-auto text-[7px]">✓</span>}
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
