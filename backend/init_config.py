"""
Inicialização segura de variáveis de ambiente para Sentinela
Carrega .env e cria config.json com valores seguros
"""
import os
import json
from pathlib import Path
from dotenv import load_dotenv

# Carrega .env
load_dotenv()

BACKEND_DIR = Path(__file__).parent
DATA_DIR = BACKEND_DIR / "data"
CONFIG_FILE = DATA_DIR / "config.json"

# Cria diretório data se não existir
DATA_DIR.mkdir(exist_ok=True)

def initialize_config():
    """
    Cria/atualiza config.json com variáveis de ambiente.
    Prioriza: Env Vars > config.json existente > defaults
    """
    
    # Lê config existente se houver
    existing_config = {}
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                existing_config = json.load(f)
        except:
            pass
    
    # Defaults base (menor prioridade)
    defaults = {
        "morada_login": "",
        "morada_pass": "",
        "openai_key": "",
        "groq_key": "",
        "gemini_key": "",
        "email_sender": "",
        "email_recipient": "",
        "dashboard_url": "https://frontend-eight-ruddy-53.vercel.app/",
        "periodo_analise": "24h",
        "schedule": {
            "enabled": False,
            "hours": "09:00",
            "frequency": "diario",
            "intervalDays": 1,
            "specificDays": [],
            "period": "24h",
            "notify": "dashboard"
        }
    }

    # Constrói nova config: defaults ← config existente (salvo pelo usuário) ← env vars explícitas
    # IMPORTANTE: Preserva tudo que o usuário salvou, só aplica env vars se definidas explicitamente
    new_config = {**defaults, **existing_config}

    # Aplica env vars somente se estiverem EXPLICITAMENTE definidas (não vazias)
    env_map = {
        "MORADA_LOGIN": "morada_login",
        "MORADA_PASSWORD": "morada_pass",
        "OPENAI_API_KEY": "openai_key",
        "GROQ_API_KEY": "groq_key",
        "GEMINI_API_KEY": "gemini_key",
        "EMAIL_SENDER": "email_sender",
        "EMAIL_RECIPIENT": "email_recipient",
        "PERIODO_ANALISE": "periodo_analise",
    }
    for env_key, cfg_key in env_map.items():
        env_val = os.getenv(env_key)
        if env_val:  # só substitui se a variável de ambiente estiver definida e não vazia
            new_config[cfg_key] = env_val

    # Garante que a chave 'schedule' existe com todos os campos necessários
    if "schedule" not in new_config or not isinstance(new_config.get("schedule"), dict):
        new_config["schedule"] = defaults["schedule"]
    else:
        # Preenche apenas campos faltantes, sem sobrescrever os salvos pelo usuário
        for k, v in defaults["schedule"].items():
            new_config["schedule"].setdefault(k, v)

    # Salva config preservando as escolhas do usuário
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(new_config, f, indent=2, ensure_ascii=False)
    
    print("[INIT] Config.json inicializado com variáveis de ambiente")
    return new_config

if __name__ == "__main__":
    initialize_config()
