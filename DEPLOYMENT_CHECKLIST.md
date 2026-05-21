# ✅ SENTINELA IA - CHECKLIST DE DEPLOYMENT

Use este checklist para garantir que tudo está pronto para deploy no Render + Vercel.

## 📋 Pré-requisitos

- [ ] Repositório GitHub: `seometriamarketing-lgtm/sentinela_ia_v2`
- [ ] Conta Render.com (grátis)
- [ ] Conta Vercel.com (grátis)
- [ ] API Keys:
  - [ ] GROQ_API_KEY obtida em https://groq.com/
  - [ ] GEMINI_API_KEY obtida em https://ai.google.dev/
  - [ ] OPENAI_API_KEY (opcional) obtida em https://openai.com/

## 🔧 Preparação do Backend

### Verificações:
- [ ] `backend/requirements.txt` contém todas as dependências
- [ ] `backend/main.py` está presente e funcional
- [ ] `Dockerfile` está correto
- [ ] `render.yaml` existe (já criado ✅)
- [ ] `.env.example` está completo

### Credenciais Morada:
- [ ] MORADA_LOGIN - email para login no Morada
- [ ] MORADA_PASSWORD - senha Morada
- [ ] EMAIL_SENDER - email remetente
- [ ] EMAIL_RECIPIENT - email destinatário

## 🎨 Preparação do Frontend

### Verificações:
- [ ] `frontend/package.json` está correto
- [ ] `frontend/next.config.js` existe
- [ ] `frontend/tsconfig.json` existe
- [ ] `vercel.json` foi criado (já criado ✅)

### Configuração:
- [ ] `frontend/.env.local` terá `NEXT_PUBLIC_API_URL`

## 🚀 Deploy - Render Backend

### Passo 1: Preparar GitHub
```bash
git add .
git commit -m "Preparar para deploy Render + Vercel"
git push origin main
```
- [ ] Push concluído

### Passo 2: Criar Render Account
1. [ ] Acesse https://render.com
2. [ ] Clique "Sign up with GitHub"
3. [ ] Autorize Render
4. [ ] Confirme email

### Passo 3: Deploy Backend
1. [ ] Clique "New Web Service"
2. [ ] Selecione repositório `sentinela_ia_v2`
3. [ ] Name: `sentinela-backend`
4. [ ] Build Command: `pip install -r backend/requirements.txt`
5. [ ] Start Command: `cd backend && python main.py`
6. [ ] Plan: **Free**
7. [ ] Clique "Create Web Service"
8. [ ] Aguarde deploy (2-3 minutos)
9. [ ] Copie URL: `https://sentinela-backend.render.com`

### Passo 4: Criar PostgreSQL
1. [ ] Clique "New PostgreSQL"
2. [ ] Name: `sentinela-db`
3. [ ] Plan: **Free**
4. [ ] Clique "Create Database"
5. [ ] **Copie connection string** (será necessário)

### Passo 5: Variáveis de Ambiente - Backend
No Render, vá para seu Web Service → Environment:

```
GROQ_API_KEY              = [sua chave]
GEMINI_API_KEY            = [sua chave]
OPENAI_API_KEY            = [sua chave]
MORADA_LOGIN              = [seu email]
MORADA_PASSWORD           = [sua senha]
EMAIL_SENDER              = [seu email]
EMAIL_RECIPIENT           = [email destinatário]
DATABASE_URL              = [copie da PostgreSQL acima]
PERIODO_ANALISE           = 24h
SCHEDULE_ENABLED          = true
SCHEDULE_HOURS            = 09:00
```

- [ ] Todas as variáveis adicionadas
- [ ] Clique "Deploy" para re-deploy

**Aguarde confirmar backend online:** 
- [ ] Acesse https://sentinela-backend.render.com/docs (se vir Swagger UI, está ok!)

## 🚀 Deploy - Vercel Frontend

### Passo 1: Criar Vercel Account
1. [ ] Acesse https://vercel.com
2. [ ] Clique "Sign up with GitHub"
3. [ ] Autorize Vercel
4. [ ] Confirme email

### Passo 2: Conectar Projeto
1. [ ] Clique "Add New" → "Project"
2. [ ] Selecione `sentinela_ia_v2`
3. [ ] Framework: **Next.js**
4. [ ] Root Directory: **frontend**
5. [ ] Build Command: `npm run build`
6. [ ] Install Command: `npm install`
7. [ ] Clique "Deploy"
8. [ ] Aguarde deploy (2-5 minutos)
9. [ ] Copie URL: `https://seu-projeto.vercel.app`

### Passo 3: Variáveis de Ambiente - Frontend
No Vercel, vá para Settings → Environment Variables:

```
NEXT_PUBLIC_API_URL = https://sentinela-backend.render.com
```

- [ ] Variável adicionada
- [ ] Clique "Redeploy" para re-deploy

**Aguarde confirmar frontend online:**
- [ ] Acesse https://seu-projeto.vercel.app
- [ ] Verifique se carregou sem erros

## ✅ Teste Final

1. [ ] Abra https://seu-projeto.vercel.app
2. [ ] Faça login:
   - Username: `admin`
   - Password: `admin`
3. [ ] Dashboard carregou?
4. [ ] Consegue ver leads (se houver)?
5. [ ] Consegue fazer análise?

## 🎉 Pronto!

Se tudo passou no checklist acima, seu Sentinela está **100% online e gratuito!**

---

## 📊 URLs Finais

| Componente | URL |
|-----------|-----|
| Frontend | https://seu-projeto.vercel.app |
| Backend API | https://sentinela-backend.render.com |
| Swagger Docs | https://sentinela-backend.render.com/docs |
| Banco de Dados | render.com (PostgreSQL) |

---

## 🆘 Se Algo Deu Errado

### Backend não inicia?
```
Verifique em Render → sentinela-backend → Logs
```

### Frontend não conecta?
```
DevTools (F12) → Console
Verifique se NEXT_PUBLIC_API_URL está correto
```

### Precisa de ajuda?
1. Veja o guia completo: `DEPLOY_RENDER_VERCEL.md`
2. Abre issue no GitHub
3. Verifique logs no dashboard

---

**Status**: ✅ Pronto para Deployment  
**Custo**: R$ 0,00/mês  
**Suporte**: 24/7 via logs
