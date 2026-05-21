"""
Inicialização de usuários padrão para Sentinela
Se users.json não existir, cria com usuários padrão
"""
import os
import json
from pathlib import Path

BACKEND_DIR = Path(__file__).parent
DATA_DIR = BACKEND_DIR / "data"
USERS_FILE = DATA_DIR / "users.json"

def initialize_users():
    """
    Cria users.json com usuários padrão se não existir.
    Se já existir, apenas retorna os dados.
    """
    
    DATA_DIR.mkdir(exist_ok=True)
    
    # Se já existe, não sobrescreve
    if USERS_FILE.exists():
        print("[INIT] users.json já existe, mantendo dados")
        return
    
    # Usuários padrão
    default_users = {
        "users": [
            {
                "username": "romulo",
                "password": "18011995",
                "name": "Rômulo Moura Leite",
                "role": "admin"
            },
            {
                "username": "mari",
                "password": "MARI1234",
                "name": "Mariane",
                "role": "sdr"
            }
        ]
    }
    
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(default_users, f, indent=2, ensure_ascii=False)
    
    print("[INIT] users.json criado com usuários padrão")

if __name__ == "__main__":
    initialize_users()
