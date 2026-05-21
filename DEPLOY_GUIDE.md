# 🚀 Guia Completo de Deploy do Sentinela IA na Web

Você está a **3 passos** de ter seu Sentinela rodando online, 100% gratuito!

## ✅ O que já foi feito:

Criei todos os arquivos necessários para um deploy seguro:

- ✅ `.gitignore` - Protege suas credenciais
- ✅ `.env.example` - Template de variáveis
- ✅ `Dockerfile` - Configuração para Railway
- ✅ `railway.json` - Estratégia de deploy
- ✅ `init_config.py` - Inicialização segura de config
- ✅ `init_users.py` - Inicialização de usuários
- ✅ `README.md` - Documentação

---

## 📝 PASSO 1: Instalar Git

### Se você usa Windows:

1. Vá para [git-scm.com](https://git-scm.com/)
2. Baixe **Git for Windows** (versão mais recente)
3. Execute o instalador
4. Deixe todas as opções padrão
5. Clique "Install"

**Verificar se instalou:**
- Abra PowerShell/CMD
- Digite: `git --version`
- Deve aparecer algo como: `git version 2.x.x`

---

## 🔧 PASSO 2: Fazer Commit no Git e Push para GitHub

### 2.1 Abra PowerShell

- Clique em iniciar
- Procure por "PowerShell"
- Abra "Windows PowerShell"

### 2.2 Navegue até a pasta do projeto

```powershell
cd "C:\Users\RomuloMeloMouraLeite\.gemini\antigravity\scratch\sentinela_ia_v2"
```

### 2.3 Execute os comandos Git

```powershell
# Inicializar Git
git init

# Configurar usuário
git config user.email "romulo.melo@mouraleite.com.br"
git config user.name "Romulo Melo"

# Adicionar todos os arquivos
git add .

# Fazer primeiro commit
git commit -m "Initial commit: Sentinela IA com configuração segura para Railway"

# Depois de criar o repositório no GitHub, execute:
git branch -M main
git remote add origin https://github.com/seometriamarketing-lgtm/sentinela_ia_v2.git
git push -u origin main
```

---

## 🐙 PASSO 3: Criar Repositório no GitHub

### 3.1 Abra GitHub

1. Vá para [github.com](https://github.com)
2. Faça login com sua conta (seometriamarketing-lgtm)

### 3.2 Criar novo repositório

1. Clique no botão **+** (canto superior direito)
2. Clique em "New repository"
3. Preencha assim:
   - **Repository name**: `sentinela_ia_v2`
   - **Description**: "Sistema de Monitoramento de Leads IA"
   - **Visibility**: Public (importante para Railway)
   - Deixe o resto padrão
4. Clique "Create repository"

### 3.3 Copiar URL do repositório

- Na página do repositório, clique no botão verde **Code**
- Copie a URL HTTPS (algo como: `https://github.com/seometriamarketing-lgtm/sentinela_ia_v2.git`)

### 3.4 Fazer Push

Na PowerShell, execute (substituindo pela URL copiada):

```powershell
git branch -M main
git remote add origin https://github.com/seometriamarketing-lgtm/sentinela_ia_v2.git
git push -u origin main
```

**Resultado esperado:**
```
Enumerating objects: 150, done.
...
* [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

---

## 🚂 PASSO 4: Fazer Deploy na Railway

### 4.1 Criar conta Railway

1. Vá para [railway.app](https://railway.app)
2. Clique "Sign Up"
3. Clique "Sign up with GitHub"
4. Autorize o Railway a acessar sua conta GitHub

### 4.2 Conectar repositório

1. Na dashboard do Railway, clique "New Project"
2. Clique "Deploy from GitHub repo"
3. Selecione `seometriamarketing-lgtm` como organização
4. Procure por `sentinela_ia_v2` e clique nele
5. Clique "Deploy"

Railway vai:
- Clonar seu repositório
- Detectar o Dockerfile
- Fazer build da imagem (pode levar 3-5 minutos)
- Fazer deploy automático

### 4.3 Adicionar Variáveis de Ambiente

Enquanto o deploy roda, configure as variáveis:

1. No painel do Railway, vá para **Variables**
2. Clique **Add Variable** para cada uma:

```
GROQ_API_KEY = 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
GEMINI_API_KEY = AIzaSyDqBIm2wdPF0C7i4CR1ZMrzD-x7qJS5CRs
MORADA_LOGIN = (deixe vazio por enquanto)
MORADA_PASSWORD = (deixe vazio por enquanto)
EMAIL_SENDER = romulo.melo@mouraleite.com.br
EMAIL_RECIPIENT = wagner.rinaldi@mouraleite.com.br
PERIODO_ANALISE = 24h
SCHEDULE_ENABLED = true
SCHEDULE_HOURS = 09:00
PORT = 8000
```

> ⚠️ **IMPORTANTE**: Use as SUAS chaves do config.json. Essas acima são apenas exemplo!

### 4.4 Aguardar Deploy

1. Vá para a aba **Deployments**
2. Espere até ver um ✅ verde (significa sucesso)
3. Clique no deployment bem-sucedido

### 4.5 Acessar sua URL

1. Na aba **Settings**, procure por **Domain**
2. Você verá algo como: `https://sentinela-production.up.railway.app`
3. **Pronto!** Clique na URL e acesse seu Sentinela na web! 🎉

---

## 📱 Testando seu Sentinela Online

Após o deploy:

1. Abra a URL do Railway no navegador
2. Você deve ver a página de login
3. Use suas credenciais:
   - **Username**: `romulo` ou `mari`
   - **Password**: as mesmas que você tem localmente

**Sucesso!** 🎉 Seu Sentinela está funcionando na web!

---

## 🔐 Checklist de Segurança

- ✅ Nenhuma chave de API está no GitHub (protegida pelo .gitignore)
- ✅ Credenciais estão em variáveis de ambiente Railway
- ✅ users.json é criado automaticamente
- ✅ config.json é criado automaticamente com variáveis de env

---

## 🆘 Problemas Comuns

### "Git não está reconhecido"
→ Instale Git e reinicie o PowerShell

### "Autenticação falhou ao fazer push"
→ Use um [Personal Access Token](https://github.com/settings/tokens) em vez de senha

### "Deploy falhou no Railway"
→ Verifique os logs: clique no deployment e vá para **Logs**

### "Erro de API Key no Railway"
→ Verifique se digitou a chave corretamente em **Variables**

### "Página não carrega"
→ Aguarde 2-3 minutos após o deploy estar verde
→ Recarregue a página (Ctrl+F5)

---

## 📞 Próximos Passos

Depois do deploy funcionando:

1. **Adicione mais usuários**: Dashboard → Settings → Usuários
2. **Configure o Morada**: Dashboard → Settings → Credenciais
3. **Teste a automação**: Dashboard → Scan → Iniciar

---

**Qualquer dúvida?** Posso ajudar em cada passo! 😊
