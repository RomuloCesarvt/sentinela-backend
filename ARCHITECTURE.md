# 📐 Arquitetura de Deployment - Render + Vercel

## 🏗️ Diagrama da Arquitetura

```
┌──────────────────────────────────────────────────────────────────────┐
│                           INTERNET PÚBLICO                           │
└──────────────────────────────────────────────────────────────────────┘
                  ↑                              ↑
                  │                              │
         ┌────────┴────────┐          ┌──────────┴───────────┐
         │                 │          │                      │
    ┌────▼────┐        ┌──▼────┐    ┌▼──────────┐    ┌──────▼───┐
    │  User   │        │ User  │    │  API      │    │ Static   │
    │Browser  │        │Mobile │    │ Docs      │    │  Files   │
    └────┬────┘        └──┬────┘    └┬──────────┘    └──────┬───┘
         │                │          │                      │
         └────────────────┼──────────┘                      │
                          │                                  │
                  ┌───────▼──────────┐                       │
                  │                  │                       │
        ┌─────────▼────────┐   ┌────▼────────────────┐      │
        │                  │   │                     │      │
        │  VERCEL (CDN)    │   │  VERCEL FRONTEND    │      │
        │  Global Edge     │   │  Next.js 16         │      │
        │  Routing         │   │  React 19           │      │
        │                  │   │  TypeScript         │      │
        └──────────────────┘   └────┬────────────────┘      │
                                    │                       │
                    ┌───────────────┼──────────────────┐    │
                    │ (CORS)        │                  │    │
                    │               │                  │    │
            ┌───────▼────────────────────────┐         │    │
            │                                │         │    │
            │     RENDER WEB SERVICE         │         │    │
            │     FastAPI Backend            │         │    │
            │     Python 3.11                │         │    │
            │                                │         │    │
            │  ┌──────────────────────────┐  │         │    │
            │  │ API Endpoints:           │  │         │    │
            │  │ - /api/auth/login        │  │         │    │
            │  │ - /api/leads             │  │         │    │
            │  │ - /api/scan              │  │         │    │
            │  │ - /api/config            │  │         │    │
            │  │ - /api/reports           │  │         │    │
            │  └──────────────────────────┘  │         │    │
            │                                │         │    │
            │  ┌──────────────────────────┐  │         │    │
            │  │ IA Modules:              │  │         │    │
            │  │ - Groq IA                │  │         │    │
            │  │ - Gemini                 │  │         │    │
            │  │ - OpenAI (opcional)      │  │         │    │
            │  └──────────────────────────┘  │         │    │
            │                                │         │    │
            │  ┌──────────────────────────┐  │         │    │
            │  │ Automação:               │  │         │    │
            │  │ - Playwright             │  │         │    │
            │  │ - Web Scraping           │  │         │    │
            │  │ - APScheduler            │  │         │    │
            │  └──────────────────────────┘  │         │    │
            │                                │         │    │
            └───────────┬────────────────────┘         │    │
                        │                              │    │
            ┌───────────▼──────────────┐               │    │
            │                          │               │    │
            │  RENDER POSTGRESQL       │               │    │
            │  FREE (256MB, 100 conn)  │               │    │
            │                          │               │    │
            │  Tabelas:                │               │    │
            │  - users                 │               │    │
            │  - leads                 │               │    │
            │  - auditorias            │               │    │
            │  - reports               │               │    │
            │                          │               │    │
            └──────────────────────────┘               │    │
                                                       │    │
            ┌──────────────────────────────────────────┴┐   │
            │                                           │   │
            │  RENDER STORAGE (Ephemeral)              │   │
            │  - Cache de sessões                      │   │
            │  - Arquivos temporários                  │   │
            │  - Logs                                  │   │
            │                                           │   │
            └───────────────────────────────────────────┘   │
                                                            │
                        (Static Assets)                     │
                           ▼                                │
                   ┌───────────────────┐                    │
                   │  Vercel Static    │◄───────────────────┘
                   │  Storage          │
                   │  - CSS            │
                   │  - JS             │
                   │  - Images         │
                   └───────────────────┘

```

---

## 🔄 Fluxo de Dados

