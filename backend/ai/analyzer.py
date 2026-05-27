import sys
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
import os
import json
import asyncio
import time
import re
from openai import AsyncOpenAI
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# ═══════════════════════════════════════════════════════════════════
# SENTINELA IA - Motor de Inteligência (Groq FREE + Gemini FREE)
# ═══════════════════════════════════════════════════════════════════
# Estratégia 100% GRATUITA:
#   PRIMÁRIO  -> Groq (14.400 req/dia grátis, sem cartão)
#   FALLBACK  -> Gemini Free Tier (rotação multi-modelo)
#   ÚLTIMO    -> OpenAI GPT-4o (se chave sk- fornecida, pago)
# ═══════════════════════════════════════════════════════════════════

_groq_client = None
_openai_client = None

# Controle de rate-limit Gemini
_model_cooldowns = {}
_model_daily_exhausted = set()

# Controle de rate-limit Groq
_groq_model_cooldowns = {}

BACKEND_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(BACKEND_DIR, "data")
CONFIG_FILE = os.path.join(DATA_DIR, "config.json")


def _load_config():
    """Lê config.json direto para capturar chaves."""
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {}


def get_all_keys():
    """
    Retorna dicionário com todas as chaves disponíveis.
    Detecta tipo pelo prefixo:
      gsk_  -> Groq (GRÁTIS)
      AIza  -> Gemini (GRÁTIS)
      sk-   -> OpenAI (pago)
      pplx- -> Perplexity (pago)
    """
    config = _load_config()
    keys = {}
    
    # Chave principal do config
    main_key = config.get("openai_key", "")
    groq_key = config.get("groq_key", "") or os.getenv("GROQ_API_KEY", "")
    gemini_key = config.get("gemini_key", "")
    env_key = os.getenv("OPENAI_API_KEY", "")
    
    # Classifica a chave principal pelo prefixo
    if main_key:
        if main_key.startswith("gsk_"):
            keys["groq"] = main_key
        elif main_key.startswith("sk-"):
            keys["openai"] = main_key
        elif "gemini" in config or main_key.startswith("AIza") or main_key.startswith("AQ."):
            keys["gemini"] = main_key
        elif main_key.startswith("pplx-"):
            keys["perplexity"] = main_key
    
    # Chaves dedicadas (override)
    if groq_key and groq_key.startswith("gsk_"):
        keys["groq"] = groq_key
    if gemini_key:
        keys["gemini"] = gemini_key
    
    # Fallback: .env
    if env_key:
        if env_key.startswith("gsk_") and "groq" not in keys:
            keys["groq"] = env_key
        elif env_key.startswith("AIza") and "gemini" not in keys:
            keys["gemini"] = env_key
        elif env_key.startswith("sk-") and "openai" not in keys:
            keys["openai"] = env_key
    
    return keys


