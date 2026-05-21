# ⚡ Resumo Rápido do Deploy Sentinela IA

## 🎯 Você tem 3 tarefas principais:

```
1️⃣ INSTALAR GIT
   ↓
2️⃣ FAZER COMMIT E PUSH PARA GITHUB
   ↓
3️⃣ CONECTAR RAILWAY E FAZER DEPLOY
   ↓
✅ SENTINELA RODANDO NA WEB!
```

---

## 1️⃣ INSTALAR GIT (5 minutos)

[Baixar Git](https://git-scm.com/)
→ Instale normalmente
→ Deixe tudo padrão

**Verificar**: Abra PowerShell e digite:
```
git --version
```

---

## 2️⃣ GIT COMMIT + PUSH (5 minutos)

Abra PowerShell e execute:

```powershell
cd "C:\Users\RomuloMeloMouraLeite\.gemini\antigravity\scratch\sentinela_ia_v2"

git init
git config user.email "romulo.melo@mouraleite.com.br"
git config user.name "Romulo Melo"
git add .
git commit -m "Initial commit: Sentinela IA"
```

---

## 3️⃣ CRIAR REPO NO GITHUB (3 minutos)

1. Vá para [github.com/new](https://github.com/new)
2. Nome: `sentinela_ia_v2`
3. Visibility: **Public** (importante!)
4. Clique "Create repository"

Copie a URL HTTPS que aparecer

---

## 4️⃣ FAZER PUSH (1 minuto)

Na PowerShell:

```powershell
git branch -M main
git remote add origin COLA_A_URL_AQUI
git push -u origin main
```

**Resultado esperado:**
```
✓ [new branch] main -> main
```

---

## 5️⃣ RAILWAY DEPLOY (15 minutos)

1. Vá para [railway.app](https://railway.app)
2. Sign Up com GitHub
3. "New Project" → "Deploy from GitHub"
4. Selecione seu repositório
5. Aguarde o deployment ficar ✅ verde

---

## 6️⃣ ADICIONAR VARIÁVEIS DE AMBIENTE

No painel Railway, vá para **Variables** e adicione:

```
GROQ_API_KEY = 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
GEMINI_API_KEY = AIzaSyDqBIm2wdPF0C7i4CR1ZMrzD-x7qJS5CRs
EMAIL_SENDER = romulo.melo@mouraleite.com.br
EMAIL_RECIPIENT = wagner.rinaldi@mouraleite.com.br
PORT = 8000
```

---

## 7️⃣ ACESSAR SUA URL

Na aba **Settings** → **Domain**

Você verá: `https://sentinela-production.up.railway.app`

**Clique e acesse!** 🎉

---

## 🔓 LOGIN

- **Username**: romulo ou mari
- **Password**: conforme seus dados

---

## ⏱️ TEMPO TOTAL: ~30 minutos

```
Git: 5 min
GitHub: 3 min
Push: 1 min
Railway Deploy: 15 min
Config: 5 min
Teste: 2 min
─────────────
TOTAL: 31 min
```

---

## 📖 Documentação Completa

Veja `DEPLOY_GUIDE.md` para instruções detalhadas passo a passo.

---

## ❓ Dúvidas?

- Erro no Git? → Ver seção "Problemas Comuns" em DEPLOY_GUIDE.md
- Deploy falhando? → Verifique os logs no Railway
- Variáveis de ambiente? → Verifique a digitação em Railway Variables

---

**Bora começar! 🚀**
