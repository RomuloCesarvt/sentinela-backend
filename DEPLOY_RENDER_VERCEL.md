# 🚀 Guia Completo de Deploy Sentinela - Render + Vercel

> **Status**: 100% Gratuito para sempre | Sem limite de tempo ✅

## 📊 Arquitetura do Deploy

```
┌─────────────────────────────────────────────────────────────┐
│                     Seus Usuários                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend (Next.js)          Backend (FastAPI)              │
│  vercel.app ───────────────► render.com                     │
│                    ↓                                         │
│                PostgreSQL (Render Free)                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Custo**: R$ 0,00/mês forever 🎉

---

## ⚙️ PASSO 1: Preparar o Backend (FastAPI)

### Antes de começar, você precisa de:

- ✅ Conta no [Render.com](https://render.com) (grátis)
- ✅ Repositório no GitHub (você já tem)
- ✅ API Keys: Groq, Gemini, OpenAI (você já tem)

### Passo 1.1: Fazer Push do Código para GitHub

```bash
# No seu computador, no diretório do projeto
git add .
git commit -m "Preparar para deploy no Render"
git push origin main
```

### Passo 1.2: Conectar Render ao GitHub

1. Acesse [https://render.com](https://render.com)
2. Clique em **"Sign up"** (ou faça login se já tem conta)
3. Escolha **"Sign up with GitHub"**
4. Autorize o Render a acessar seus repositórios

### Passo 1.3: Criar Backend Service no Render

1. No dashboard do Render, clique em **"New +"** → **"Web Service"**

2. Selecione o repositório: **`sentinela_ia_v2`**

3. Configure assim:
   ```
   Name: sentinela-backend
   Environment: Python 3
   Build Command: pip install -r backend/requirements.txt
   Start Command: cd backend && python main.py
   Plan: Free (gratuito)
   Region: São Paulo (mais próximo)
   ```

4. Clique em **"Create Web Service"** (Render vai fazer deploy automaticamente)

### Passo 1.4: Configurar PostgreSQL

1. No dashboard, clique em **"New +"** → **"PostgreSQL"**

2. Configure assim:
   ```
   Name: sentinela-db
   Database: sentinela_db
   User: sentinela_user
   Region: São Paulo
   Plan: Free
   ```

3. **Copie a connection string** (algo como):
   ```
   postgresql://sentinela_user:PASSWORD@host:5432/sentinela_db
   ```

### Passo 1.5: Adicionar Variáveis de Ambiente

No dashboard do Render, acesse seu serviço **sentinela-backend**:

1. Clique em **"Environment"**
2. Adicione estas variáveis (clique em **"Add Environment Variable"** para cada uma):

```
GROQ_API_KEY                 = sua_chave_groq
GEMINI_API_KEY              = sua_chave_gemini
OPENAI_API_KEY              = sua_chave_openai
MORADA_LOGIN                = seu_email_morada
MORADA_PASSWORD             = sua_senha_morada
EMAIL_SENDER                = seu_email@example.com
EMAIL_RECIPIENT             = destinatario@example.com
DATABASE_URL                = postgresql://... (copie de cima)
PERIODO_ANALISE             = 24h
SCHEDULE_ENABLED            = true
SCHEDULE_HOURS              = 09:00
```

3. Após adicionar, clique em **"Deploy"** novamente

### Resultado:
- ✅ Backend rodando em: `https://sentinela-backend.render.com`
- ✅ PostgreSQL conectado automaticamente

---

## ⚙️ PASSO 2: Preparar o Frontend (Next.js)

### Antes de começar:
- ✅ URL do backend que você copiou acima

### Passo 2.1: Atualizar arquivo `.env.local` do Frontend

No arquivo `frontend/.env.local`, adicione:

```env
NEXT_PUBLIC_API_URL=https://sentinela-backend.render.com
```

### Passo 2.2: Fazer Push para GitHub

```bash
git add frontend/.env.local
git commit -m "Configurar API URL para Render"
git push origin main
```