### 1️⃣ User Login
```
User Browser
    ↓ (POST /api/auth/login)
Vercel Frontend (Next.js)
    ↓ (fetch to sentinela-backend.render.com)
Render Backend (FastAPI)
    ↓ (validate credentials)
PostgreSQL
    ↓ (user data)
Response → Browser → Logged In ✅
```

### 2️⃣ Lead Analysis
```
User clicks "Analyze"
    ↓
Frontend sends POST /api/analyze
    ↓
Backend receives request
    ↓ (Playwright) scrapes Morada website
    ↓
PostgreSQL stores raw data
    ↓
Groq IA analyzes (primary)
    ↓ (or Gemini if Groq fails)
Backend returns analysis
    ↓
Frontend displays results
    ↓
User sees AI insights ✅
```

### 3️⃣ Scheduled Tasks
```
APScheduler (Backend)
    ↓ (every day at 09:00)
Triggers scan_job()
    ↓
Playwright extracts Morada leads
    ↓
PostgreSQL stores data
    ↓
IA analysis runs
    ↓
Email sent to EMAIL_RECIPIENT ✅
```

---

## 📊 Componentes & Locais

| Componente | Localização | Tipo | Gratuito? |
|-----------|------------|------|----------|
| Frontend | Vercel | Static Site + CDN | ✅ Yes |
| Backend | Render | Web Service | ✅ Yes |
| PostgreSQL | Render | Database | ✅ Yes |
| Groq IA | API Cloud | (sua chave) | ⚠️ Limits |
| Gemini IA | API Cloud | (sua chave) | ⚠️ Limits |
| OpenAI | API Cloud | (sua chave) | ⚠️ Paid |

---

## 🔐 Segurança

### Como variáveis protegidas funcionam:

```
.env.example (público no GitHub)
    ↓ exemplo de quais vars existem
    ↓
Render Dashboard → Environment Variables
    ↓ valores secretos NÃO no Git
    ↓
Injected em runtime
    ↓
Backend acessa via os.environ
    ↓
✅ Seguro!
```

### Em produção:
- `.env` NUNCA é commitado (.gitignore protege)
- Variáveis sensíveis apenas no Dashboard
- Acesso ao banco é interno (Render ↔ Backend)
- CORS configurado adequadamente

---

## 📈 Performance

### Render Free Tier Specs:
```
RAM: 512 MB
CPU: 0.1 vCPU
Sleep: Após 15 min inatividade (wake up automático)
Requests: ~10-15 req/s (suficiente para SME)
```

### Vercel Free Tier Specs:
```
Bandwidth: Unlimited
Build: Unlimited
Functions: 12 seconds timeout
CDN: Global (160+ datacenters)
Performance: Muito rápido ⚡
```

### PostgreSQL Free Tier:
```
Storage: 1GB
Connections: 100
Backups: Basic
Perfect para: Pequenas empresas ✅
```

---

## 🔄 Auto-Deploy

Quando você faz `git push`:

```
GitHub receives push
    ↓
Render webhook triggered (Backend)
    ↓
Render builds Docker image
    ↓
pip install requirements.txt
    ↓
playwright install chromium
    ↓
Deploy new service
    ↓
✅ Backend online

GitHub receives push
    ↓
Vercel webhook triggered (Frontend)
    ↓
Vercel builds Next.js
    ↓
npm install
    ↓
npm run build
    ↓
Deploy to CDN
    ↓
✅ Frontend online
```

---

## 💰 Custos Mensais

```
Backend (Render):        R$ 0,00
Frontend (Vercel):       R$ 0,00
PostgreSQL (Render):     R$ 0,00
Groq API:               Consultar (FREE tier)
Gemini API:             Consultar (FREE tier)
OpenAI (opcional):      Pago conforme uso

────────────────────
TOTAL:                  R$ 0,00 ✅
```

---

## 🚀 Próximos Passos (Upgrade)

Se crescer muito, pode:

1. **Render Hobby** ($7/mês) → 512MB RAM, 0.5 vCPU
2. **PostgreSQL Basic** ($19/mês) → 1GB RAM, conexões ilimitadas
3. **Domínio customizado** → https://sentinela.seudominio.com

Mas para começar, **FREE é perfeito!**

---

**Status**: ✅ Architecture Ready  
**Deployment**: ✅ Render + Vercel  
**Cost**: R$ 0,00/mês  
**Scalability**: ✅ Pronto para crescer
