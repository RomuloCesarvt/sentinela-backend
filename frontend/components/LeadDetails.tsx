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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-3 bg-black/70 backdrop-blur-md">
      <div 
        className="border w-full max-w-2xl sm:max-w-5xl rounded-2xl sm:rounded-[28px] overflow-hidden relative shadow-[0_0_80px_rgba(0,0,0,1)] flex flex-col animate-in zoom-in-95 max-h-[98vh] sm:max-h-[96vh] transition-colors duration-300"
        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--card-border)', borderTop: `4px solid ${color}` }}
      >
        <button onClick={onClose} className="absolute top-3 sm:top-5 right-3 sm:right-5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2.5 rounded-full transition-all z-50">
          <span className="text-base">✕</span>
        </button>

        <div className="p-4 sm:p-8 flex flex-col h-full overflow-hidden">
          {/* Header — compact */}
          <div className="mb-4 sm:mb-5 shrink-0">
            {/* Row 1: Label + Status */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-widest">SENTINELA INSPECTION</span>
              <div className="relative">
                <button
                  onClick={() => setShowStatusPicker(!showStatusPicker)}
                  className="px-3 py-1 rounded-lg text-[11px] font-black uppercase text-white hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 border border-white/20"
                  style={{ backgroundColor: color }}
                >
                  {currentStatus} <span className="opacity-70 text-[9px]">▼</span>
                </button>
                {showStatusPicker && (
                  <div className="absolute top-full right-0 mt-1 bg-[#1a1a1e] border border-white/10 rounded-xl shadow-[0_0_30px_rgba(0,0,0,1)] z-[300] overflow-hidden min-w-[160px]">
                    {STATUS_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => handleStatusChange(opt.value)}
                        disabled={saving}
                        className={`w-full text-left px-4 py-2.5 text-[12px] font-black uppercase tracking-wider flex items-center gap-2 hover:bg-white/5 transition-all ${currentStatus === opt.value ? 'bg-white/10' : ''}`}
                      >
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: opt.color }} />
                        <span className="text-white">{opt.label}</span>
                        {currentStatus === opt.value && <span className="ml-auto text-[10px]">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Nome */}
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight mb-3 pr-10 break-words">
              {lead.nome}
            </h2>

            {/* Row 3: Score bar + meta inline */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 items-stretch">
              <div className="flex-1 p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                <ScoreBar score={lead.score_engajamento ?? 0} />
              </div>
              <div className="flex flex-wrap gap-2 items-center shrink-0">
                <span className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-300 font-bold text-[12px] uppercase tracking-wide">
                  {lead.empreendimento_detectado || 'EM AUDITORIA'}
                </span>
                {lead.tempo_medio_resposta && (
                  <span className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-300 font-bold text-[12px]">
                    ⏱️ {lead.tempo_medio_resposta}
                  </span>
                )}
                {lead.telefone && <span className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-300 font-medium text-[12px]">📞 {lead.telefone}</span>}
                {lead.origem && <span className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-300 font-bold text-[12px]">🌍 {lead.origem}</span>}
                {lead.etapa && <span className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-300 font-bold text-[12px]">📍 {lead.etapa}</span>}
                {lead.produtos && lead.produtos.length > 0 && (
                  <span className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-300 font-bold text-[12px]" title={lead.produtos.join(', ')}>
                    🏷️ {lead.produtos.join(', ')}
                  </span>
                )}
              </div>
            </div>

            {/* Row 4: Morada link */}
            <div className="mt-3">
              {lead.url_morada ? (
                <a
                  href={lead.url_morada}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20 rounded-xl text-[12px] font-black text-white uppercase tracking-widest transition-all w-full hover:-translate-y-0.5 text-center"
                >
                  ↗ ABRIR CONVERSA NO MORADA AI
                </a>
              ) : (
                <div className="inline-flex items-center justify-center px-4 py-2.5 bg-slate-800 text-slate-500 rounded-xl text-[12px] font-black uppercase tracking-widest cursor-not-allowed w-full text-center">
                  🔗 Link Indisponível (Refaça o Scan)
                </div>
              )}
            </div>
          </div>

          {/* TABS */}
          <div className="flex border-b border-white/10 mb-4 sm:mb-5 shrink-0">
            <button
              onClick={() => setActiveTab('analise')}
              className={`flex-1 pb-3 text-[11px] sm:text-[12px] font-black uppercase tracking-widest transition-all ${activeTab === 'analise' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-600 hover:text-slate-400'}`}
            >
              BIÓPSIA
            </button>
            {hasScorecard && (
              <button
                onClick={() => setActiveTab('scorecard')}
                className={`flex-1 pb-3 text-[11px] sm:text-[12px] font-black uppercase tracking-widest transition-all ${activeTab === 'scorecard' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-600 hover:text-slate-400'}`}
              >
                SCORECARD
              </button>
            )}
            <button
              onClick={() => setActiveTab('conversa')}
              className={`flex-1 pb-3 text-[11px] sm:text-[12px] font-black uppercase tracking-widest transition-all ${activeTab === 'conversa' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-600 hover:text-slate-400'}`}
            >
              CONVERSA
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {activeTab === 'analise' && (
              <div className="flex flex-col gap-6">
                
                {/* MENSAGEM DE PROVA */}
                <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0.02) 100%)', border: '1px solid rgba(59,130,246,0.15)' }}>
                  <div className="px-5 sm:px-6 pt-4 pb-2 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(59,130,246,0.08)' }}>
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: 'rgba(59,130,246,0.15)' }}>
                      <span className="text-base">💬</span>
                    </span>
                    <h4 className="text-[12px] sm:text-[13px] uppercase font-black text-blue-400 tracking-widest">Mensagem de Prova (Contexto)</h4>
                  </div>
                  <div className="px-5 sm:px-6 py-5">
                    <div className="border-l-[3px] border-blue-500/60 pl-5">
                      <p className="text-blue-100 text-[14px] sm:text-[15px] italic leading-[1.85] font-medium" style={{ wordBreak: 'break-word' }}>
                        &ldquo;{lead.mensagem_prova || lead.ultima_mensagem_lead || 'Aguardando auditoria completa.'}&rdquo;
                      </p>
                    </div>
                  </div>
                </div>

                {/* DIAGNÓSTICO */}
                <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(148,163,184,0.06) 0%, rgba(148,163,184,0.01) 100%)', border: '1px solid rgba(148,163,184,0.1)' }}>
                  <div className="px-5 sm:px-6 pt-4 pb-2 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(148,163,184,0.06)' }}>
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: 'rgba(148,163,184,0.1)' }}>
                      <span className="text-base">🔍</span>
                    </span>
                    <h4 className="text-[12px] sm:text-[13px] uppercase font-black text-slate-400 tracking-widest">Diagnóstico Moura Leite</h4>
                  </div>
                  <div className="px-5 sm:px-6 py-5">
                    <p className="text-slate-200 text-[14px] sm:text-[15px] leading-[1.85] font-medium" style={{ wordBreak: 'break-word' }}>
                      {lead.porque || 'Chave de IA não configurada.'}
                    </p>
                  </div>
                </div>

                {/* AÇÕES JÁ REALIZADAS */}
                {lead.acoes_ja_realizadas && lead.acoes_ja_realizadas !== 'Nenhuma ação significativa identificada' && (
                  <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(139,92,246,0.02) 100%)', border: '1px solid rgba(139,92,246,0.15)' }}>
                    <div className="px-5 sm:px-6 pt-4 pb-2 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(139,92,246,0.08)' }}>
                      <span className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: 'rgba(139,92,246,0.15)' }}>
                        <span className="text-base">✅</span>
                      </span>
                      <h4 className="text-[12px] sm:text-[13px] uppercase font-black text-violet-400 tracking-widest">Ações Já Realizadas pela SDR</h4>
                    </div>
                    <div className="px-5 sm:px-6 py-5">
                      <p className="text-violet-100 text-[14px] sm:text-[15px] leading-[1.85] font-medium" style={{ wordBreak: 'break-word' }}>
                        {lead.acoes_ja_realizadas}
                      </p>
                    </div>
                  </div>
                )}

                {/* PLANO DE AÇÃO */}
                <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(99,102,241,0.05) 100%)', border: '1px solid rgba(59,130,246,0.2)', boxShadow: '0 4px 24px rgba(59,130,246,0.06)' }}>
                  <div className="px-5 sm:px-6 pt-4 pb-2 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: 'rgba(59,130,246,0.2)' }}>
                      <span className="text-base">🎯</span>
                    </span>
                    <h4 className="text-[12px] sm:text-[13px] uppercase font-black text-blue-400 tracking-widest">Plano de Ação</h4>
                  </div>
                  <div className="px-5 sm:px-6 py-5">
                    {(() => {
                      const actionText = lead.acao_sugerida || 'Configure sua chave para gerar o plano.';
                      const lines = actionText.split(/[\n\r]+|(?:\.\s+)(?=[A-Z0-9])/g).filter((l: string) => l.trim());
                      if (lines.length > 1) {
                        return (
                          <div className="flex flex-col gap-4">
                            {lines.map((line: string, idx: number) => (
                              <div key={idx} className="flex gap-3 items-start">
                                <span className="flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-black shrink-0 mt-0.5" style={{ background: 'rgba(59,130,246,0.2)', color: '#60a5fa' }}>
                                  {idx + 1}
                                </span>
                                <p className="text-blue-50 text-[14px] sm:text-[15px] font-semibold leading-[1.85] flex-1" style={{ wordBreak: 'break-word' }}>
                                  {line.trim().replace(/\.$/, '')}.
                                </p>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return (
                        <p className="text-blue-50 text-[14px] sm:text-[15px] font-semibold leading-[1.85]" style={{ wordBreak: 'break-word' }}>
                          {actionText}
                        </p>
                      );
                    })()}
                  </div>
                </div>

                {/* RESPOSTA SUGERIDA */}
                {lead.mensagem_sugerida && (
                  <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.02) 100%)', border: '1px solid rgba(16,185,129,0.15)' }}>
                    <div className="px-5 sm:px-6 pt-4 pb-2 flex items-center gap-2.5" style={{ borderBottom: '1px solid rgba(16,185,129,0.08)' }}>
                      <span className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: 'rgba(16,185,129,0.15)' }}>
                        <span className="text-base">✉️</span>
                      </span>
                      <h4 className="text-[12px] sm:text-[13px] uppercase font-black text-emerald-400 tracking-widest">Resposta Sugerida</h4>
                    </div>
                    <div className="px-5 sm:px-6 py-5">
                      <div className="border-l-[3px] border-emerald-500/60 pl-5 mb-5">
                        <p className="text-emerald-50 text-[14px] sm:text-[15px] leading-[1.85] font-medium italic" style={{ wordBreak: 'break-word' }}>
                          &ldquo;{lead.mensagem_sugerida}&rdquo;
                        </p>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(lead.mensagem_sugerida)}
                        className="text-[12px] font-black uppercase tracking-widest bg-emerald-500 text-black px-5 py-3 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all w-full shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
                      >
                        📋 Copiar Mensagem
                      </button>
                    </div>
                  </div>
                )}

                {/* BOTÃO RESOLVER */}
                {st !== 'saudável' && (
                  <button
                    onClick={() => handleStatusChange('Saudável')}
                    disabled={saving}
                    className="text-[12px] font-black uppercase tracking-widest bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 px-5 py-3.5 rounded-xl hover:bg-emerald-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all w-full"
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

          {/* Footer removed — status is now in the header */}
        </div>
      </div>
    </div>
  );
}