SYSTEM_PROMPT = """
Você é o Sentinela IA, analista de inteligência comercial Sênior, Auditor Operacional e Estrategista Imobiliário da Moura Leite Loteamentos. Seu papel é fazer uma dupla análise: 1) Avaliar o nível de interesse financeiro/timing do lead e 2) Auditar com máxima severidade a qualidade do atendimento prestado pela GlorIA (IA) ou pelo SDR.

### BASE DE CONHECIMENTO DE OPERAÇÕES - MOURA LEITE LOTEAMENTOS ###
- Cidades de Atuação: Araçariguama, Avaré, Bernardino de Campos, Boituva, Botucatu, Cerqueira César, Fartura, Itatinga, Piraju, Taguaí, Tatuí (todas no estado de São Paulo).
- Empreendimentos Conhecidos:
  * Avaré (SP): Central Parque Avaré (Loteamento aberto), Reserva Central Parque Avaré (Loteamento fechado).
  * Boituva (SP): Reserva dos Ipês (Loteamento fechado).
  * Outros empreendimentos podem ser mencionados pelas cidades citadas acima. Identifique e classifique-os com precisão baseado no contexto geográfico da conversa.

### 1) TEMPERATURA COMERCIAL: SCORE DE ENGAJAMENTO (0 a 100) ###
O score NÃO é uma estimativa subjetiva. É uma SOMA de critérios objetivos abaixo. Leia TODA a conversa e preencha cada critério com base no que REALMENTE ocorreu no histórico.

#### BLOCO A — Intenção e Qualificação (máx. 45 pts)
- [A1] Lead perguntou sobre valor de entrada, parcelas ou condições de pagamento → +15 pts
- [A2] Lead mencionou sua renda, capacidade financeira ou perfil de compra → +10 pts
- [A3] Lead pediu para agendar visita, mostrou interesse em ir ao local ou agendou → +15 pts
- [A4] Lead comparou com outro empreendimento ou concorrente (sinal de pesquisa ativa) → +5 pts

#### BLOCO B — Engajamento e Velocidade (máx. 30 pts)
- [B1] Lead respondeu dentro de 1 hora em pelo menos uma mensagem → +10 pts
- [B2] Lead enviou 3 ou mais mensagens ao longo da conversa → +10 pts
- [B3] Lead respondeu a uma pergunta de qualificação do SDR (renda, cidade desejada, perfil, prazo) → +10 pts

#### BLOCO C — Sinais Negativos / Penalizações (máx. -45 pts)
- [C1] Lead está em vácuo/ghosting: a última mensagem é do SDR e o lead NÃO respondeu → -15 pts
- [C2] Lead explicitamente disse que não tem interesse, não é o momento, ou encerrou o assunto → -20 pts
- [C3] Conversa é exclusivamente sobre suporte (2ª via de boleto, assunto jurídico/SAC) — sem oportunidade de venda ativa → -10 pts
- [C4] Lead levantou objeção forte de preço ("muito caro", "não tenho essa entrada") sem demonstrar abertura → -10 pts
- [C5] Lead demorou mais de 48h para responder na maioria das interações → -5 pts

#### BLOCO D — Bônus de Urgência e Intenção Avançada (máx. 25 pts)
- [D1] Lead mencionou prazo concreto de compra (quer fechar em X meses, mudança próxima, casamento, filho, etc.) → +15 pts
- [D2] Lead perguntou sobre processo de compra, documentação necessária ou financiamento → +10 pts

#### REGRA DE CÁLCULO:
1. Some os pontos dos critérios que SE APLICAM ao histórico real (não invente sinais que não existem).
2. O score mínimo é 0, máximo é 100. Aplique: score = max(0, min(100, soma_total)).
3. Se for SAC puro (C3 aplicado), o score máximo possível é 30 — independente de outros fatores.
4. Preencha o campo `scorecard` com true/false para cada critério e a pontuação aplicada.

🔥 80 a 100 (Quente): Intenção real, timing ativo, se qualifica.
🔸 50 a 79 (Morno): Interesse existente mas sem urgência ou qualificação completa.
❄️ 0 a 49 (Frio): Desengajado, vácuo, ou não há oportunidade de venda real.

### 2) AUDITORIA DE ATENDIMENTO: CLASSIFICAÇÃO PARA O DASHBOARD (KANBAN) ###
A "classificacao" é uma auditoria puramente OPERACIONAL da conversa. Ela diz se a MÁQUINA ou o HUMANO estão fazendo besteira, INDEPENDENTEMENTE se o LEAD é Quente ou Frio!
Se a IA ou o SDR fizeram tudo certo, o status é SAUDÁVEL, mesmo que o lead tenha nota 0 ou seja apenas um contato de suporte.

🔴 CRÍTICO (Problema Urgente no fluxo operacional):
- A IA respondeu coisas sem o menor sentido em relação à pergunta do cliente (Alucinação).
- A IA forneceu valores/metros/dados absurdos ou falsos.
- A IA enviou várias mensagens repetidas (Spam) porque o lead não respondeu, virando algo incômodo.
- O lead fez uma pergunta crucial, objeção, ou pediu contato humano, e foi simplesmente ignorado pela IA/SDR.

🟡 ATENÇÃO (Falha tática ou Gargalo operacional):
- A negociação ficou sem continuidade pelo lado do SDR (ex: lead respondeu e o SDR/IA esqueceu de responder).
- O SDR foi mecânico/institucional demais, não gerou reciprocidade (Deu a tabela sem pedir a renda) e a conversa esfriou por culpa dele.
- Oportunidade ou pretexto deixado na mesa sem contra-ataque.
- VÁCUO NO PRIMEIRO CONTATO: Se o SDR enviou a primeira mensagem de abordagem (ex: "Olá, vi seu interesse...") e o lead não respondeu nada (ghosting inicial), classifique obrigatoriamente como ATENÇÃO. O objetivo aqui é gerar um Plano de Ação e uma "mensagem_sugerida" altamente atrativa (um gancho ou pergunta aberta) para pescar a atenção do lead.

🟢 SAUDÁVEL (Atendimento e fluxo excelentes):
- Não houve nenhum problema/gafe tática. A conversa fluiu de forma coerente e as perguntas foram bem respondidas pela máquina.
- Follow-up assertivo e no fluxo normal.
- O robô não alucinou, respondeu precisamente, o roteiro está dentro do padrão de um bom SDR ou suporte.
- REGRA DE OURO 1: Se a conversa já estava acontecendo bem e o lead sumiu do nada NO MEIO DA NEGOCIAÇÃO, o status é SAUDÁVEL (a máquina fez a parte dela). Mas se for VÁCUO NO PRIMEIRO CONTATO, jogue para ATENÇÃO conforme regra acima.
- REGRA DE OURO 2: CONFIE NOS PROCESSOS INTERNOS. Se o SDR/IA fornecer um e-mail, telefone ou departamento (ex: mandar assunto jurídico para o financeiro), ASSUMA QUE ESTÁ CORRETO para a Moura Leite. Não marque como erro ou alucinação só porque parece incomum.
- REGRA DE OURO 3: Se for um assunto administrativo (ofício, boleto, suporte) e o SDR responder a dúvida corretamente, o status é SAUDÁVEL.

### 3) DIRETRIZES DE ASSERTIVIDADE (DIAGNÓSTICO E REATIVAÇÃO DE GHOSTING) ###
Para garantir diagnósticos cirúrgicos e planos de ação altamente eficientes, siga estas diretrizes:
- **Diagnóstico Preciso (Sem "Achismos"):** Identifique com clareza o ponto exato da conversa onde ela esfriou (ex: "O lead parou de responder logo após receber o valor de entrada", "O SDR enviou a tabela e não fez nenhuma pergunta de acompanhamento"). Indique o motivo real do gargalo nos campos `problema_detectado`, `porque` e `avaliacao_sdr`.
- **REGRA CRÍTICA DE NÃO-ALUCINAÇÃO FINANCEIRA:** Nunca invente nenhuma facilidade financeira, facilidade de entrada, desconto, promoção, parcelamento especial ou qualquer oferta que não esteja explicitamente expressa no histórico ou confirmada nas informações reais da conversa. É terminantemente proibido criar vantagens ou condições falsas para pescar o cliente.
- **Foco Absoluto em Resolução e Reativação Realista (Sair do Vácuo/Ghosting):** Se o cliente não respondeu (vácuo/ghosting), sua missão primária em `acao_sugerida` e `mensagem_sugerida` é criar uma mensagem assertiva focada em reativar o contato ou obter um posicionamento claro do cliente (seja positivo ou negativo). A `mensagem_sugerida` deve ser curta, natural, em 1ª pessoa ("eu") e aplicar um destes ganchos honestos de engajamento:
  * **A) Gatilho da Perda/Fechamento (Ultimato de Interesse):** Focar em saber se pode encerrar o atendimento para liberar o lote do estoque. Exemplo: *"Oi [Nome], tudo bem? Como você não me retornou, imaginei que os planos mudaram e você não tem mais interesse no loteamento de [Cidade]. Posso liberar a vaga para o próximo cliente interessado ou ainda quer dar uma olhada?"*
  * **B) Alinhamento Direto / Pergunta Empática (Entender a Objeção Real):** Facilitar a resposta rápida com opções honestas baseadas apenas nas dúvidas que ele já expressou. Exemplo: *"Oi [Nome], tudo bem? Para eu não ser inconveniente: você ficou com alguma dúvida sobre o loteamento ou prefere que a gente fale em outro momento?"*
  * **C) Micro-compromisso de Resposta Rápida (Pergunta Direta):** Uma pergunta curta e de baixíssimo atrito para validar se o interesse continua ativo. Exemplo: *"Oi [Nome], tudo bem? Você ainda tem interesse em ver um lote na região de [Cidade]?"*

### 4) REGRA ABSOLUTA DE ANTI-REDUNDÂNCIA (NUNCA SUGIRA O QUE JÁ FOI FEITO) ###
Esta é uma das regras mais importantes da sua análise. ANTES de preencher os campos `acao_sugerida` e `mensagem_sugerida`, você DEVE obrigatoriamente:
1. **Reler toda a conversa do início ao fim** e identificar TODAS as ações que a SDR/IA já executou: perguntas feitas, informações fornecidas, compromissos assumidos, promessas feitas, objeções já tratadas, ofertas já comunicadas.
2. **Listar essas ações no campo `acoes_ja_realizadas`** — este campo funciona como um checklist obrigatório antes de gerar a sugestão.
3. **Verificar se a ação que você pretende sugerir já foi realizada com sucesso pela SDR.** Se a SDR já perguntou sobre interesse, já ofereceu cadastro para notificação, já enviou tabela, já agendou visita, etc., NÃO repita essa sugestão.
4. **Se a ação já foi feita → Sugira EXCLUSIVAMENTE o PRÓXIMO PASSO LÓGICO na jornada do lead.** Exemplos concretos:
   - SDR já ofereceu registrar interesse do lead para ser notificado sobre lotes em uma cidade → Sugestão: "Registrar formalmente o interesse no CRM e programar alerta de follow-up quando houver lançamento na cidade solicitada."
   - SDR já enviou tabela de preços → Sugestão: "Fazer follow-up perguntando se o lead teve tempo de analisar os valores e se ficou com alguma dúvida."
   - SDR já agendou visita → Sugestão: "Confirmar presença na visita 24h antes do horário agendado."
   - SDR já tratou a objeção do lead com sucesso e o lead confirmou → Sugestão: "Nenhuma ação pendente. A SDR tratou corretamente a situação. Aguardar retorno do lead ou próximo lançamento na região."
5. **NUNCA gere uma `mensagem_sugerida` que repita o conteúdo ou a intenção de uma mensagem que a SDR já enviou.** Se a SDR já disse "posso registrar seu interesse para ser avisada quando surgir oportunidade em Piraju", NÃO sugira uma mensagem perguntando a mesma coisa.
6. **O foco é SEMPRE no que FALTA fazer, nunca no que já foi feito.** A `acao_sugerida` deve ser exclusivamente sobre AÇÕES PENDENTES ou PRÓXIMOS PASSOS ainda não executados.

Sua saída OBRIGATÓRIA deve ser ESTRITAMENTE um JSON válido:
{
    "empreendimento_detectado": "Empreendimento citado (ex: Residencial XYZ), ou 'Não mencionado'",
    "cidade_detectada": "Cidade citada (ex: Avaré), ou 'Não mencionada'",
    "categoria_lead": "Venda" | "SAC/Financeiro" | "Pós-Venda" | "Jurídico" | "Outros",
    "estagio_funil": "Descoberta" | "Qualificação" | "Apresentação" | "Negociação" | "Visita Agendada" | "SAC/Outros",
    "status_resposta": "Aguardando Retorno" | "Respondido",
    "classificacao": "Crítico" | "Atenção" | "Saudável",
    "scorecard": {
        "A1_perguntou_valor": true/false,
        "A2_mencionou_renda": true/false,
        "A3_pediu_visita": true/false,
        "A4_comparou_concorrente": true/false,
        "B1_respondeu_rapido": true/false,
        "B2_volume_msgs_3plus": true/false,
        "B3_respondeu_qualificacao": true/false,
        "C1_em_vacuo_ghosting": true/false,
        "C2_descartou_interesse": true/false,
        "C3_sac_puro": true/false,
        "C4_objecao_preco_forte": true/false,
        "C5_demorou_responder": true/false,
        "D1_mencionou_prazo": true/false,
        "D2_perguntou_processo_compra": true/false,
        "pontuacao_detalhada": "Ex: A1(+15) A3(+15) B1(+10) B2(+10) C1(-15) = 35"
    },
    "score_engajamento": (Inteiro 0-100 calculado pela rubrica acima — NÃO é estimativa subjetiva),
    "problema_detectado": "Diagnóstico cirúrgico e exato do gargalo/falha da conversa. Se tudo estiver ótimo e no fluxo, diga ESTRITAMENTE: 'Fluxo operacional excelente, zero alucinações. O lead... (breve relato)'",
    "mensagem_prova": "Recorte em aspas direto da conversa que prove a alucinação/falha do bot, ou evidencie o momento da conversa. NÃO INVENTE MENSAGENS.",
    "acoes_ja_realizadas": "CAMPO OBRIGATÓRIO DE CHECKLIST: Liste TODAS as ações que a SDR/IA já executou nesta conversa ANTES de sugerir a próxima (ex: 'Ofereceu registrar interesse em Piraju para notificação futura', 'Enviou tabela de preços do Central Parque', 'Perguntou sobre renda', etc.). Este campo é a PROVA de que você leu a conversa antes de gerar o plano de ação. Se não houver ações relevantes, escreva 'Nenhuma ação significativa identificada'.",
    "acao_sugerida": "O PRÓXIMO PASSO que ainda NÃO foi feito. NUNCA repita aqui uma ação que já aparece em 'acoes_ja_realizadas'. Se a SDR já tratou tudo corretamente e não há pendência, diga 'Nenhuma ação pendente — a SDR tratou corretamente a situação.' Se há vácuo/ghosting REAL (sem resposta), aplique os gatilhos de reativação da Seção 3.",
    "mensagem_sugerida": "MENSAGEM EXATA PARA O SDR COPIAR E ENVIAR, que NÃO repita o que já foi dito pela SDR na conversa. Deve ser o próximo passo lógico. Deixe vazio se: (a) a SDR já fez tudo correto e basta aguardar, (b) for SAC/suporte já resolvido, ou (c) o lead já estiver respondendo normalmente no fluxo.",
    "porque": "Explicação lógica e analítica do diagnóstico (o porquê das falhas da IA ou do comportamento do lead).",
    "avaliacao_sdr": "Diagnóstico cirúrgico (Ex: 'Lead em vácuo pós-envio de tabela', 'Atendimento excelente no SAC', ou 'Robô alucinou preço')",
    "ultima_mensagem_lead": "A última mensagem que o prospect enviou.",
    "risco_detectado": true (se for Crítico) ou false,
    "tempo_medio_resposta": "Conforme evidências da interação"
}

CONTRADIÇÃO FATAL #1 A EVITAR: Nunca coloque "classificacao": "Atenção" ou "Crítico" se você escrever no "problema_detectado" que o fluxo está "excelente", "zero alucinações" ou se o SDR apenas respondeu uma dúvida de suporte corretamente. Desvincule totalmente a intenção/temperatura do cliente da qualidade da resposta da máquina!

CONTRADIÇÃO FATAL #2 A EVITAR: Nunca preencha "acao_sugerida" ou "mensagem_sugerida" com uma ação/mensagem que já está contemplada em alguma mensagem da SDR listada no histórico. Se a SDR já perguntou sobre interesse em uma cidade, já ofereceu notificação, já enviou tabela, ou já tratou uma objeção com sucesso — a sua sugestão DEVE SER o próximo passo, NUNCA a repetição do que já foi feito. Isso demonstra que a auditoria NÃO leu a conversa com atenção e gera retrabalho para o time comercial.

CONTRADIÇÃO FATAL #3 A EVITAR (NOVA): O campo `score_engajamento` DEVE ser exatamente a soma dos pontos do `scorecard`. Se o scorecard mostra 35 pontos, o score_engajamento é 35. Jamais coloque um número diferente do que a soma real dos critérios aplicados. O campo `pontuacao_detalhada` deve mostrar a conta passo a passo.
"""


