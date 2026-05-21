# Sentinela IA - Sistema de Monitoramento de Leads

Sistema web de análise inteligente de leads para o mercado imobiliário, com suporte multi-usuário, análise IA em tempo real e geração de relatórios.

## Stack

- **Backend**: FastAPI + Python 3.11
- **Frontend**: Next.js 16 + React 19 + TypeScript
- **Dados**: JSON (local) ou PostgreSQL (produção)
- **APIs**: Groq (primária), Gemini (fallback), OpenAI (opcional)
- **Automação**: Playwright para web scraping

## Instalação Local

### Backend

```bash
cd backend
pip install -r requirements.txt
cp ../.env.example ../.env
# Edite .env com suas credenciais
python main.py
```

Backend rodará em `http://localhost:8000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend rodará em `http://localhost:3000`

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# APIs
GROQ_API_KEY=sua_chave_groq_aqui
GEMINI_API_KEY=sua_chave_gemini_aqui
OPENAI_API_KEY=sua_chave_openai_aqui

# Credenciais Morada
MORADA_LOGIN=seu_email@example.com
MORADA_PASSWORD=sua_senha

# Email
EMAIL_SENDER=seu_email@mouraleite.com.br
EMAIL_RECIPIENT=destinatario@mouraleite.com.br

# Configurações
PERIODO_ANALISE=24h
SCHEDULE_ENABLED=true
SCHEDULE_HOURS=09:00
```

## 🚀 Deploy em Produção (100% Gratuito)

### ⭐ RECOMENDADO: Render + Vercel

> **Custo**: R$ 0,00/mês para sempre ✅  
> **Tempo**: ~10 minutos ⚡

**Backend**: Render.com (FastAPI + PostgreSQL FREE)  
**Frontend**: Vercel.com (Next.js FREE)

👉 **[Leia o guia completo aqui →](./DEPLOY_RENDER_VERCEL.md)**

---

### ⚠️ Alternativa: Railway (NÃO RECOMENDADO)

⚠️ **Railway não é mais 100% gratuito:**
- Trial com $5 de crédito (tempo limitado)
- Plano Free = $0/mês mas com apenas 0.5GB RAM
- Plano Hobby = $5/mês obrigatório

👉 Se mesmo assim quiser usar Railway, [veja o guia antigo](./DEPLOY_RAILWAY_LEGACY.md)

## Usuários Padrão

- **admin**: Acesso total ao sistema
- **SDRs**: Acesso aos seus próprios leads (dados isolados)

Para adicionar novos usuários, use a dashboard após login como admin.

## 📚 Documentação

| Documento | Conteúdo |
|-----------|----------|
| **[DEPLOY_QUICK_START.md](./DEPLOY_QUICK_START.md)** | ⚡ Deploy em 10 minutos (resumido) |
| **[DEPLOY_RENDER_VERCEL.md](./DEPLOY_RENDER_VERCEL.md)** | 📖 Guia completo passo a passo |
| **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** | ✅ Checklist para não esquecer nada |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | 📐 Diagrama e fluxos de dados |

## Estrutura de Arquivos

```
sentinela_ia_v2/
├── backend/                 # API FastAPI
│   ├── main.py             # Aplicação principal
│   ├── automation/          # Automação com Playwright
│   ├── ai/                 # Motores IA (Groq, Gemini)
│   ├── data/               # Dados (JSON)
│   ├── requirements.txt     # Dependências Python
│   └── init_config.py       # Inicialização de config
├── frontend/               # App Next.js
│   ├── app/                # Páginas e rotas
│   ├── components/         # Componentes React
│   ├── package.json        # Dependências Node
│   └── next.config.js      # Config Next.js
├── .env.example            # Template de variáveis
├── .gitignore              # Arquivos ignorados
├── Dockerfile              # Build para containers
├── render.yaml             # Config automática Render
├── vercel.json             # Config automática Vercel
├── DEPLOY_QUICK_START.md   # Guide rápido (10 min)
├── DEPLOY_RENDER_VERCEL.md # Guide completo
├── DEPLOYMENT_CHECKLIST.md # Checklist
└── ARCHITECTURE.md         # Diagrama arquitetura
```

## Segurança

⚠️ **IMPORTANTE**: 
- Nunca commit `.env` no Git
- Nunca exponha API keys no código
- Use variáveis de ambiente em produção
- O arquivo `.gitignore` protege automaticamente

## Troubleshooting

### Erro de API Key no Railway

1. Verifique se a variável está definida no painel do Railway
2. Reinicie o deployment
3. Verifique os logs: `railway logs`

### Leads não aparecem

1. Verifique as credenciais do Morada
2. Verifique o status do scan no dashboard
3. Verifique logs do backend: `railway logs`

### Problema de CORS

CORS está configurado para aceitar todas as origens. Se tiver problema:
1. Verifique URL do frontend
2. Verifique URL do backend
3. Reinicie ambos os serviços

## Suporte

Para problemas ou dúvidas sobre deploy:
- Railway Docs: https://docs.railway.app
- FastAPI: https://fastapi.tiangolo.com
- Next.js: https://nextjs.org/docs

---

**Status**: Produção Pronta ✅
**Última atualização**: 2026-04-13
