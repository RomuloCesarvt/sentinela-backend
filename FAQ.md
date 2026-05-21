# ❓ FAQ - Dúvidas Frequentes sobre Deploy

## Custos

### P: Render + Vercel é realmente 100% gratuito?
**R:** Sim! Tanto Render quanto Vercel oferecem planos Free permanentes:
- Render Free: $0/mês para web service + PostgreSQL
- Vercel Free: $0/mês para Next.js hosting
- Custo total: **R$ 0,00/mês** para sempre

### P: Por quanto tempo é gratuito?
**R:** **Para sempre**! Não é trial limitado. Render e Vercel têm planos Free permanentes.

### P: E se eu tiver muitos usuários?
**R:** Os planos Free têm limites:
- Render: 512MB RAM, 0.1 CPU (ok para ~50-100 users simultâneos)
- Vercel: CDN global ilimitado
- Se crescer, é upgrade para Hobby ($7/mês Render + $20/mês Vercel)

---

## Deploy & GitHub

### P: Qual repositório vou usar?
**R:** O seu: `seometriamarketing-lgtm/sentinela_ia_v2`

### P: Como funciona o deploy automático?
**R:**
1. Você faz `git push` no GitHub
2. Render detecta mudança no backend → re-deploy automático
3. Vercel detecta mudança no frontend → re-deploy automático
4. Sem fazer nada mais! 🚀

### P: Posso usar branch diferente de main?
**R:** Sim! Configure no dashboard:
- Render: Service Settings → Automatic Deploy
- Vercel: Git → Production Branch

### P: Quanto tempo leva para fazer deploy?
**R:**
- Render Backend: ~2-3 minutos
- Vercel Frontend: ~2-5 minutos
- Você verá o progresso no dashboard

---

## Performance & Recursos

### P: Vai ser lento com Render Free?
**R:** Não! Render Free é bom para:
- ✅ Até ~100 usuários simultâneos
- ✅ Queries simples ao banco
- ✅ Análises de IA (Groq/Gemini)

**Pode ficar lento se:**
- ❌ Muitos usuários (>500 simultâneos)
- ❌ Muitas análises em paralelo

### P: E se dormir depois de 15 min?
**R:** Render Free "dorme" após 15 min inatividade:
- Primeiro request acordará o service (espera ~5s)
- Depois volta ao normal
- Você vê isso como latência na primeira requisição

### P: PostgreSQL Free tem limite de dados?
**R:** Sim:
- 1GB de armazenamento
- 100 conexões simultâneas
- Bom para ~10k-50k leads
- Se crescer, upgrade para $19/mês

---

## Configuração

### P: Onde coloco API Keys?
**R:** **NUNCA no Git!** Use:
1. Render Dashboard → Environment Variables
2. Vercel Dashboard → Settings → Environment Variables
3. Valores secretos NÃO vão para GitHub

### P: Preciso alterar código para produção?
**R:** Não! O mesmo código funciona em dev/produção:
- Backend lê `DATABASE_URL` e outras vars
- Frontend lê `NEXT_PUBLIC_API_URL`
- Tudo via variáveis de ambiente

### P: Como funciona .env.example?
**R:**
- `.env.example` → vai no Git (sem valores)
- `.env` → NÃO vai no Git (.gitignore)
- Em produção: Render/Vercel injetam values no runtime

---

## Problemas Comuns

### P: Backend não inicia no Render
**R:** Verifique:
1. Logs: Render Dashboard → sentinela-backend → Logs
2. Variáveis ambiente: tá tudo preenchido?
3. Dockerfile: está correto?
4. `pip install requirements.txt` funciona localmente?

