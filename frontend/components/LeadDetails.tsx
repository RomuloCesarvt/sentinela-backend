'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

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
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Engajamento</span>
        <span className="text-[12px] font-black" style={{ color: labelColor }}>{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${s}%`,
              background: `linear-gradient(90deg, ${barColor}88, ${barColor})`,
              boxShadow: `0 0 10px ${barColor}66`,
            }}
          />
        </div>
        <span
          className="text-[14px] font-black tabular-nums min-w-[32px] text-right"
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs uppercase font-black text-slate-500 tracking-widest">Scorecard Auditável</h4>
        {scorecard.pontuacao_detalhada && (
          <span className="text-xs font-bold text-slate-500 italic truncate max-w-[60%] text-right">
            {scorecard.pontuacao_detalhada}
          </span>
        )}
      </div>
      {groups.map(group => {
        const keys = Object.keys(SCORECARD_META).filter(k => SCORECARD_META[k].group === group);
        const activeKeys = keys.filter(k => scorecard[k] === true || scorecard[k] === 'true');
        const meta = GROUP_LABELS[group];

        return (
          <div key={group} className="rounded-xl border border-white/[0.04] overflow-hidden bg-[#0d0d12]">
            <div
              className="px-4 py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-widest"
              style={{ color: meta.color, background: `${meta.color}15` }}
            >
              {meta.label}
            </div>
            <div className="flex flex-col divide-y divide-white/[0.03]">
              {activeKeys.length === 0 && group === 'C' ? (
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-sm text-emerald-400 shrink-0">✓</span>
                  <span className="text-sm text-slate-400 flex-1 leading-tight italic">Nenhuma penalização detectada</span>
                  <span className="text-sm font-black text-emerald-400 shrink-0">0</span>
                </div>
              ) : activeKeys.length === 0 ? (
                <div className="px-4 py-3">
                  <span className="text-sm text-slate-600 italic">Nenhum sinal identificado</span>
                </div>
              ) : (
                activeKeys.map(k => {
                  const info = SCORECARD_META[k];
                  const isNegative = info.pts < 0;
                  return (
                    <div key={k} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                      <span className="text-sm shrink-0" style={{ color: isNegative ? '#ef4444' : '#10b981' }}>
                        {isNegative ? '✗' : '✓'}
                      </span>
                      <span className="text-sm text-slate-300 flex-1 leading-tight">{info.label}</span>
                      <span
                        className="text-sm font-black shrink-0 tabular-nums"
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

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Impede o scroll do body quando o modal está aberto
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!lead || !mounted) return null;

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

  const modalContent = (
    <div 
      className="fixed inset-0 md:left-56 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full max-w-4xl bg-[#0a0a0c] rounded-2xl overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col animate-in zoom-in-95 max-h-[90vh] transition-colors duration-300"
        style={{ border: `1px solid var(--card-border)`, borderTop: `4px solid ${color}` }}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-all z-50 flex items-center justify-center w-8 h-8">
          ✕
        </button>

        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-6 sm:p-8 shrink-0 border-b border-white/5 bg-white/[0.01]">
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start pr-8">
              <div className="flex-1 flex flex-col gap-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">SENTINELA INSPECTION</span>
                <h2 className="text-2xl font-black text-white tracking-tight leading-none break-words">
                  {lead.nome}
                </h2>
                
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded text-indigo-300 font-bold text-xs uppercase tracking-wide">
                    {lead.empreendimento_detectado || 'EM AUDITORIA'}
                  </span>
                  {lead.tempo_medio_resposta && (
                    <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded text-slate-300 font-medium text-xs">
                      ⏱️ {lead.tempo_medio_resposta}
                    </span>
                  )}
                  {lead.telefone && <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded text-slate-300 font-medium text-xs">📞 {lead.telefone}</span>}
                  {lead.origem && <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded text-slate-300 font-medium text-xs">🌍 {lead.origem}</span>}
                  {lead.etapa && <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded text-slate-300 font-medium text-xs">📍 {lead.etapa}</span>}
                </div>
              </div>

              <div className="flex flex-col gap-4 w-full md:w-64 shrink-0">
                <div className="relative">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">STATUS DA AUDITORIA</div>
                  <button
                    onClick={() => setShowStatusPicker(!showStatusPicker)}
                    className="w-full px-4 py-2 rounded-lg text-xs font-black uppercase text-white hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-between shadow-lg"
                    style={{ backgroundColor: color }}
                  >
                    <span>{currentStatus}</span>
                    <span className="opacity-70 text-[10px]">▼</span>
                  </button>
                  {showStatusPicker && (
                    <div className="absolute top-full right-0 mt-2 bg-[#1a1a1e] border border-white/10 rounded-xl shadow-2xl z-[300] overflow-hidden w-full">
                      {STATUS_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => handleStatusChange(opt.value)}
                          disabled={saving}
                          className={`w-full text-left px-4 py-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:bg-white/5 transition-all ${currentStatus === opt.value ? 'bg-white/10' : ''}`}
                        >
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                          <span className="text-white">{opt.label}</span>
                          {currentStatus === opt.value && <span className="ml-auto text-[10px]">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                  <ScoreBar score={lead.score_engajamento ?? 0} />
                </div>
              </div>
            </div>

            {lead.url_morada && (
              <div className="mt-5">
                <a
                  href={lead.url_morada}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-black text-white uppercase tracking-widest transition-all w-full text-center"
                >
                  ↗ ABRIR CONVERSA NO MORADA AI
                </a>
              </div>
            )}
          </div>

          <div className="flex border-b border-white/5 bg-[#0a0a0c] px-6 sm:px-8 pt-4 shrink-0">
            <button
              onClick={() => setActiveTab('analise')}
              className={`pb-3 px-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'analise' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Biópsia
            </button>
            {hasScorecard && (
              <button
                onClick={() => setActiveTab('scorecard')}
                className={`pb-3 px-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'scorecard' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Scorecard
              </button>
            )}
            <button
              onClick={() => setActiveTab('conversa')}
              className={`pb-3 px-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'conversa' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Conversa
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
            {activeTab === 'analise' && (
              <div className="flex flex-col gap-5">
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/[0.02] flex items-center gap-2 bg-white/[0.01]">
                    <span className="text-slate-400">💬</span>
                    <h4 className="text-xs uppercase font-bold text-slate-300 tracking-wider">Mensagem de Prova (Contexto)</h4>
                  </div>
                  <div className="p-5">
                    <div className="border-l-2 border-slate-600 pl-4">
                      <p className="text-slate-200 text-sm leading-relaxed font-medium italic break-words">
                        "{lead.mensagem_prova || lead.ultima_mensagem_lead || 'Aguardando auditoria completa.'}"
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/[0.02] flex items-center gap-2 bg-white/[0.01]">
                    <span className="text-slate-400">🔍</span>
                    <h4 className="text-xs uppercase font-bold text-slate-300 tracking-wider">Diagnóstico Moura Leite</h4>
                  </div>
                  <div className="p-5">
                    <p className="text-slate-200 text-sm leading-relaxed break-words">
                      {lead.porque || 'Chave de IA não configurada.'}
                    </p>
                  </div>
                </div>

                {lead.acoes_ja_realizadas && lead.acoes_ja_realizadas !== 'Nenhuma ação significativa identificada' && (
                  <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-violet-500/10 flex items-center gap-2 bg-violet-500/10">
                      <span>✅</span>
                      <h4 className="text-xs uppercase font-bold text-violet-300 tracking-wider">Ações Já Realizadas pela SDR</h4>
                    </div>
                    <div className="p-5">
                      <p className="text-violet-100 text-sm leading-relaxed break-words">
                        {lead.acoes_ja_realizadas}
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(59,130,246,0.05)]">
                  <div className="px-5 py-3 border-b border-blue-500/10 flex items-center gap-2 bg-blue-500/10">
                    <span>🎯</span>
                    <h4 className="text-xs uppercase font-bold text-blue-400 tracking-wider">Plano de Ação Sugerido</h4>
                  </div>
                  <div className="p-5">
                    {(() => {
                      const actionText = lead.acao_sugerida || 'Configure sua chave para gerar o plano.';
                      const lines = actionText.split(/[\n\r]+|(?:\.\s+)(?=[A-Z0-9])/g).filter((l: string) => l.trim());
                      if (lines.length > 1) {
                        return (
                          <div className="flex flex-col gap-3">
                            {lines.map((line: string, idx: number) => (
                              <div key={idx} className="flex gap-3 items-start">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <p className="text-blue-50 text-sm leading-relaxed flex-1 break-words">
                                  {line.trim().replace(/\.$/, '')}.
                                </p>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return (
                        <p className="text-blue-50 text-sm font-medium leading-relaxed break-words">
                          {actionText}
                        </p>
                      );
                    })()}
                  </div>
                </div>

                {lead.mensagem_sugerida && (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-emerald-500/10 flex items-center gap-2 bg-emerald-500/10">
                      <span>✉️</span>
                      <h4 className="text-xs uppercase font-bold text-emerald-400 tracking-wider">Resposta Pronta Sugerida</h4>
                    </div>
                    <div className="p-5 flex flex-col gap-4">
                      <div className="border-l-2 border-emerald-500/50 pl-4">
                        <p className="text-emerald-100 text-sm leading-relaxed italic break-words">
                          "{lead.mensagem_sugerida}"
                        </p>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(lead.mensagem_sugerida)}
                        className="self-start text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg transition-all shadow-lg"
                      >
                        Copiar Mensagem
                      </button>
                    </div>
                  </div>
                )}

                {st !== 'saudável' && (
                  <button
                    onClick={() => handleStatusChange('Saudável')}
                    disabled={saving}
                    className="mt-2 text-xs font-bold uppercase tracking-wider bg-white/5 border border-white/10 hover:bg-emerald-600/20 hover:border-emerald-500/30 text-slate-300 hover:text-emerald-400 px-5 py-4 rounded-xl transition-all w-full text-center"
                  >
                    {saving ? '⏳ Salvando...' : '✓ Marcar auditoria como Resolvida (Saudável)'}
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
                          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-2 block">Prova Detectada pela IA</span>
                            <p className="text-amber-100/80 leading-relaxed text-sm italic">"{evidenceText}"</p>
                          </div>
                        )}
                        <div className="flex flex-col gap-3">
                          <div className="text-center text-[10px] text-slate-600 font-bold tracking-widest mb-2">Histórico Completo</div>
                          {allMsgs.map((m: any, idx: number) => {
                            const isSdr = m.from === 'SDR';
                            return (
                              <div key={idx} className={`p-3.5 rounded-xl text-sm max-w-[90%] ${isSdr ? 'bg-blue-600/10 ml-auto border border-blue-500/20' : 'bg-white/5 border border-white/10'}`}>
                                <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1.5 ${isSdr ? 'text-blue-400' : 'text-emerald-400'}`}>
                                  {isSdr ? 'SDR' : 'CLIENTE'}
                                </span>
                                <p className="text-slate-200 leading-relaxed">{m.text}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col gap-3">
                      {allMsgs.map((m: any, idx: number) => {
                        const isEvidence = idx === evidenceIdx;
                        const isSdr = m.from === 'SDR';
                        return (
                          <div key={idx} className={`p-3.5 rounded-xl text-sm max-w-[90%] ${
                            isEvidence
                              ? 'bg-amber-500/10 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                              : isSdr
                              ? 'bg-blue-600/10 ml-auto border border-blue-500/20'
                              : 'bg-white/5 border border-white/10'
                          }`}>
                            <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1.5 ${
                              isEvidence ? 'text-amber-500' : isSdr ? 'text-blue-400' : 'text-emerald-400'
                            }`}>
                              {isSdr ? 'SDR' : 'CLIENTE'}
                              {isEvidence && ' • FOCO DA ANÁLISE'}
                            </span>
                            <p className="text-slate-200 leading-relaxed">{m.text}</p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
                {(!lead.raw_messages || lead.raw_messages.length === 0) && (
                  <p className="text-sm text-slate-500 text-center italic py-10">Aguardando auditoria completa ou histórico indisponível.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
