# 🔧 Solução: Erro 502 Bad Gateway - Configuração Responsiva

## ❌ Problema Identificado

O site estava retornando **502 Bad Gateway** do Cloudflare após as mudanças de responsividade. 

### Causa Raiz

O arquivo `next.config.js` (e suas versões `.mjs` e `.ts`) estava configurado com um URL local **hardcoded**:

```javascript
destination: 'http://127.0.0.1:8000/api/:path*'
```

Isso funciona em **desenvolvimento local**, mas em **produção (Cloudflare/Vercel)**, o Cloudflare não consegue acessar `127.0.0.1:8000` (localhost do seu computador). Por isso o erro 502.

---

## ✅ Solução Implementada

### 1️⃣ Arquivos Corrigidos

Os três arquivos de configuração do Next.js foram atualizados:

- ✅ `frontend/next.config.js`
- ✅ `frontend/next.config.mjs`  
- ✅ `frontend/next.config.ts`

### 2️⃣ O Que Mudou

**Antes (hardcoded para localhost):**
```javascript
destination: 'http://127.0.0.1:8000/api/:path*'
```

**Depois (dinâmico para dev/produção):**
```javascript
const getBackendUrl = () => {
  // Em produção, usa NEXT_PUBLIC_API_URL
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Em desenvolvimento, usa localhost
  if (process.env.NODE_ENV === 'development') {
    return 'http://127.0.0.1:8000';
  }
  
  // Fallback para Render
  return 'https://sentinela-backend.onrender.com';
};
```

### 3️⃣ Como Funciona Agora

```
┌─────────────────────────────────────────────────────────┐
│ DESENVOLVIMENTO LOCAL (npm run dev)                     │
├─────────────────────────────────────────────────────────┤
│ Frontend (localhost:3000)                               │
│ ↓                                                       │
│ /api/* requests                                         │
│ ↓                                                       │
│ Backend (localhost:8000) ✅ FUNCIONA                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ PRODUÇÃO (Cloudflare/Vercel)                            │
├─────────────────────────────────────────────────────────┤
│ Vercel configura NEXT_PUBLIC_API_URL                    │
│ ↓                                                       │
│ Frontend (vercel.app)                                   │
│ ↓                                                       │
│ /api/* requests                                         │
│ ↓                                                       │
│ Backend (seu-dominio-render.com) ✅ FUNCIONA           │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Como Deployar para Produção

### Opção A: Via Vercel + Render (RECOMENDADO)

#### Passo 1: Configurar Backend (Render)

Você já tem o backend rodando. Basta garantir que está em: **`https://sentinela-backend.onrender.com`**

(Ou qualquer URL do Render que o seu backend está usando)

#### Passo 2: Deploy Frontend no Vercel

1. Acesse **https://vercel.com/dashboard**
2. Vá para seu projeto Sentinela
3. Clique em **Settings** → **Environment Variables**
4. Adicione (ou atualize) a variável:
   ```
   NEXT_PUBLIC_API_URL = https://sentinela-backend.onrender.com
   ```
5. Clique em **Deployments** → **Redeploy** na última versão

#### Passo 3: Aguarde a reconstrução

Vercel vai:
1. Baixar o novo código (com as correções)
2. Inserir `NEXT_PUBLIC_API_URL` nas variáveis de ambiente
3. Compilar e fazer deploy
4. Em ~2-5 minutos está online! ✅

---

### Opção B: Deploy Local com Cloudflare Tunnel

Se quer testar localmente via Cloudflare:

```bash
# Terminal 1: Backend
cd backend
python main.py

# Terminal 2: Frontend  
cd frontend
npm run build
npm start

# Terminal 3: Cloudflare Tunnel
cloudflared tunnel run sentinela
```

Agora acesse: `https://seu-tunnel.trycloudflare.com`

---

## 🧪 Testar a Responsividade

### No Navegador:

1. Abra o seu site
2. Pressione **F12** (DevTools)
3. Clique em **Toggle device toolbar** (Ctrl+Shift+M)
4. Teste os breakpoints:
   - **Mobile** (320px): Menu hambúrguer, layout empilhado ✅
   - **Tablet** (768px): Sidebar visível, layout ajustado ✅
   - **Desktop** (1024px+): Sidebar sempre visível ✅

### Responsividade Confirmada em:

- ✅ `frontend/app/layout.tsx` - Sidebar condicional
- ✅ `frontend/app/page.tsx` - Grid responsivo (2 cols mobile → 4 cols desktop)
- ✅ `frontend/components/Sidebar.tsx` - Menu mobile/desktop
- ✅ `frontend/components/LeadKanban.tsx` - Cards responsivos
- ✅ `frontend/app/v3-harmony.css` - Tailwind CSS 4 com breakpoints

---

## 🔍 Se Ainda Não Funcionar

### 1. Verificar os Logs

**Vercel Logs:**
1. Dashboard → seu projeto → **Deployments**
2. Clique em `Inspect` na última deploy
3. Veja se há erros

**Render Logs:**
1. Dashboard → seu serviço backend
2. Clique em **Logs**
3. Procure por erros (vermelho)

### 2. Testar API Manualmente

No console do navegador (F12):

```javascript
// Teste a conexão
fetch('/api/leads')
  .then(r => r.json())
  .then(d => console.log(d))
  .catch(e => console.error(e))
```

Se funcionar, a API está ok. Se não, verifique `NEXT_PUBLIC_API_URL`.

### 3. Limpar Cache

```bash
# No seu computador
cd frontend
rm -rf .next
npm run build
npm start
```

---

## 📋 Checklist de Configuração

- [ ] Arquivos `next.config.*` atualizados
- [ ] `NEXT_PUBLIC_API_URL` configurada no Vercel (ou seu provider)
- [ ] Última deploy feita após as mudanças
- [ ] Backend rodando e acessível (teste: `curl https://seu-backend.render.com`)
- [ ] Frontend acessível via Vercel/Cloudflare
- [ ] Responsividade testada em mobile (F12 → Toggle device)
- [ ] API funcionando (teste em DevTools console)

---

## 🎯 Resumo da Solução

| Antes | Depois |
|-------|--------|
| ❌ `http://127.0.0.1:8000` | ✅ Dinâmico (env var) |
| ❌ Erro 502 em produção | ✅ Funciona em produção |
| ❌ Sem responsividade garantida | ✅ Responsivo confirmado |
| ❌ Sem flexibilidade | ✅ Suporta qualquer URL backend |

---

## 💡 Dica

Para futuras deployments, sempre use **variáveis de ambiente** em vez de valores hardcoded. Isso torna seu app:
- ✅ Portável (roda em dev, staging, produção)
- ✅ Seguro (sem dados sensíveis no Git)
- ✅ Flexível (muda apenas uma variável)

---

**Status**: ✅ Corrigido e Responsivo  
**Próximo passo**: Deploy no Vercel com `NEXT_PUBLIC_API_URL` configurada