def _parse_retry_delay(error_msg: str) -> int:
    """Extrai delay de retry da mensagem de erro 429."""
    match = re.search(r'retry in (\d+)', error_msg)
    if match:
        return int(match.group(1)) + 5
    match = re.search(r'seconds:\s*(\d+)', error_msg)
    if match:
        return int(match.group(1)) + 5
    match = re.search(r'try again in (\d+)', error_msg, re.IGNORECASE)
    if match:
        return int(match.group(1)) + 5
    return 65


# ═══════════════════════════════════════════════════
# PROVEDOR 1: GROQ (PRIMÁRIO - 100% GRÁTIS)
# 14.400 req/dia com llama-3.1-8b-instant
# 1.000 req/dia com llama-3.3-70b-versatile
# ═══════════════════════════════════════════════════

async def _analyze_groq(api_key: str, prompt_text: str, override_system_prompt: str = None) -> str:
    """
    Analisa via Groq API (OpenAI-compatible). 100% GRÁTIS.
    Rotação de modelos para maximizar cota diária:
      - llama-3.1-8b-instant: 14.400 req/dia (rápido, bom para maioria)
      - llama-3.3-70b-versatile: 1.000 req/dia (mais inteligente, backup)
      - llama-4-scout-17b-16e-instruct: 1.000 req/dia (mais novo)
    """
    global _groq_client, _groq_model_cooldowns
    
    if _groq_client is None or _groq_client.api_key != api_key:
        _groq_client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1"
        )
    
    # Modelos em ordem de prioridade (mais cota primeiro)
    GROQ_MODELS = [
        "llama-3.3-70b-versatile",         # Mais inteligente, 1000/dia
        "llama-3.1-8b-instant",             # Mais cota, 14.400/dia
        "llama-4-scout-17b-16e-instruct",   # Mais novo, 1000/dia
    ]
    
    now = time.time()
    last_error = None
    
    for model_name in GROQ_MODELS:
        # Pula modelos em cooldown
        if model_name in _groq_model_cooldowns:
            if now < _groq_model_cooldowns[model_name]:
                continue
            else:
                del _groq_model_cooldowns[model_name]
        
        try:
            print(f"[GROQ] 🚀 Analisando com {model_name} (GRÁTIS)...")
            
            response = await _groq_client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": override_system_prompt or SYSTEM_PROMPT},
                    {"role": "user", "content": prompt_text}
                ],
                temperature=0.2,
                max_tokens=1500,
                response_format={"type": "json_object"}
            )
            
            result = response.choices[0].message.content
            
            # Limpa markdown se vier formatado
            if result and "```json" in result:
                result = result.split("```json")[1].split("```")[0]
            elif result and "```" in result:
                parts = result.split("```")
                if len(parts) >= 3:
                    result = parts[1]
            
            print(f"[GROQ] [OK] Sucesso com {model_name}")
            return result
            
        except Exception as e:
            last_error = e
            err_msg = str(e)
            
            if "429" in err_msg or "rate_limit" in err_msg.lower():
                delay = _parse_retry_delay(err_msg)
                _groq_model_cooldowns[model_name] = now + delay
                print(f"[GROQ] ⏳ {model_name} rate-limited, cooldown {delay}s. Tentando próximo...")
                continue
            elif "404" in err_msg or "model_not_found" in err_msg.lower():
                print(f"[GROQ] !️ {model_name} não encontrado. Tentando próximo...")
                _groq_model_cooldowns[model_name] = now + 86400  # Pula por 24h
                continue
            else:
                raise e
    
    if last_error:
        raise last_error
    raise Exception("Todos os modelos Groq indisponíveis")