### Passo 2.3: Deploy no Vercel

1. Acesse [https://vercel.com](https://vercel.com)
2. Clique em **"Sign up"** (use GitHub)
3. Clique em **"New Project"**
4. Selecione seu repositório `sentinela_ia_v2`
5. Configure:
   ```
   Framework: Next.js
   Root Directory: frontend
   Build Command: npm run build
   Install Command: npm install
   ```

6. Clique em **"Deploy"**

### Passo 2.4: Adicionar Variáveis no Vercel

1. Após o deploy, vá para **"Settings"** → **"Environment Variables"**
2. Adicione:
   ```
   NEXT_PUBLIC_API_URL = https://sentinela-backend.render.com
   ```

3. Re-deploy clicando em **"Deployments"** → **"Redeploy"**

### Resultado:
- ✅ Frontend rodando em: `https://seu-projeto.vercel.app`
- ✅ Conectado ao backend automaticamente

---

## 🔄 Deploy Automático

Depois de agora:

1. **Você faz push para GitHub**
2. **Render** detecta mudanças → **Re-deploy automático do backend**
3. **Vercel** detecta mudanças → **Re-deploy automático do frontend**

Sem fazer nada mais! 🚀

---

## 🧪 Testar o Deploy

1. Acesse: `https://seu-projeto.vercel.app`
2. Login com credenciais padrão:
   ```
   Username: admin
   Password: admin (altere em produção!)
   ```

3. Verifique se consegue:
   - ✅ Fazer login
   - ✅ Ver leads (se houver dados)
   - ✅ Fazer análise IA

---

## 📋 Domínios Customizados (Opcional)

### Para o Frontend (Vercel):
1. Em **Vercel** → **Settings** → **Domains**
2. Adicione seu domínio customizado
3. Siga as instruções de DNS

### Para o Backend (Render):
1. Em **Render** → Service → **Settings** → **Custom Domain**
2. Adicione seu domínio
3. Configure DNS

---

## 🚨 Troubleshooting

### Backend não inicia?
- Verifique os **logs** no Render: Service → **Logs**
- Verifique variáveis de ambiente estão todas preenchidas
- Verifique se o `Dockerfile` está correto

### Frontend não conecta ao backend?
- Verifique `NEXT_PUBLIC_API_URL` está correto
- Verifique CORS no backend (`main.py` linha ~30)
- Abra DevTools (F12) e veja erros no console

### PostgreSQL não conecta?
- Copie exatamente a URL do PostgreSQL
- Use a variável `DATABASE_URL` no backend
- Verifique firewall/IP whitelist (Render libera automaticamente)

### Leads não aparecem?
- Verify credenciais Morada estão corretas
- Verifique os logs: `railway logs` ou dashboard Render
- Tente rodar scan manual: POST `/api/scan`

---

## 💡 Dicas Importantes

### Segurança:
- ✅ Nunca commit `.env` no Git
- ✅ Use variáveis de ambiente para secrets
- ✅ Altere senha admin após primeiro login
- ✅ Use API keys com permissões mínimas

### Performance:
- Render Free dorme após 15min sem requisições (wake up é automático)
- Se performance importante, considere upgrade posterior
- PostgreSQL Free tem limite de conexões (100)

### Monitoramento:
- Verifique logs regularmente em Render
- Configure alertas de erro (Render permite)
- Monitore uso de banco de dados

---

## 🔗 Links Úteis

- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [FastAPI](https://fastapi.tiangolo.com)
- [Next.js](https://nextjs.org/docs)

---

## 📞 Suporte

Se tiver problemas:

1. Verifique os **logs** (Render dashboard)
2. Verifique **variáveis de ambiente**
3. Teste **localmente** antes de fazer push
4. Abra issue no GitHub

---

**Status**: ✅ Pronto para Produção  
**Custo**: R$ 0,00/mês para sempre  
**Tempo de Deploy**: ~5-10 minutos
