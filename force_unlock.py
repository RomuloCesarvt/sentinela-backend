import sys
import os

# Add backend to path so we can import firebase_db
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.firebase_db import update_system_lock

print("Forçando desbloqueio do Firebase...")
update_system_lock(False, locked_by=None, error=None)
print("Desbloqueio concluído!")