# ═══════════════════════════════════════════════════
# PROVEDOR 2: GEMINI FREE TIER (FALLBACK - GRÁTIS)
# ═══════════════════════════════════════════════════

async def _analyze_gemini(api_key: str, prompt_text: str, override_system_prompt: str = None) -> str:
    """Analisa via Gemini com rotação multi-modelo. GRÁTIS."""
    global _model_cooldowns, _model_daily_exhausted
    
    genai.configure(api_key=api_key)
    
    GEMINI_MODELS = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash-lite',
        'gemini-2.5-pro',
        'gemini-3-flash-preview',
        'gemini-3.1-flash-lite-preview',
    ]
    
    last_error = None
    now = time.time()
    
    for model_name in GEMINI_MODELS:
        if model_name in _model_daily_exhausted:
            continue
        if model_name in _model_cooldowns and now < _model_cooldowns[model_name]:
            continue
        
        for attempt in range(2):
            try:
                model = genai.GenerativeModel(
                    model_name,
                    system_instruction=override_system_prompt or SYSTEM_PROMPT,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.2,
                        response_mime_type="application/json",
                    )
                )
                if attempt == 0:
                    print(f"[GEMINI] Tentando modelo: {model_name}")
                response = await model.generate_content_async(prompt_text)
                result = response.text
                print(f"[GEMINI] [OK] Sucesso com modelo: {model_name}")
                return result
                
            except Exception as e:
                last_error = e
                err_msg = str(e)
                if "429" in err_msg:
                    if "limit: 0" in err_msg or "PerDay" in err_msg:
                        _model_daily_exhausted.add(model_name)
                        print(f"[GEMINI] ❌ {model_name} esgotou cota diária")
                        break
                    else:
                        delay = _parse_retry_delay(err_msg)
                        if delay <= 15 and attempt == 0:
                            print(f"[GEMINI] ⏳ Rate limit curto ({delay}s). Aguardando e retentando...")
                            await asyncio.sleep(delay + 1)
                            continue
                        _model_cooldowns[model_name] = now + delay
                        print(f"[GEMINI] ⏳ {model_name} cooldown {delay}s")
                elif "404" in err_msg:
                    _model_daily_exhausted.add(model_name)
                    print(f"[GEMINI] !️ {model_name} indisponível (404)")
                else:
                    raise e
                break
        
        # Se chegou aqui é porque o break foi acionado (falhou todas tentativas)
        continue
    
    if last_error:
        raise last_error
    raise Exception("Todos os modelos Gemini indisponíveis")


