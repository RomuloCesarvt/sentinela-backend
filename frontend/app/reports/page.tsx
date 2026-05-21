'use client';
import { useState, useEffect } from 'react';
import AuraIsland from '../../components/AuraIsland';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ReportsPage() {
  const [audits, setAudits] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { db } = await import('../../lib/firebase');
        const { collection, getDocs } = await import('firebase/firestore');
        const snapshot = await getDocs(collection(db, 'leads'));
        const loadedLeads: any[] = [];
        snapshot.forEach(doc => {
          loadedLeads.push(doc.data());
        });
        
        // Cria um único relatório global
        setAudits([{
          id: 'Snapshot Global (Tempo Real)',
          leads: loadedLeads
        }]);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  const handleDownloadPDF = async (audit: any) => {
    try {
      const doc = new jsPDF() as any;

      // Cores e Estilo Corporativo do Sentinela IA
      const bgDark: [number, number, number] = [10, 15, 30]; // #0A0F1E
      const textLight: [number, number, number] = [240, 240, 240];
      const textDim: [number, number, number] = [150, 160, 180];
      const primary: [number, number, number] = [59, 130, 246]; // Azul
      const danger: [number, number, number] = [239, 68, 68];
      const warning: [number, number, number] = [234, 179, 8];
      const success: [number, number, number] = [34, 197, 94];

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Intercepta a criação de novas páginas (ex: overflow da tabela) para preencher com o tom escuro
      const originalAddPage = doc.addPage.bind(doc);
      doc.addPage = function(...args: any[]) {
          originalAddPage(...args);
          doc.setFillColor(bgDark[0], bgDark[1], bgDark[2]);
          doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), 'F');
          return this;
      };

      // Busca o logo publico
      let logoBase64: string | null = null;
      try {
        const response = await fetch('/logo.png');
        if (response.ok) {
           const blob = await response.blob();
           logoBase64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
           });
        }
      } catch (e) {
        console.warn("Logo não encontrado, usando fallback geométrico", e);
      }

      // -- Função de Cabeçalho Corporativo e Logo --
      const addHeader = (pageTitle: string) => {
        // Fundo Escuro para a página toda
        doc.setFillColor(bgDark[0], bgDark[1], bgDark[2]);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        if (logoBase64) {
           // Adiciona o logo da imagem oficial anexada
           doc.addImage(logoBase64, 'PNG', 14, 12, 16, 16);
        } else {
           // Fallback Logo Sentinela (Geométrico)
           doc.setDrawColor(primary[0], primary[1], primary[2]);
           doc.setFillColor(20, 30, 50);
           doc.setLineWidth(1);
           doc.rect(14, 14, 12, 12, 'FD'); // Escudo
           doc.setDrawColor(255, 255, 255);
           doc.setFillColor(primary[0], primary[1], primary[2]);
           doc.rect(18.5, 18.5, 3, 3, 'F'); // Olho central
        }

        // Títulos
        doc.setTextColor(textLight[0], textLight[1], textLight[2]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.text("SENTINELA IA", 33, 22);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(textDim[0], textDim[1], textDim[2]);
        doc.text(`MOURA LEITE LOTEAMENTOS  |  ${pageTitle}`, 16, 36);
        
        // Linha divisória minimalista
        doc.setDrawColor(40, 50, 70);
        doc.setLineWidth(0.5);
        doc.line(14, 40, pageWidth - 14, 40);
      };

      // --- PÁGINA 1: RESUMO EXECUTIVO ---
      addHeader("Visão Executiva & Saúde da Base");

      const leads = audit.leads || [];
      const criticos = leads.filter((l:any) => l.classificacao === 'Crítico');
      const atencao = leads.filter((l:any) => l.classificacao === 'Atenção');
      const saudaveis = leads.filter((l:any) => l.classificacao === 'Saudável');
      const total = leads.length || 1;

      // Scores de Engajamento
      const scoresFrios = leads.filter((l:any) => (l.score_engajamento || 0) < 50).length;
      const scoresMornos = leads.filter((l:any) => (l.score_engajamento || 0) >= 50 && (l.score_engajamento || 0) < 80).length;
      const scoresQuentes = leads.filter((l:any) => (l.score_engajamento || 0) >= 80).length;

      // Metadados
      const dataStr = new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR');
      doc.setFontSize(10);
      doc.setTextColor(textDim[0], textDim[1], textDim[2]);
      doc.text(`Data da Auditoria: ${dataStr}`, 14, 50);
      doc.text(`ID do Laudo: ${audit.id}`, 14, 56);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(textLight[0], textLight[1], textLight[2]);
      doc.text(`Volume Processado: ${total} Leads Avaliados`, 14, 62);
      doc.setFont("helvetica", "normal");

      // 1. CARDS KPI INICIAIS
      const drawMetricCard = (x: number, y: number, w: number, h: number, title: string, value: string, color: number[]) => {
        doc.setFillColor(color[0] * 0.15, color[1] * 0.15, color[2] * 0.15); 
        doc.setDrawColor(color[0], color[1], color[2]);
        doc.rect(x, y, w, h, 'FD');
        doc.setTextColor(textDim[0], textDim[1], textDim[2]);
        doc.setFontSize(9);
        doc.text(title.toUpperCase(), x + 5, y + 8);
        doc.setTextColor(color[0], color[1], color[2]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.text(value, x + 5, y + 20);
        doc.setFont("helvetica", "normal");
      };

      let cardW = (pageWidth - 28 - 10) / 3;
      drawMetricCard(14, 72, cardW, 26, "Saudáveis", saudaveis.length.toString(), success);
      drawMetricCard(14 + cardW + 5, 72, cardW, 26, "Em Atenção", atencao.length.toString(), warning);
      drawMetricCard(14 + (cardW + 5) * 2, 72, cardW, 26, "Críticos (Perdas)", criticos.length.toString(), danger);

      // 2. TERMÔMETRO PROPORCIONAL
      doc.setTextColor(textLight[0], textLight[1], textLight[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Distribuição de Risco (Global)", 14, 115);

      const barY = 120;
      const barH = 10;
      const barW = pageWidth - 28;
      
      let offset = 14;
      [ 
        { count: saudaveis.length, color: success }, 
        { count: atencao.length, color: warning }, 
        { count: criticos.length, color: danger } 
      ].forEach(item => {
        if(item.count > 0) {
          const pct = (item.count / total) * barW;
          doc.setFillColor(item.color[0], item.color[1], item.color[2]);
          doc.rect(offset, barY, pct, barH, 'F');
          offset += pct;
        }
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(textDim[0], textDim[1], textDim[2]);
      doc.text(`${Math.round((saudaveis.length/total)*100)}% Preservados`, 14, barY + barH + 7);
      doc.text(`${Math.round((atencao.length/total)*100)}% Oscilando`, pageWidth / 2, barY + barH + 7, { align: 'center' });
      doc.text(`${Math.round((criticos.length/total)*100)}% Contaminados`, pageWidth - 14, barY + barH + 7, { align: 'right' });

      // 3. GRÁFICO: DISTRIBUIÇÃO DE ENGAJAMENTO (Mini Colunas Verticais)
      doc.setTextColor(textLight[0], textLight[1], textLight[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Curva de Engajamento da Base", 14, 155);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(textDim[0], textDim[1], textDim[2]);
      doc.text("Métricas isoladas da nota da inteligência artificial (0 a 100).", 14, 161);

      const chartY = 205;
      const maxColH = 30;
      const maxScoreVol = Math.max(scoresFrios, scoresMornos, scoresQuentes) || 1;
      
      const drawCol = (cX: number, label: string, vol: number, color: number[]) => {
         const h = (vol / maxScoreVol) * maxColH;
         doc.setFillColor(20, 25, 40);
         doc.rect(cX, chartY - maxColH, 20, maxColH, 'F'); // Back bar
         doc.setFillColor(color[0], color[1], color[2]);
         doc.rect(cX, chartY - h, 20, h, 'F'); // Value bar
         doc.setTextColor(textLight[0], textLight[1], textLight[2]);
         doc.setFontSize(10);
         doc.text(`${vol}`, cX + 10, chartY - h - 3, { align: 'center' });
         doc.setTextColor(textDim[0], textDim[1], textDim[2]);
         doc.setFontSize(8);
         doc.text(label, cX + 10, chartY + 5, { align: 'center' });
      };

      const startX = (pageWidth / 2) - 45;
      drawCol(startX, "Frios (<50)", scoresFrios, danger);
      drawCol(startX + 35, "Mornos (50-79)", scoresMornos, warning);
      drawCol(startX + 75, "Quentes (>=80)", scoresQuentes, success);


      // --- PÁGINA 2: INTELIGÊNCIA E PLANO DE INTERVENÇÃO ---
      doc.addPage();
      addHeader("Inteligência: Diagnóstico e Intervenção");

      doc.setTextColor(textLight[0], textLight[1], textLight[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Análise Semântica: Motivos Raiz dos Gargalos", 14, 55);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(textDim[0], textDim[1], textDim[2]);
      doc.text("Processamento de linguagem natural mapeando por que os leads estão travando.", 14, 61);
      
      const allIssues = [...criticos, ...atencao].map(l => (l.problema_detectado || '').toLowerCase());
      
      const patterns = [
        { key: 'demora', label: 'Follow-up / Atraso / Esfriou', count: 0 },
        { key: 'preco', label: 'Preço / Condições / Financeiro', count: 0 },
        { key: 'perfil', label: 'Desalinhamento / Perfil Incorreto', count: 0 },
        { key: 'visto', label: 'Ignorado / Somente Visualizado', count: 0 },
        { key: 'concor', label: 'Concorrência / Comprou Outro', count: 0 }
      ];

      allIssues.forEach(text => {
         if(text.includes('demora') || text.includes('tempo') || text.includes('follow') || text.includes('esfri') || text.includes('dia')) patterns[0].count++;
         if(text.includes('preço') || text.includes('caro') || text.includes('valor') || text.includes('financ')) patterns[1].count++;
         if(text.includes('perfil') || text.includes('longe') || text.includes('distânc') || text.includes('fora')) patterns[2].count++;
         if(text.includes('vácuo') || text.includes('não respond') || text.includes('visualizou') || text.includes('sumiu')) patterns[3].count++;
         if(text.includes('concorren') || text.includes('outro lote') || text.includes('já comprou')) patterns[4].count++;
      });

      let pY = 70;
      const activePatterns = patterns.filter(p => p.count > 0).sort((a,b) => b.count - a.count);
      
      if(activePatterns.length === 0) {
          doc.setTextColor(success[0], success[1], success[2]);
          doc.text("Sem padrões alarmantes recorrentes detectados. O pipeline parece fluido.", 14, pY);
          pY += 15;
      } else {
        const topCount = activePatterns[0].count;
        activePatterns.forEach(p => {
           doc.setFillColor(20, 25, 40);
           doc.rect(14, pY, pageWidth - 28, 12, 'F');
           const barWidth = (p.count / topCount) * 40; // max 40px width bar
           doc.setFillColor(danger[0], danger[1], danger[2]);
           doc.rect(14, pY, barWidth + 2, 12, 'F'); // Graphic highlight

           doc.setTextColor(255, 255, 255);
           doc.setFont("helvetica", "bold");
           doc.text(`${p.count}x`, 18, pY + 8);
           
           doc.setTextColor(textLight[0], textLight[1], textLight[2]);
           doc.setFont("helvetica", "normal");
           doc.text(`${p.label}`, 55, pY + 8);
           pY += 15;
        });
      }

      // NOVO: PLANO DE INTERVENÇÃO / AÇÃO
      pY += 10;
      doc.setFillColor(15, 20, 35);
      doc.setDrawColor(primary[0], primary[1], primary[2]);
      doc.setLineWidth(0.5);
      doc.rect(14, pY, pageWidth - 28, 80, 'FD');
      
      doc.setTextColor(primary[0], primary[1], primary[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Plano de Intervenção Estratégico (Sugerido pela IA)", 20, pY + 10);
      
      doc.setTextColor(textLight[0], textLight[1], textLight[2]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      
      let recoTatica = "A rede está saudável, mantenha os padrões atuais de atendimento e SLA.";
      let acaoGestor = "Continuar monitorando a entrada de leads e a taxa de conversão final.";
      let acaoEquipe = "Foco em up-sell e indicações, já que não há atritos severos no topo do funil.";

      if (activePatterns.length > 0) {
         const piorGargalo = activePatterns[0].key;
         if(piorGargalo === 'demora') {
           recoTatica = "Identificamos que o TEMPO DE RESPOSTA (SLA) é o principal ofensor das negociações.";
           acaoGestor = "Implemente uma regra tática de atendimento até 30 min. Faça call de alinhamento com a equipe.";
           acaoEquipe = "Não deixe leads para o dia seguinte. A primeira mensagem determina a temperatura da venda.";
         } else if (piorGargalo === 'preco') {
           recoTatica = "O maior fator de perda é OBJEÇÃO DE PREÇO/CONDIÇÃO de pagamento.";
           acaoGestor = "Revise o script com o time de marketing para qualificação prévia de orçamento.";
           acaoEquipe = "Em vez de enviar tabelas por WhatsApp, tente focar nos benefícios e trazer para visita ao local.";
         } else if (piorGargalo === 'visto') {
           recoTatica = "Alta taxa de VÁCUO (Lead lê e não responde), gerando perda invisível.";
           acaoGestor = "Audite as primeiras mensagens automáticas/SDR. Pode estar soando muito robótico ou assustando.";
           acaoEquipe = "Evite mandar 'textão'. Faça perguntas abertas e curtas que exijam apenas um 'Sim' ou 'Não'.";
         } else if (piorGargalo === 'perfil') {
           recoTatica = "O marketing está enviando leads FORA DA REGIÃO ou com PERFIL DESALINHADO.";
           acaoGestor = "Ajustar segmentação das campanhas do Meta Ads/Google Ads urgente (Raio de KM e Idade).";
           acaoEquipe = "Descarte rápido. Faça 3 perguntas de qualificação logo no início para não perder tempo com curiosos.";
         }
      }

      doc.setFont("helvetica", "bold");
      doc.text("Contexto:", 20, pY + 25);
      doc.setFont("helvetica", "normal");
      doc.text(recoTatica, 42, pY + 25, { maxWidth: pageWidth - 60 });

      doc.setFont("helvetica", "bold");
      doc.text("Ação P/ Gestão:", 20, pY + 45);
      doc.setFont("helvetica", "normal");
      doc.text(acaoGestor, 52, pY + 45, { maxWidth: pageWidth - 70 });

      doc.setFont("helvetica", "bold");
      doc.text("Ação P/ SDRs:", 20, pY + 65);
      doc.setFont("helvetica", "normal");
      doc.text(acaoEquipe, 50, pY + 65, { maxWidth: pageWidth - 70 });


      // --- PÁGINA 3: DETALHAMENTO TÉCNICO (Matriz) ---
      doc.addPage();
      addHeader("Laudo Integrativo: Matriz de Contatos em Risco");

      const issuesList = leads
        .filter((l:any) => l.classificacao === 'Crítico' || l.classificacao === 'Atenção')
        .sort((a:any, b:any) => (b.score_engajamento || 0) - (a.score_engajamento || 0));

      const tableData = issuesList.map((l:any) => [
        l.nome?.substring(0, 20) || 'Desc.',
        l.telefone || 'N/A',
        (l.classificacao || '').toUpperCase(),
        `${l.score_engajamento || '?'}`,
        (l.problema_detectado || 'Sintoma Indefinido')
      ]);

      if(tableData.length > 0) {
          autoTable(doc, {
            startY: 45,
            head: [['Lead', 'Contato', 'Risco', 'Score', 'Diagnóstico da IA (Causa Raiz)']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: primary, textColor: 255, fontSize: 10, fontStyle: 'bold' },
            bodyStyles: { fontSize: 9, cellPadding: 3 },
            styles: { 
              fillColor: [15, 20, 35], 
              textColor: [200, 200, 200], 
              lineColor: [40, 50, 70], 
              lineWidth: 0.1 
            },
            alternateRowStyles: { fillColor: [20, 25, 45] },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 30 },
                2: { cellWidth: 22 },
                3: { cellWidth: 15 },
                4: { cellWidth: 'auto' }
            },
            didParseCell: function(data: any) {
              if (data.section === 'body' && data.column.index === 2) {
                 if (data.cell.raw === 'CRÍTICO') {
                    data.cell.styles.textColor = danger;
                    data.cell.styles.fontStyle = 'bold';
                 } else if (data.cell.raw === 'ATENÇÃO') {
                    data.cell.styles.textColor = warning;
                    data.cell.styles.fontStyle = 'bold';
                 } else {
                    data.cell.styles.textColor = success;
                 }
              }
            }
          });
      } else {
          doc.setTextColor(textDim[0], textDim[1], textDim[2]);
          doc.text("Todos os leads avaliados encontram-se em estado SAUDÁVEL na última varredura. Nada a constar no laudo integrativo.", 14, 55);
      }

      // --- PÁGINA: OPORTUNIDADES QUENTES ---
      const quentesList = leads
        .filter((l:any) => (l.score_engajamento || 0) >= 80)
        .sort((a:any, b:any) => (b.score_engajamento || 0) - (a.score_engajamento || 0));

      if(quentesList.length > 0) {
          doc.addPage();
          addHeader("Pipeline: Oportunidades Quentes (Alta Intenção)");
          
          doc.setTextColor(textLight[0], textLight[1], textLight[2]);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(14);
          doc.text("Leads Quentes Mapeados", 14, 55);
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(textDim[0], textDim[1], textDim[2]);
          doc.text("Estes leads demonstraram forte engajamento (Score 80+). Priorize o contato humano para fechamento.", 14, 61);

          const quentesTableData = quentesList.map((l:any) => [
            l.nome?.substring(0, 20) || 'Desc.',
            l.telefone || 'N/A',
            (l.classificacao || '').toUpperCase(),
            `${l.score_engajamento || '?'}`,
            (l.acao_sugerida || 'Fazer follow-up com proposta e incentivar visita.')
          ]);

          autoTable(doc, {
            startY: 70,
            head: [['Lead', 'Contato', 'Status', 'Score', 'Ação Estratégica (Próximo Passo)']],
            body: quentesTableData,
            theme: 'grid',
            headStyles: { fillColor: success, textColor: 255, fontSize: 10, fontStyle: 'bold' },
            bodyStyles: { fontSize: 9, cellPadding: 3 },
            styles: { 
              fillColor: [15, 20, 35], 
              textColor: [200, 200, 200], 
              lineColor: [40, 50, 70], 
              lineWidth: 0.1 
            },
            alternateRowStyles: { fillColor: [20, 25, 45] },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 30 },
                2: { cellWidth: 22 },
                3: { cellWidth: 15 },
                4: { cellWidth: 'auto' }
            },
            didParseCell: function(data: any) {
              if (data.section === 'body' && data.column.index === 2) {
                 data.cell.styles.textColor = success;
                 data.cell.styles.fontStyle = 'bold';
              }
            }
          });
      }

      // --- RODAPÉ GLOBAL COM NUMERAÇÃO ---
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 120);
        doc.text(
          `Documento Confidencial | Gerado por Sentinela IA Automático | Página ${i} de ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Geração em Base64 Bypassing Browser Blob Restrictions:
      const pdfDataUri = doc.output('datauristring');
      const downloadLink = document.createElement('a');
      downloadLink.href = pdfDataUri;
      downloadLink.download = `Sentinela_Diagnostico_${audit.id || "Report"}.pdf`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

    } catch(err: any) {
      console.error("Erro ao gerar PDF:", err);
      // Fallback visual de erro absoluto caso o alert seja bloqueado
      const errDiv = document.createElement('div');
      errDiv.style.position = 'fixed';
      errDiv.style.top = '0';
      errDiv.style.left = '0';
      errDiv.style.width = '100vw';
      errDiv.style.height = '100vh';
      errDiv.style.backgroundColor = '#990000';
      errDiv.style.zIndex = '9999999';
      errDiv.style.color = 'white';
      errDiv.style.padding = '50px';
      errDiv.style.overflow = 'auto';
      errDiv.innerHTML = `
        <h1 style="font-size:30px">FALHA GRAVE NO PDF</h1>
        <p>A biblioteca do PDF falhou ao processar a requisição.</p>
        <pre style="background:#000; padding:20px; font-size:14px; margin-top:20px; text-wrap:wrap;">` + err.message + `\n\n` + err.stack + `</pre>
        <button style="margin-top:20px; padding:10px 20px; background:#fff; color:#000; cursor:pointer;" onclick="this.parentElement.remove()">Fechar Diagnóstico</button>
      `;
      document.body.appendChild(errDiv);
    }
  };

  return (
    <div className="min-h-screen p-12 bg-[#030712] relative overflow-hidden">
      <AuraIsland status="saudavel" message="CENTRAL DE RELATÓRIOS" />
      
      <div className="max-w-6xl mx-auto mt-20 relative z-10">
        <header className="mb-12">
          <h1 className="text-4xl font-black text-white font-orbitron tracking-tight mb-2">RELATÓRIOS</h1>
          <p className="text-slate-500 font-medium italic">Histórico completo de auditorias realizadas pelo Sentinel.</p>
        </header>

        <div className="grid grid-cols-1 gap-4">
          {audits.length === 0 ? (
            <div className="glass-panel p-20 text-center">
              <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Nenhum relatório gerado ainda.</p>
            </div>
          ) : (
            audits.slice().reverse().map((audit, idx) => (
              <div key={idx} className="glass-panel p-6 flex items-center justify-between hover:border-blue-500/30 transition-all group">
                <div className="flex items-center gap-6">
                   <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 font-black">
                      #{audits.length - idx}
                   </div>
                   <div>
                     <h3 className="text-white font-black text-lg">{audit.id || 'Data desconhecida'}</h3>
                     <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">
                       {audit.leads?.length || 0} Leads Analisados • {audit.leads?.filter((l:any) => l.classificacao === 'Crítico')?.length || 0} Críticos
                     </p>
                   </div>
                </div>

                <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={() => handleDownloadPDF(audit)}
                    className="flex items-center gap-2 px-6 py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-tighter hover:bg-emerald-600/40">
                    Documento PDF
                  </button>

                  <button onClick={() => window.location.href = '/'} className="px-6 py-2 rounded-lg bg-blue-600 text-white text-xs font-black uppercase tracking-tighter hover:bg-blue-500">Voltar</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
