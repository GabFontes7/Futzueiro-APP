# Deploy — Futzueiro App (Vercel + Supabase)

Guia completo do zero. Ordem recomendada: **1) Supabase → 2) GitHub → 3) Vercel**.

---

## 1. Criar o projeto no Supabase

1. Acesse [https://supabase.com](https://supabase.com) e faça login (GitHub/Google).
2. **New project**
   - Nome: `futzueiro` (ou similar)
   - Senha do banco: guarde em local seguro
   - Região: a mais próxima (ex.: South America)
3. Aguarde o projeto ficar **Ready**.

### 1.1 Rodar o schema SQL

1. No menu: **SQL Editor** → **New query**
2. Abra o arquivo do projeto: `supabase/schema.sql`
3. Copie **todo** o conteúdo → cole no editor → **Run**
4. Se aparecer sucesso (Success), as tabelas `players`, `racha_session`, `matches`, `votes` e `golden_ball_points` estão prontas.

> **Atualização (fotos):** se o projeto já existia, rode também
> `supabase/migrations/20260807150000_player_photos.sql` no SQL Editor
> (cria coluna `photo_url` + bucket `player-photos`).
>
> **Atualização (partida/gols):** rode também
> `supabase/migrations/20260807180000_partida_goals.sql`
> (cria `match_days`, `pitch_games`, `goals` — Chuteira de Ouro).

### 1.2 Copiar as chaves da API

1. **Project Settings** (ícone de engrenagem) → **API**
2. Anote:
   - **Project URL** → vira `VITE_SUPABASE_URL`
   - **anon public** key → vira `VITE_SUPABASE_ANON_KEY`

> Nunca use a chave `service_role` no frontend.

---

## 2. Testar localmente (opcional, mas recomendado)

No terminal, na pasta do projeto:

```bash
npm install
copy .env.example .env
```

Edite o `.env`:

```env
VITE_SUPABASE_URL=https://SEU_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

```bash
npm run dev
```

Abra o link do Vite (ex.: `http://localhost:5173`) e cadastre um jogador. Se salvar, o Supabase está ok.

---

## 3. Subir o código para o GitHub

Se ainda não for um repositório Git só deste app:

```bash
git init
git add .
git commit -m "Initial commit: Futzueiro App"
```

Crie um repositório vazio no GitHub (ex.: `Futzueiro-App`) e:

```bash
git remote add origin https://github.com/SEU_USUARIO/Futzueiro-App.git
git branch -M main
git push -u origin main
```

> Confirme que `.env` **não** foi commitado (já está no `.gitignore`).

---

## 4. Publicar na Vercel

1. Acesse [https://vercel.com](https://vercel.com) e entre com a **mesma conta GitHub**.
2. **Add New…** → **Project**
3. Importe o repositório `Futzueiro-App`
4. A Vercel deve detectar **Vite** automaticamente:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. **Antes de Deploy**, abra **Environment Variables** e adicione:

| Name | Value | Environments |
|------|--------|--------------|
| `VITE_SUPABASE_URL` | URL do Supabase | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | anon key do Supabase | Production, Preview, Development |

6. Clique em **Deploy** e aguarde o build.

### 4.1 Link do app

Ao terminar, a Vercel mostra algo como:

`https://futzueiro-app.vercel.app`

Esse é o link para mandar no grupo / instalar como PWA no celular.

---

## 5. Conferir depois do deploy

1. Abra o link no celular
2. Cadastre um jogador em **Jogadores**
3. Em outro aparelho/aba anônima, atualize — o jogador deve aparecer (realtime/Supabase)
4. No Chrome/Safari do celular: **Adicionar à tela inicial** → ícone do escudo, nome **Futzueiro App**

---

## 6. Atualizações futuras

Cada `git push` na `main` gera um novo deploy automático na Vercel.

Se mudar variáveis de ambiente na Vercel: **Settings → Environment Variables** → salve → **Redeploy**.

---

## Arquivos deste projeto ligados ao deploy

| Arquivo | Função |
|---------|--------|
| `vercel.json` | SPA: todas as rotas → `index.html` |
| `.env.example` | Modelo das variáveis (sem segredos) |
| `supabase/schema.sql` | Banco + RLS + realtime |
| `vite.config.ts` | Build Vite + PWA (manifest/ícones) |

---

## Problemas comuns

**Tela “Supabase não configurado”**  
→ Variáveis não estão na Vercel ou faltou Redeploy depois de salvar.

**Build ok, mas dados não salvam**  
→ Schema SQL não foi rodado, ou URL/key errados.

**Rotas 404 ao atualizar a página**  
→ Confirme que `vercel.json` está no repositório (rewrites para SPA).

**Votação não funciona entre celulares**  
→ Confirme Realtime no schema e que todos usam o **mesmo** link da Vercel.
