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

### 1) TEMPERATURA COMERCIAL: SCORE DE ENGAJAMENTO (0 a 100) ###
O Score de Engajamento avalia APENAS o nível de qualificação, interesse e comportamento DO LEAD:
🔥 80 a 100 (Quente): Interage de forma rápida e engajada, focado em fechar. Pergunta sobre valores de entrada, planejamento, localização ou quer agendar visita. Passa dados de renda se pedido.
🔥 50 a 79 (Morno): Responde, mas enrola. Exige "tabela de preços" e "fotos", mas é evasivo quando o SDR pede informações em troca. Curioso ou comparador.
❄️ 0 a 49 (Frio): Vácuo total na conversa, ghosting, ou já descartou o interesse. O esforço do SDR não dá em nada.
⚠️ ATENÇÃO (Assuntos Administrativos/Suporte): Se o lead está procurando suporte, 2ª via de boleto, envio de ofícios judiciais, ou assuntos de SAC, a temperatura de venda é Fria (Score baixo), mas isso NÃO significa que o atendimento foi ruim.
>> ISTO SERÁ SALVO NA CHAVE: "score_engajamento" (Número inteiro).

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

Sua saída OBRIGATÓRIA deve ser ESTRITAMENTE um JSON válido:
{
    "empreendimento_detectado": "Empreendimento citado (ex: Residencial XYZ), ou 'Não mencionado'",
    "classificacao": "Crítico" | "Atenção" | "Saudável",
    "score_engajamento": (Inteiro de 0 a 100 baseado pura e exclusivamente na Temperatura Comercial do lead),
    "problema_detectado": "A gafe da IA, ou o pior gargalo da conversa. Se tudo estiver ótimo, diga ESTRITAMENTE: 'Fluxo operacional excelente, zero alucinações. O lead... (breve relato do status)'",
    "mensagem_prova": "Recorte em aspas direto da conversa que prove a alucinação/falha do bot, ou evidencie o momento da conversa. NÃO INVENTE MENSAGENS.",
    "acao_sugerida": "AÇÃO RECOMENDADA AO SDr/IA. Diga 'Nenhuma' se estiver Saudável e fluindo bem.",
    "mensagem_sugerida": "OBRIGATÓRIO TER UM TEXTO PRONTO PARA USO. Você DEVE escrever a mensagem EXATA que o SDR vai copiar e colar pro cliente para reaquecer/fechar (Em 1ª pessoa do singular). Se for apenas SAC/Suporte resolvido, deixe vazio.",
    "porque": "Qual foi a grande falha técnica da IA? Justifique. Se não houver, exalte o acerto.",
    "avaliacao_sdr": "Diagnóstico cirúrgico (Ex: 'Robô alucinou preço', 'SAC resolvido com sucesso', ou 'Atendimento excelente')",
    "ultima_mensagem_lead": "A última mensagem que o prospect enviou.",
    "risco_detectado": true (se for Crítico) ou false,
    "tempo_medio_resposta": "Conforme evidências da interação"
}

CONTRADIÇÃO FATAL A EVITAR: Nunca coloque "classificacao": "Atenção" ou "Crítico" se você escrever no "problema_detectado" que o fluxo está "excelente", "zero alucinações" ou se o SDR apenas respondeu uma dúvida de suporte corretamente. Desvincule totalmente a intenção/temperatura do cliente da qualidade da resposta da máquina!
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
        
        try:
            model = genai.GenerativeModel(
                model_name,
                system_instruction=override_system_prompt or SYSTEM_PROMPT,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.2,
                    response_mime_type="application/json",
                )
            )
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
                else:
                    delay = _parse_retry_delay(err_msg)
                    _model_cooldowns[model_name] = now + delay
                    print(f"[GEMINI] ⏳ {model_name} cooldown {delay}s")
            elif "404" in err_msg:
                _model_daily_exhausted.add(model_name)
                print(f"[GEMINI] !️ {model_name} indisponível (404)")
            else:
                raise e
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
    prompt_text = f"SDR Responsável: {data.get('sdr', 'Equipe')}\n\nHistórico Rigoroso da Conversa:\n"
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
