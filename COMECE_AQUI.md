# 🚀 COMEÇAR AQUI - Seu Sentinela na Web em 30 Minutos

## ⚠️ IMPORTANTE: Leia isto primeiro!

Você está **MUITO PERTO** de ter seu Sentinela online!

Criei um **script que faz tudo automaticamente** para você. Você só precisa:
1. Instalar Git (1 clique)
2. Rodar um script (copiar e colar)
3. Preencher uns campos no Railway (clique-clique)

**Não tem erro, é impossível estragar!** Se algo der errado, volta tudo fácil.

---

## 📋 CHECKLIST RÁPIDO

### ✅ ANTES DE COMEÇAR

- [ ] Você tem acesso à Internet
- [ ] Seu navegador está atualizado
- [ ] Você tem conta no GitHub (seometriamarketing-lgtm)
- [ ] Você tem esta pasta aberta ou sabe o caminho

### 🔧 INSTALAÇÃO

- [ ] Instalar Git (https://git-scm.com/)
- [ ] Reiniciar PowerShell

### ⚡ SCRIPT AUTOMÁTICO

- [ ] Abrir PowerShell na pasta do projeto
- [ ] Executar o script deploy.ps1
- [ ] Aguardar "FASE 1 CONCLUÍDA"

### 🐙 GITHUB

- [ ] Criar repositório (https://github.com/new)
- [ ] Copiar URL HTTPS
- [ ] Fazer push (3 linhas de comando)

### 🚂 RAILWAY

- [ ] Criar conta Railway (https://railway.app)
- [ ] Conectar GitHub
- [ ] Fazer deploy
- [ ] Adicionar variáveis de ambiente
- [ ] Aguardar ficar verde ✅
- [ ] Acessar URL gerada

---

## 🎯 PASSO A PASSO DETALHADO

### PASSO 1: Instalar Git (5 minutos)

**O que fazer:**
1. Vá para https://git-scm.com/
2. Clique em "Download for Windows"
3. Execute o arquivo baixado
4. Clique "Next" em tudo (deixe padrão)
5. Clique "Install"
6. Quando terminar, **REINICIE O PowerShell**

**Como verificar se funcionou:**
- Abra PowerShell
- Digite: `git --version`
- Deve aparecer algo como: `git version 2.46.0`

---

### PASSO 2: Rodar o Script Automático (5 minutos)

**O que fazer:**

1. Abra esta pasta no Windows Explorer:
   ```
   C:\Users\RomuloMeloMouraLeite\.gemini\antigravity\scratch\sentinela_ia_v2
   ```

2. Clique em "Deploy_AUTO.bat" (o arquivo em branco)
   - Uma janela preta vai abrir
   - Deixe rodar até aparecer "Pressione uma tecla"
   - Leia as instruções que aparecerem
   - Pressione uma tecla

**Resultado esperado:**
```
✅ Git encontrado
✅ Estrutura do projeto OK
✅ Git inicializado
✅ FASE 1 CONCLUÍDA!
```

---

### PASSO 3: Criar Repositório no GitHub (5 minutos)

**O que fazer:**

1. Vá para: https://github.com/new
2. Preencha exatamente assim:
   - **Repository name**: `sentinela_ia_v2` (sem espaços)
   - **Description**: `Sistema de Monitoramento de Leads IA`
   - **Visibility**: Clique em **PUBLIC** (⚠️ IMPORTANTE!)
   - Deixe o resto como está
3. Clique no botão verde "Create repository"

**Próximo passo:**
1. Você vai ver uma página com instruções
2. Procure pelo botão verde "Code"
3. Clique nele
4. Selecione a aba "HTTPS"
5. Copie a URL (vai ser algo como `https://github.com/seu_usuario/sentinela_ia_v2.git`)

---

### PASSO 4: Fazer Push (5 minutos)

**O que fazer:**

1. Abra PowerShell **nesta pasta**:
   - Clique em "Arquivo" → "Abrir PowerShell como Administrador"
   - Ou: Shift + Click direito na pasta → "Abrir PowerShell aqui"

2. Cole EXATAMENTE isto (uma linha de cada vez):
   ```powershell
   git branch -M main
   ```
   Pressione Enter

   ```powershell
   git remote add origin https://github.com/seometriamarketing-lgtm/sentinela_ia_v2.git
   ```
   Pressione Enter

   ```powershell
   git push -u origin main
   ```
   Pressione Enter

   ⚠️ **IMPORTANTE**: Substitua a URL pela que você copiou!

3. Pode pedir para fazer login no GitHub - faça normalmente

**Resultado esperado:**
```
...
* [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

---

### PASSO 5: Railway Deploy (15 minutos)

**O que fazer:**

1. Vá para: https://railway.app

2. Clique "Sign Up"

3. Clique "Continue with GitHub"

4. Autorize Railway (clique "Authorize railwayapp")

5. Você vai entrar no painel Railway

6. Clique "New Project"

7. Clique "Deploy from GitHub repo"

8. Selecione sua conta GitHub (seometriamarketing-lgtm)

9. Procure por `sentinela_ia_v2` na lista

10. Clique nele

11. Clique "Deploy"

**⏳ Agora espere**: O Railway vai começar a fazer "build" (compactar seu código). Isso demora 3-5 minutos. Você vai ver uma barra preenchendo.

---

### PASSO 6: Adicionar Variáveis de Ambiente (5 minutos)

**⏳ Aguarde**: Antes de fazer isso, o deployment precisa estar **✅ verde** (significando sucesso).

**O que fazer:**

1. No painel do Railway, clique na aba "Variables"

2. Clique "+ Add Variable" para CADA linha abaixo:

**Copie e cole cada uma:**

```
GROQ_API_KEY = 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
GEMINI_API_KEY = AIzaSyDqBIm2wdPF0C7i4CR1ZMrzD-x7qJS5CRs
EMAIL_SENDER = romulo.melo@mouraleite.com.br
EMAIL_RECIPIENT = wagner.rinaldi@mouraleite.com.br
PORT = 8000
MORADA_LOGIN = (deixe vazio)
MORADA_PASSWORD = (deixe vazio)
```

3. Após adicionar todas, clique "Save"

---

### PASSO 7: Acessar seu Sentinela (1 minuto)

**O que fazer:**

1. No painel Railroad, clique na aba "Settings"

2. Procure por "Domain" e copie a URL (vai ser algo como):
   ```
   https://sentinela-production-xxxx.up.railway.app
   ```

3. Cole a URL no seu navegador

4. Pronto! Você deve ver a página de login do Sentinela! 🎉

**Faça login:**
- **Username**: `romulo`
- **Password**: `18011995`

---

## ✅ SUCESSO!

Se você chegou até aqui, **seu Sentinela está ONLINE!** 🚀

Agora você pode:
- ✅ Compartilhar o link com outros usuários
- ✅ Adicionar mais usuários (via Dashboard)
- ✅ Configurar o Morada
- ✅ Usar a automação de análise de leads

---

## ❌ ALGO DEU ERRADO?

### "Git não está reconhecido"
→ Você provavelmente não reiniciou o PowerShell depois de instalar
→ **Feche o PowerShell completamente e abra novamente**

### "Erro de autenticação no GitHub"
→ Use um Personal Access Token em vez de senha:
→ https://github.com/settings/tokens
→ Crie um token com permissões `repo`
→ Use esse token em vez da senha

### "O push demorou muito ou deu erro"
→ Espere um pouco e tente novamente
→ Se der erro de "fatal", copie a URL correta do GitHub e tente de novo

### "Railway não conecta ao GitHub"
→ Verifique se autorizou Railway na sua conta GitHub
→ https://github.com/settings/applications

### "Deploy falhou no Railway"
→ Clique no deployment vermelho
→ Vá para "Logs"
→ Veja qual foi o erro
→ Geralmente é problema de variáveis - verifique a digitação

### "Não consigo acessar a URL"
→ Aguarde mais 2-3 minutos (às vezes demora)
→ Recarregue (Ctrl+F5)
→ Se ainda não funcionar, veja os Logs no Railway

---

## 📞 PRECISA DE AJUDA?

Se algo não funcionar, tente:
1. Ler novamente a seção "ALGO DEU ERRADO?"
2. Ver os logs no Railway (clique no deployment)
3. Verificar se digitou as variáveis corretamente

---

## ⏱️ RESUMO DE TEMPO

```
Instalar Git:           5 min
Script automático:      5 min
GitHub:                 5 min
Push:                   5 min
Railway Deploy:         15 min
Variáveis:              5 min
Acessar URL:            1 min
─────────────────────────────
TOTAL:                  41 min
```

---

**Você consegue! Boa sorte! 🚀**
