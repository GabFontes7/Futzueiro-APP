# FUTZUEIRO-APP

PWA mobile-first para organizar rachas de futebol. **Online-first** — Supabase é a única fonte da verdade.

**App:** https://futzueiro-app.vercel.app  
**Manual do usuário:** **[MANUAL.md](./MANUAL.md)**

## Stack

- React + Vite + TypeScript + Tailwind CSS
- Framer Motion · Lucide · canvas-confetti
- Supabase (jogadores, presença, sorteios, histórico, votação)
- LocalStorage **somente** para Device ID (voto único)

## Setup

```bash
npm install
copy .env.example .env
# preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev
```

### Supabase + Vercel (do zero)

Siga o guia completo: **[DEPLOY.md](./DEPLOY.md)**

Resumo:

1. Criar projeto no Supabase e rodar `supabase/schema.sql`
2. Copiar URL + anon key
3. Subir o código no GitHub
4. Importar na Vercel e colar as mesmas variáveis de ambiente
5. Deploy → usar o link `*.vercel.app` no grupo

## Fluxo

Jogadores → Presença/Modalidade → Sorteio (pack opening) → Resumo (WhatsApp) → Finalizar → Votação → Bola de Ouro (placar do ano)

## PWA

Nome de instalação: **Futzueiro App** · ícone = logo do escudo.