# ═══════════════════════════════════════════════════
# PROVEDOR 3: OPENAI (PAGO - ÚLTIMO RECURSO)
# ═══════════════════════════════════════════════════

async def _analyze_openai(api_key: str, prompt_text: str, override_system_prompt: str = None) -> str:
    """Analisa via OpenAI GPT-4o. PAGO."""
    global _openai_client
    
    if _openai_client is None or _openai_client.api_key != api_key:
        _openai_client = AsyncOpenAI(api_key=api_key)
    
    print("[OPENAI] Analisando com gpt-4o...")
    response = await _openai_client.chat.completions.create(
        model="gpt-4o",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": override_system_prompt or SYSTEM_PROMPT},
            {"role": "user", "content": prompt_text}
        ],
        temperature=0.2,
        max_tokens=1500
    )
    result = response.choices[0].message.content
    print("[OPENAI] [OK] Análise concluída")
    return result


# ═══════════════════════════════════════════════════
# MOTOR PRINCIPAL - CASCATA INTELIGENTE 100% GRÁTIS
# ═══════════════════════════════════════════════════

async def analyze_lead_conversation(data: dict, override_system_prompt: str = None) -> dict:
    """
    Motor de análise com cascata inteligente 100% GRÁTIS:
    1. Groq (gsk_ key) -> 14.400+ req/dia GRÁTIS
    2. Gemini Free (AIza key) -> Rotação multi-modelo GRÁTIS
    3. OpenAI (sk- key) -> Pago (só se configurado)
    """
    history = data.get("history", [])
    if not history:
        return {
            "classificacao": "Atenção",
            "score_engajamento": 0,
            "problema_detectado": "Conversa Vazia",
            "acao_sugerida": "Aguardar interação ou enviar mensagem de boas-vindas.",
            "mensagem_sugerida": "Olá, tudo bem? Como posso ajudar?",
            "porque": "Não há dados para analisar.",
            "avaliacao_sdr": "N/A",
            "ultima_mensagem_lead": "",
            "risco_detectado": False
        }
    
    # Monta o prompt
    sdr = data.get('sdr', 'Equipe')
    origem = data.get('origem', '')
    email = data.get('email', '')
    telefone = data.get('telefone', '')
    etapa = data.get('etapa', '')
    produtos = data.get('produtos', [])
    nome = data.get('nome', '')

    prompt_text = "DADOS DO CLIENTE:\n"
    if nome: prompt_text += f"- Nome: {nome}\n"
    if telefone: prompt_text += f"- Telefone: {telefone}\n"
    if email: prompt_text += f"- E-mail: {email}\n"
    if origem: prompt_text += f"- Origem: {origem}\n"
    if etapa: prompt_text += f"- Etapa Atual no Funil: {etapa}\n"
    if produtos: prompt_text += f"- Produtos de Interesse: {', '.join(produtos)}\n"
    prompt_text += f"- SDR Responsável: {sdr}\n\n"

    prompt_text += "Histórico Rigoroso da Conversa:\n"
    for msg in history:
        sender = msg.get("from", "Desconhecido")
        text = msg.get("text", "")
        label = "SDR (Atendente Moura Leite)" if sender == "SDR" else "Lead (Interessado/Cliente)"
        prompt_text += f"> [{label}]: {text}\n"
    prompt_text += "\nFaça a análise profunda obedecendo às Regras Absolutas. Retorne ESTRITAMENTE E APENAS O JSON VÁLIDO."

    keys = get_all_keys()
    
    if not keys:
        return {
            "classificacao": "Atenção",
            "score_engajamento": 0,
            "problema_detectado": "Configuração Pendente",
            "acao_sugerida": "Vá em Configurações e insira sua Groq API Key (grátis em console.groq.com) ou Google Gemini API Key.",
            "mensagem_sugerida": "",
            "porque": "Nenhuma chave de IA configurada.",
            "avaliacao_sdr": "N/A",
            "ultima_mensagem_lead": "",
            "risco_detectado": False
        }

    # ═══ CASCATA DE PROVEDORES (100% GRÁTIS) ═══
    # Ordem: Groq (grátis, alta cota) -> Gemini (grátis, backup) -> OpenAI (pago, último)
    providers = []
    if "groq" in keys:
        providers.append(("groq", keys["groq"]))
    if "gemini" in keys:
        providers.append(("gemini", keys["gemini"]))
    if "openai" in keys:
        providers.append(("openai", keys["openai"]))
    if "perplexity" in keys:
        providers.append(("perplexity", keys["perplexity"]))
    
    last_error = None
    
    for provider_name, api_key in providers:
        try:
            if provider_name == "groq":
                result_json_str = await _analyze_groq(api_key, prompt_text, override_system_prompt)
            elif provider_name == "gemini":
                result_json_str = await _analyze_gemini(api_key, prompt_text, override_system_prompt)
            elif provider_name == "openai":
                result_json_str = await _analyze_openai(api_key, prompt_text, override_system_prompt)
            else:
                continue
            
            # Parse JSON
            result_dict = json.loads(result_json_str)
            result_dict["_provider"] = provider_name
            return result_dict
            
        except Exception as e:
            last_error = e
            err_str = str(e)
            print(f"[CASCADE] !️ {provider_name} falhou: {err_str[:150]}")
            
            next_providers = [p[0] for p in providers if p[0] != provider_name]
            if next_providers:
                print(f"[CASCADE] ↓ Descendo para {next_providers[0]} fallback...")
            continue
    
    # Todos os provedores falharam
    err_str = str(last_error) if last_error else "Erro desconhecido"
    print(f"[CASCADE] ❌ TODOS os provedores falharam")
    
    return {
        "classificacao": "Atenção",
        "score_engajamento": 0,
        "problema_detectado": "Cota de IA Esgotada",
        "acao_sugerida": "Configure sua Groq API Key (gsk_...) nas Configurações. É 100% grátis em console.groq.com.",
        "mensagem_sugerida": "",
        "porque": f"Nenhum provedor de IA disponível. Erro: {err_str[:200]}",
        "avaliacao_sdr": "Erro",
        "ultima_mensagem_lead": "",
        "risco_detectado": False,
        "_needs_retry": True
    }
