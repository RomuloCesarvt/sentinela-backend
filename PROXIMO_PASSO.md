# 🚀 PRÓXIMOS PASSOS - Sentinela IA v2

## ✅ O que foi feito

Sua repositório foi **limpo, securizado e otimizado**:

- ✅ Credenciais sensíveis removidas
- ✅ Arquivos duplicados eliminados (50+ arquivos)
- ✅ .gitignore atualizado com proteções
- ✅ Documentação consolidada
- ✅ Guia de setup criado

---

## 📋 AGORA VOCÊ PRECISA FAZER

### **PASSO 1: Obter Credenciais** (15 min)

| Credencial | Onde Obter | Instruções |
|-----------|-----------|-----------|
| **OpenAI API Key** | https://platform.openai.com/api-keys | Criar nova chave |
| **Groq API Key** | https://console.groq.com/keys | Criar nova chave |
| **Gemini API Key** | https://aistudio.google.com/app/apikeys | Criar nova chave |
| **Firebase Key** | https://console.firebase.google.com (sentinela-ia-1c3c9) | Project Settings → Service Accounts → Generate |
| **Morada Credentials** | (seu próprio login) | Email e senha |

---

### **PASSO 2: Configurar Ambiente Local** (10 min)

Siga o arquivo **`SETUP_LOCAL.md`** passo a passo:

```bash
# Rápido:
# 1. Copiar .env.example → backend/.env
# 2. Adicionar credenciais reais
# 3. Adicionar firebase-key.json
# 4. Instalar: pip install -r requirements.txt
# 5. Rodar: python main.py
```

---

### **PASSO 3: Testar Localmente** (10 min)

```powershell
# Terminal 1 - Backend
cd backend
.\venv\Scripts\Activate.ps1
python main.py
# Verificar: http://localhost:8000/docs

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
# Verificar: http://localhost:3000
```

---

### **PASSO 4: Fazer Commit** (5 min)

```bash
git status
# Deve mostrar APENAS: SETUP_LOCAL.md, README.md, .gitignore modificados
# NÃO deve mostrar: .env, firebase-key.json, backend/venv

git add .
git commit -m "🔒 chore: remover credenciais expostas e limpar projeto

- Remover OpenAI API key do .env
- Remover Firebase keys do repositório  
- Consolidar documentação duplicada (7 docs removidas)
- Limpar logs antigos e PDFs de teste (50+ arquivos)
- Adicionar SETUP_LOCAL.md com instruções detalhadas
- Atualizar .gitignore com proteções adicionais"

git push origin main
```

---

### **PASSO 5: Deploy em Produção** (20 min)

#### **Opção A: Render (Backend) + Vercel (Frontend)**

**Backend no Render:**
1. Ir para https://render.com/
2. Selecionar "New +" → "Web Service"
3. Conectar repo GitHub
4. Selecionar branch: `main`
5. Adicionar variáveis de ambiente (same as .env)
6. Deploy!

**Frontend no Vercel:**
1. Ir para https://vercel.com/
2. Importar projeto → Next.js
3. Conectar GitHub
4. Deploy automático!

---

#### **Opção B: Docker Local + Cloudflare Tunnel**

```bash
# Build Docker
docker build -t sentinela-api .

# Run Docker
docker run -p 8000:8000 --env-file backend/.env sentinela-api

# Cloudflare Tunnel
cloudflared tunnel --url http://localhost:8000
```

---

## 🎯 CHECKLIST DE EXECUÇÃO

- [ ] OpenAI API Key obtida
- [ ] Groq API Key obtida
- [ ] Gemini API Key obtida
- [ ] Firebase Key baixada
- [ ] `backend/.env` configurado com credenciais
- [ ] `backend/firebase-key.json` adicionado
- [ ] `pip install -r requirements.txt` OK
- [ ] Backend roda em localhost:8000
- [ ] `npm install` OK
- [ ] Frontend roda em localhost:3000
- [ ] Git commit realizado
- [ ] Repositório atualizado

---

## ⚠️ PROBLEMAS COMUNS

### Backend não inicia
```
ModuleNotFoundError: No module named 'fastapi'
→ Ativar venv: .\venv\Scripts\Activate.ps1
→ Reinstalar: pip install -r requirements.txt
```

### Firebase não conecta
```
[FIREBASE] Arquivo firebase-key.json não encontrado!
→ Baixar chave do Firebase Console
→ Salvar em: backend/firebase-key.json
```

### Frontend conecta mas API falha
```
CORS Error / 401 Unauthorized
→ Verificar Backend está rodando
→ Verificar .env tem credenciais
→ Verificar OPENAI_API_KEY está válida
```

---

## 📞 Suporte

Problemas? Verifique:

1. **`SETUP_LOCAL.md`** - Guia detalhado step-by-step
2. **`START_HERE.md`** - Visão geral do projeto
3. **`DEPLOY_GUIDE.md`** - Deploy em produção
4. **Backend Docs:** http://localhost:8000/docs (quando rodando)

---

## 🎓 Entendendo o Projeto

**Estrutura:**
```
frontend/        → Next.js (React, TypeScript, Tailwind)
├── app/         → Páginas (login, dashboard, reports, etc)
└── lib/         → Utilitários, API client, hooks

backend/         → FastAPI (Python, Playwright, IA)
├── main.py      → API principal
├── automation/  → Web scraping (Morada leads)
├── ai/          → Análise com Groq/Gemini/OpenAI
├── data/        → JSON storage (users, config, leads)
└── requirements.txt → Dependências Python

extensao/        → Chrome Extension (opcional)
├── manifest.json
├── popup.html
└── content.js
```

**Fluxo:**
1. User acessa frontend (http://localhost:3000)
2. Frontend chama Backend API (http://localhost:8000)
3. Backend processa com IA (Groq/Gemini)
4. Backend salva em Database (JSON ou PostgreSQL)
5. Frontend exibe resultados em tempo real

---

## 🌟 Próximas Features (Opcional)

- [ ] Adicionar autenticação OAuth (Google, GitHub)
- [ ] Integração com Whatsapp Business API
- [ ] Dashboard com gráficos (ChartJS)
- [ ] Testes automatizados (pytest, Jest)
- [ ] CI/CD com GitHub Actions
- [ ] Monitoring com Sentry

---

**Status Atual:** ✅ Seguro, Limpo e Pronto para Setup Local

**Última Atualização:** 25 de Maio de 2026

**Próximo Passo:** Seguir as instruções em `SETUP_LOCAL.md` 👉
