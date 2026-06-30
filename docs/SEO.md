# SEO — DescontoVivo UI

## Visão geral

O DescontoVivo UI é uma SPA Angular. A estratégia de SEO atual é baseada em:

1. Arquivo `robots.txt` com regras de crawling.
2. Arquivo `sitemap.xml` estático com páginas públicas.
3. `SeoService` que aplica meta tags dinamicamente por rota.
4. Configuração de `index/noindex` por rota.

## robots.txt

Localização: `public/robots.txt`

```txt
User-agent: *
Allow: /

Disallow: /admin/
Disallow: /moderacao/
Disallow: /login
Disallow: /cadastro
Disallow: /erro

Sitemap: https://descontovivo.com/sitemap.xml
```

Áreas privadas e de autenticação são bloqueadas para crawlers.

## sitemap.xml

Localização: `public/sitemap.xml`

Sitemap estático com páginas principais:
- `/` (home/feed)
- `/sobre`
- `/servicos`
- `/transparencia`
- `/publicar`

> **Limitação atual:** o sitemap não inclui URLs dinâmicas de promoções individuais (`/promocao/:slug`). Isso requer geração server-side ou build-time.

## SeoService

Serviço Angular (`src/app/core/services/seo.service.ts`) que atualiza:

- `<title>` da página.
- `<meta name="description">`.
- `<meta name="robots">` (`index, follow` ou `noindex, nofollow`).

Cada rota define seus metadados via `data` no router.

## Regras de indexação

| Rota | robots |
|------|--------|
| `/` (home) | `index, follow` |
| `/promocao/:slug` | `index, follow` |
| `/sobre` | `index, follow` |
| `/servicos` | `index, follow` |
| `/transparencia` | `index, follow` |
| `/publicar` | `index, follow` |
| `/login` | `noindex, nofollow` |
| `/cadastro` | `noindex, nofollow` |
| `/moderacao/*` | `noindex, nofollow` |
| `/admin/*` | `noindex, nofollow` |
| `/erro` | `noindex, nofollow` |

## Limitações (SPA sem SSR)

- Googlebot processa JavaScript, mas com atraso e sem garantia de fidelidade.
- Meta tags são injetadas via JavaScript — crawlers simples não as veem.
- Open Graph / Twitter Cards dependem de renderização JavaScript ou SSR/prerender.
- Sem prerender, ferramentas de preview (WhatsApp, Telegram, etc.) podem não mostrar cards corretos.

## Próximos passos

- [ ] Submeter sitemap ao Google Search Console.
- [ ] Implementar sitemap dinâmico com URLs de promoções (gerado pela API ou em build-time).
- [ ] Avaliar SSR via Angular Universal ou prerender de rotas estáticas.
- [ ] Adicionar JSON-LD (structured data) para promoções.
- [ ] Validar rendering com Google Search Console URL Inspector.
- [ ] Avaliar prerender para Open Graph/Twitter Cards em rotas de detalhe.
