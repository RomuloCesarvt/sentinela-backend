# 🚀 QUICK START - Deploy em 10 Minutos

**Custo**: R$ 0,00/mês | **Plataformas**: Render + Vercel | **Tempo**: ~10 minutos ⚡

## TL;DR (Resumo Super Rápido)

```
1. Render.com (Backend FastAPI + PostgreSQL) = FREE
2. Vercel.com (Frontend Next.js) = FREE
3. Deploy automático a cada push no GitHub
```

---

## 🎯 3 Passos Rápidos

### Passo 1: Preparar GitHub
```bash
git add .
git commit -m "Deploy Render + Vercel"
git push origin main
```

### Passo 2: Deploy Backend (Render)
1. Acesse [render.com](https://render.com)
2. Conecte com GitHub
3. Novo Web Service
   - Repository: `sentinela_ia_v2`
   - Build: `pip install -r backend/requirements.txt`
   - Start: `cd backend && python main.py`
   - Plan: **Free**
4. Create + Aguarde (2 min)
5. Copie URL: `https://sentinela-backend.render.com`

### Passo 3: Deploy Frontend (Vercel)
1. Acesse [vercel.com](https://vercel.com)
2. Conecte com GitHub
3. Novo Project
   - Repository: `sentinela_ia_v2`
   - Root: `frontend`
   - Deploy
4. Aguarde (3 min)
5. Copie URL: `https://seu-projeto.vercel.app`

---

## ⚙️ Variáveis de Ambiente

### Backend (Render → Environment Variables)
```
GROQ_API_KEY=sua_chave
GEMINI_API_KEY=sua_chave
OPENAI_API_KEY=sua_chave
MORADA_LOGIN=seu_email
MORADA_PASSWORD=sua_senha
EMAIL_SENDER=seu_email
EMAIL_RECIPIENT=destinatario
DATABASE_URL=[de PostgreSQL que criar]
PERIODO_ANALISE=24h
SCHEDULE_ENABLED=true
SCHEDULE_HOURS=09:00
```

### Frontend (Vercel → Environment Variables)
```
NEXT_PUBLIC_API_URL=https://sentinela-backend.render.com
```

---

## ✅ Teste
1. Abra `https://seu-projeto.vercel.app`
2. Login: admin / admin
3. Pronto! 🎉

---

## 📚 Docs Completas

- [Guia Detalhado](./DEPLOY_RENDER_VERCEL.md)
- [Checklist Completo](./DEPLOYMENT_CHECKLIST.md)

---

**Custo Total**: R$ 0,00/mês forever ✅
