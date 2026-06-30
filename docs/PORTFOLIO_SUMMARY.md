# DescontoVivo UI — Resumo para Portfólio

## Título

DescontoVivo UI — Frontend Angular de portal público de promoções.

## Stack

- Angular 21 (standalone, lazy routes, signals)
- TypeScript
- SCSS (por componente)
- Keycloak/OIDC (angular-auth-oidc-client)
- Upload para Cloudflare R2 via presigned URL
- Cloudflare Pages (deploy)

## Telas principais

- Feed público com promoções aprovadas, paginação e busca.
- Detalhe de promoção com votos e comentários.
- Publicação autenticada com upload de imagem.
- Painel de moderação com edição e troca de imagem.
- Import admin por JSON batch.
- Páginas institucionais (sobre, serviços, transparência).

## Decisões visuais

- Design clean com identidade própria (não é template).
- Cards de promoção com imagem, preço, loja e indicadores.
- Hierarquia visual clara: feed como ponto central.
- Responsivo mobile-first.
- SCSS com variáveis e sem framework CSS externo.

## SEO

- `robots.txt` e `sitemap.xml` estáticos.
- `SeoService` com meta tags dinâmicas.
- Rotas públicas indexáveis; rotas privadas bloqueadas.
- Limitação atual: SPA sem SSR/prerender.

## Integração com API

- Consumo REST com HttpClient Angular.
- Interceptor injeta Bearer token automaticamente.
- Guards protegem rotas por role e estado de autenticação.
- Upload de imagem via presigned URL direto para R2.
- Promoções, votos e moderação consomem dados reais da API (sem mocks).

## Repositórios

- UI: [github.com/gabrielverasm/descontovivo-ui](https://github.com/gabrielverasm/descontovivo-ui)
- API: [github.com/gabrielverasm/descontovivo-api](https://github.com/gabrielverasm/descontovivo-api)

## Status

MVP funcional e publicado. SSR/prerender, sitemap dinâmico e testes unitários no roadmap.
