# SEO — DescontoVivo UI

## Visão geral

O DescontoVivo UI é uma SPA Angular. A estratégia de SEO atual é baseada em:

1. Arquivo `robots.txt` que permite rastreamento geral.
2. Arquivo `sitemap.xml` estático com páginas públicas úteis.
3. `SeoService` que aplica meta tags dinamicamente por rota.
4. Controle de `index/noindex` exclusivamente via meta tag `robots` por rota.

## Estratégia de controle de indexação

- `robots.txt` permite crawl irrestrito (`Allow: /`).
- Rotas privadas ou inúteis usam `<meta name="robots" content="noindex, nofollow">` via `SeoService`.
- `sitemap.xml` lista apenas páginas públicas úteis.
- Páginas privadas (login, cadastro, admin, moderação, erro) **não** entram no sitemap.

> **Por que não usar Disallow?** Se o crawler não puder rastrear a página, ele não verá a meta `noindex`. O resultado é que a URL pode permanecer indexada por inferência. Permitindo o crawl e servindo `noindex`, o Google remove a URL do índice de forma confiável.

## robots.txt

Localização: `public/robots.txt`

```txt
User-agent: *
Allow: /

Sitemap: https://descontovivo.com/sitemap.xml
```

## sitemap.xml

Localização: `public/sitemap.xml`

O sitemap contém:
- `/` (home/feed)
- `/sobre/`, `/servicos/`, `/transparencia/`, `/privacidade/` e `/termos/` (páginas institucionais finais, com barra)
- URLs públicas de promoções no formato `/promocoes/:slug`, geradas automaticamente pelo script `scripts/generate-sitemap.mjs`.

## SeoService

Serviço Angular (`src/app/core/services/seo.service.ts`) que atualiza:

- `<title>` da página.
- `<meta name="description">`.
- `<meta name="robots">` (`index, follow` ou `noindex, nofollow`).

Cada rota define seus metadados via `data` no router.

## Regras de indexação por rota

| Rota | meta robots | Motivo |
|------|-------------|--------|
| `/` (home) | `index, follow` | Página pública principal |
| `/promocoes/:slug` | `index, follow` | Conteúdo público |
| `/sobre/` | `index, follow` | Página institucional |
| `/servicos/` | `index, follow` | Página institucional |
| `/transparencia/` | `index, follow` | Página institucional |
| `/publicar` | `index, follow` | Formulário público |
| `/login` | `noindex, nofollow` | Redirect OIDC, sem conteúdo útil |
| `/cadastro` | `noindex, nofollow` | Redirect OIDC, sem conteúdo útil |
| `/moderacao/*` | `noindex, nofollow` | Área restrita |
| `/admin/*` | `noindex, nofollow` | Área restrita |
| `/erro` | `noindex, nofollow` | Página de erro |
| `**` (404) | `noindex, nofollow` | Página não encontrada |

## Validação pós-deploy

1. `curl -s https://descontovivo.com/robots.txt` — confirmar que não há Disallow.
2. Abrir `/login` no DevTools → verificar `<meta name="robots" content="noindex, nofollow">`.
3. Submeter sitemap no Google Search Console.
4. Usar URL Inspector no Search Console para validar rendering de rotas públicas.

## Limitações (SPA sem SSR)

- Googlebot processa JavaScript, mas com atraso e sem garantia de fidelidade.
- Meta tags são injetadas via JavaScript — crawlers simples não as veem.
- Open Graph / Twitter Cards dependem de renderização JavaScript ou SSR/prerender.
- Sem prerender, ferramentas de preview (WhatsApp, Telegram, etc.) podem não mostrar cards corretos.

## Próximos passos

- [ ] Submeter sitemap ao Google Search Console.
- [ ] Manter a geração automática do sitemap com as URLs públicas de promoções.
- [ ] Avaliar SSR via Angular Universal ou prerender de rotas estáticas.
- [ ] Validar JSON-LD (structured data) das promoções.
- [ ] Validar rendering com Google Search Console URL Inspector.
- [ ] Avaliar prerender para Open Graph/Twitter Cards em rotas de detalhe.