### P: Frontend não conecta ao backend
**R:** Verifique:
1. `NEXT_PUBLIC_API_URL` está correto em Vercel?
2. Backend está online? (test: https://sentinela-backend.render.com/docs)
3. DevTools Console (F12) → vê erro CORS?
4. Firewall bloqueando request?

### P: Login não funciona
**R:** Verifique:
1. Backend rodando? (acesse /docs do backend)
2. PostgreSQL conectado? (verifique DATABASE_URL)
3. Users foram criados? (init_users.py rodou?)
4. Check logs do backend

### P: Leads não aparecem
**R:** Verifique:
1. Credenciais Morada corretas? (MORADA_LOGIN/PASSWORD)
2. Rodou o scan? (POST /api/scan)
3. PostgreSQL tem dados? (check logs)
4. Frontend consegue ver banco? (GET /api/leads)

### P: "502 Bad Gateway"
**R:** Render está iniciando. Espere 2-3 min e recarregue.

---

## Segurança

### P: Meus dados estarão seguro?
**R:** Sim! Segurança em produção:
- ✅ HTTPS/TLS automático (Vercel + Render)
- ✅ Banco de dados isolado (PostgreSQL)
- ✅ Firewall automático (Render)
- ✅ API Keys em variáveis (não no Git)
- ✅ Senha admin deve ser alterada após login

### P: Como altero senha admin?
**R:** Dashboard → Settings → Users → Edit Admin

### P: Alguém pode ver minhas API Keys?
**R:** Não! Elas ficam em:
- Render Dashboard (criptografado)
- Vercel Dashboard (criptografado)
- Nunca no Git

### P: Como faço backup do PostgreSQL?
**R:** Render faz automaticamente. Para download:
1. Render → Database → Actions → Backups
2. Ou use: `pg_dump` (se souber SQL)

---

## Domínios

### P: Como adicionar domínio customizado?
**R:** 
**Frontend (Vercel):**
1. Vercel → seu projeto → Settings → Domains
2. Adicione seu domínio
3. Siga instruções de DNS

**Backend (Render):**
1. Render → seu service → Settings → Custom Domain
2. Siga instruções de DNS

### P: Preciso pagar por domínio?
**R:** 
- Domínio `.com.br` → ~R$ 30-60/ano (Registro.br)
- Deploy em Render/Vercel → R$ 0,00
- Certo que vale a pena!

---

## Monitoramento

### P: Como saber se está tudo ok?
**R:**
- Vercel Dashboard: sempre mostra status
- Render Dashboard: sempre mostra status
- Ambos têm status page: https://www.renderstatus.com / https://www.vercelstatus.com

### P: Como monitora performance?
**R:**
- Vercel: Analytics (Performance)
- Render: Metrics (CPU, Memory, Disk)
- Frontend: Lighthouse (Chrome DevTools)

### P: Como vejo logs?
**R:**
- Vercel: Deployments → Logs
- Render: Service → Logs (real-time)
- Ambos salvam histórico

---

## Escalabilidade

### P: E se crescer muito (1000 users)?
**R:** Upgrade para:
- Render: Hobby ($7/mês) ou Pro ($25/mês)
- Vercel: Pro ($20/mês) - mais features
- PostgreSQL: Basic ($19/mês) ou Pro ($55/mês)
- Custo total estimado: ~R$ 100-200/mês

### P: Posso usar banco de dados diferente?
**R:** Sim! Mas precisa de upgrade:
- Railway: Pago
- Supabase: ~R$ 25-50/mês
- AWS RDS: ~R$ 50-100/mês

Mas PostgreSQL Free + Render é a melhor relação custo-benefício!

---

## Suporte

### P: E se tiver problema?
**R:**
1. Leia: [DEPLOY_RENDER_VERCEL.md](./DEPLOY_RENDER_VERCEL.md)
2. Verifique logs no dashboard
3. Teste localmente: `python backend/main.py`
4. Abre issue no GitHub

### P: Render/Vercel tem suporte?
**R:**
- Render: Email support (Free) + Chat (Pro)
- Vercel: Community (Free) + Premium Support (Pro)
- Para começar, Free é ok!

### P: Quanto tempo leva resposta de suporte?
**R:**
- Render: ~24h (Free)
- Vercel: ~1h (Free, community)
- Produção = upgrade para Pro

---

## Dicas Finais

### 10 Regras de Ouro:

1. ✅ **NUNCA commit `.env`** - use .gitignore
2. ✅ **Altere senha admin** após primeiro login
3. ✅ **Teste localmente** antes de fazer push
4. ✅ **Monitore logs** regularmente
5. ✅ **Faça backup** do PostgreSQL
6. ✅ **Use HTTPS** sempre (Render/Vercel já fazem)
7. ✅ **Guarde API Keys** seguras (não compartilhe)
8. ✅ **Deploy frequente** (CI/CD automático funciona!)
9. ✅ **Verifique performance** no Vercel Analytics
10. ✅ **Leia os docs** se tiver dúvida!

---

**Última atualização**: 2026-04-13  
**Status**: ✅ Pronto para Produção  
**Custo**: R$ 0,00/mês
