# Cartinhas dos jogadores

## Preferido: upload no app
No cadastro/edição do jogador, use **Adicionar foto** / **Trocar foto**.
A imagem vai para o Supabase Storage. Sem foto → `default.png`.

## Legado (opcional)
Ainda funciona colocar um PNG estático aqui pelo nome sanitizado:

| Nome no app   | Arquivo esperado      |
|---------------|-----------------------|
| Gabri         | `gabri.png`           |
| João Silva    | `joao silva.png`      |

Regras do legado: minúsculas, sem acentos, espaços preservados, extensão `.png`.
