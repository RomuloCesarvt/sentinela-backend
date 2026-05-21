import os
import firebase_admin
from firebase_admin import credentials, firestore
import threading

_db = None
_lock = threading.Lock()

def get_db():
    global _db
    if _db is not None:
        return _db
        
    with _lock:
        if _db is not None:
            return _db
            
        key_path = os.path.join(os.path.dirname(__file__), "firebase-key.json")
        if not os.path.exists(key_path):
            print(f"[FIREBASE] Arquivo {key_path} não encontrado! Sincronização em nuvem desativada.")
            return None
            
        try:
            cred = credentials.Certificate(key_path)
            # Verifica se já foi inicializado
            if not firebase_admin._apps:
                firebase_admin.initialize_app(cred)
            _db = firestore.client()
            print("[FIREBASE] Conectado com sucesso ao Firestore!")
            return _db
        except Exception as e:
            print(f"[FIREBASE] Erro ao conectar: {e}")
            return None

def sync_leads_to_firebase(leads_list):
    """Sincroniza uma lista de leads pro Firebase (assíncrono/background)"""
    db = get_db()
    if not db: return
    
    def _sync():
        try:
            batch = db.batch()
            count = 0
            for lead in leads_list:
                lead_name = lead.get('nome', '')
                if not lead_name: continue
                # Cria um ID seguro para o documento
                doc_id = lead_name.lower().strip().replace(' ', '_').replace('/', '_')
                # Apenas pra segurança
                if len(doc_id) > 100: doc_id = doc_id[:100]
                
                doc_ref = db.collection('leads').document(doc_id)
                batch.set(doc_ref, lead, merge=True)
                count += 1
                
                # Commit a cada 400 operações pra não estourar o limite do batch
                if count >= 400:
                    batch.commit()
                    batch = db.batch()
                    count = 0
            
            if count > 0:
                batch.commit()
            print(f"[FIREBASE] {len(leads_list)} leads sincronizados na nuvem!")
        except Exception as e:
            print(f"[FIREBASE] Erro no sync: {e}")
            
    threading.Thread(target=_sync, daemon=True).start()

def update_system_lock(is_locked, locked_by=None, error=None):
    """Atualiza o status de lock global no Firebase"""
    db = get_db()
    if not db: return
    try:
        doc_ref = db.collection('system').document('lock')
        doc_ref.set({
            'is_locked': is_locked,
            'locked_by': locked_by,
            'error': error,
            'timestamp': firestore.SERVER_TIMESTAMP
        }, merge=True)
    except Exception as e:
        print(f"[FIREBASE] Erro lock: {e}")
