# 🚀 Setup Local - Sentinela IA v2

## ⚠️ Mudanças Realizadas

Foram **removidas todas as credenciais** do repositório por segurança:

- ✅ `backend/.env` - Credenciais removidas (use o seu .env local)
- ✅ `backend/firebase-key.json` - Removido (use o seu local)
- ✅ `frontend/.env.vercel*` - Removidos (tokens Vercel)
- ✅ Logs antigos - Removidos
- ✅ PDFs de teste - Removidos
- ✅ Documentação duplicada - Consolidada
- ✅ Scripts batch desatualizados - Removidos

**Seus dados locais estão protegidos no .gitignore** ✅

---

## 📋 Setup em 5 Passos

### **1️⃣ Clonar / Atualizar Repositório**

```bash
cd C:\Users\RomuloMeloMouraLeite\.gemini\antigravity\scratch\sentinela_ia_v2
git pull origin main
```

---

### **2️⃣ Configurar Backend (Python)**

#### **a) Criar variáveis de ambiente**

Copie `.env.example` para `.env`:

```powershell
# Backend
Copy-Item "C:\path\to\.env.example" "C:\path\to\backend\.env"
```

Edite `backend/.env` e adicione suas credenciais reais:

```env
# Obtenha em: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE

# Obtenha em: https://console.groq.com/keys
GROQ_API_KEY=gsk_YOUR_KEY_HERE

# Obtenha em: https://aistudio.google.com/app/apikeys
GEMINI_API_KEY=YOUR_KEY_HERE

# Credenciais Morada
MORADA_LOGIN=seu_email@morada.com.br
MORADA_PASSWORD=sua_senha_aqui

# Email (opcional)
EMAIL_SENDER=seu_email@mouraleite.com.br
EMAIL_RECIPIENT=destinatario@mouraleite.com.br
```

#### **b) Criar Firebase Key**

1. Vá para [Firebase Console](https://console.firebase.google.com/)
2. Selecione projeto `sentinela-ia-1c3c9`
3. Project Settings → Service Accounts
4. Clique "Generate New Private Key"
5. Salve como `backend/firebase-key.json`

```powershell
# Verificar que o arquivo foi criado
Test-Path "C:\path\to\backend\firebase-key.json"
```

#### **c) Instalar dependências Python**

```powershell
# Abrir PowerShell como Administrador
cd backend

# Criar ambiente virtual
python -m venv venv

# Ativar ambiente virtual
.\venv\Scripts\Activate.ps1

# Se der erro de permissão, execute:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Instalar dependências
pip install -r requirements.txt

# Verificar instalação
python -c "import fastapi; print('✅ FastAPI instalado')"
```

#### **d) Testar Backend localmente**

```powershell
# Ainda dentro de backend/
python main.py

# Você deve ver:
# INFO:     Uvicorn running on http://127.0.0.1:8000
```

Se tudo funcionar, abra em seu navegador:
- **Dashboard API:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/api/health

---

### **3️⃣ Configurar Frontend (Next.js)**

#### **a) Instalar dependências Node.js**

```powershell
cd frontend

# Instalar
npm install

# Verificar instalação
npm list next
# Deve mostrar: next@16.2.1
```

#### **b) Testar Frontend localmente**

```powershell
npm run dev

# Você deve ver:
# ▲ Next.js 16.2.1
# > Local:        http://localhost:3000
```

Abra em seu navegador:
- http://localhost:3000

---

### **4️⃣ Conectar Frontend + Backend**

Frontend já está configurado para acessar Backend em:
- **Dev:** http://localhost:8000
- **Prod:** https://seu-backend.render.com

Se precisar mudar, edite `frontend/lib/api.ts` ou variáveis de ambiente.

---

### **5️⃣ Testar Fluxo Completo**

1. **Backend rodando?** (Terminal 1)
   ```powershell
   cd backend
   .\venv\Scripts\Activate.ps1
   python main.py
   ```

2. **Frontend rodando?** (Terminal 2)
   ```powershell
   cd frontend
   npm run dev
   ```

3. **Teste no navegador:**
   - Acesse http://localhost:3000
   - Clique em "Dashboard"
   - Deve conectar com sucesso no Backend

---

## 🔧 Troubleshooting

### ❌ Erro: "ModuleNotFoundError: No module named 'fastapi'"

**Solução:**
```powershell
# Verificar que venv está ativado (deve ter (venv) no prompt)
# Se não estiver:
cd backend
.\venv\Scripts\Activate.ps1

# Reinstalar
pip install -r requirements.txt
```

### ❌ Erro: "firebase-key.json not found"

**Solução:**
```powershell
# Baixar nova chave em Firebase Console
# Salvar em: backend/firebase-key.json

# Verificar:
Test-Path "backend/firebase-key.json"
```

### ❌ Erro: "OPENAI_API_KEY not found"

**Solução:**
```powershell
# Verificar .env existe em backend/
Test-Path "backend/.env"

# Se não existir, copiar de .env.example
Copy-Item ".env.example" "backend/.env"

# Editar e adicionar chave
notepad backend/.env
```

### ❌ Frontend conecta mas Backend recusa

**Solução:**
- Verificar Backend está rodando em http://localhost:8000
- Verificar que CORS está habilitado (main.py tem `allow_origins=["*"]`)
- Verificar console do navegador por erros (F12 → Console)

---

## 📚 Referências

- **Backend:** http://localhost:8000/docs (quando rodando)
- **Frontend:** http://localhost:3000 (quando rodando)
- **Firebase:** https://console.firebase.google.com/project/sentinela-ia-1c3c9
- **OpenAI API:** https://platform.openai.com/account/api-keys
- **Groq API:** https://console.groq.com/keys

---

## ✅ Checklist

- [ ] `.env` criado em backend com credenciais
- [ ] `firebase-key.json` criado em backend
- [ ] `pip install -r requirements.txt` executado
- [ ] Backend testa com `python main.py`
- [ ] Frontend testa com `npm run dev`
- [ ] Fluxo completo testado (http://localhost:3000)

---

## 🚀 Próximos Passos

Depois de tudo funcionando localmente:

1. **Fazer commit** (credenciais estão seguras no .gitignore):
   ```bash
   git add .
   git commit -m "🔒 chore: remover credenciais expostas e limpar arquivos desnecessários"
   git push origin main
   ```

2. **Deploy no Render:**
   - Adicionar variáveis de ambiente em Render
   - Redeploy automático

3. **Deploy no Vercel:**
   - Executar `npm run deploy`
   - Ou usar Vercel CLI

---

**Última atualização:** 25 de Maio de 2026
**Status:** ✅ Projeto limpo e seguro
