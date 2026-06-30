# DescontoVivo UI

Frontend do DescontoVivo — portal público de promoções com moderação, comunidade e foco em confiança.

Aplicação SPA para os domínios `descontovivo.com` e `descontovivo.com.br`, consumindo a [DescontoVivo API](https://github.com/gabrielverasm/descontovivo-api).

## Stack

- Angular 21 standalone (`bootstrapApplication`, sem `AppModule`).
- Angular Router com rotas lazy via `loadComponent`.
- TypeScript.
- SCSS por componente.
- Keycloak/OIDC via `angular-auth-oidc-client` (Authorization Code + PKCE).
- Upload de imagem para Cloudflare R2 via presigned URL.

## Páginas e features

| Rota | Descrição |
|------|-----------|
| `/` (home) | Feed público de promoções aprovadas com paginação e busca. |
| `/promocao/:slug` | Detalhe da promoção com votos e comentários. |
| `/publicar` | Formulário de publicação autenticada com upload de imagem. |
| `/login` | Redirect para Keycloak (OIDC). |
| `/cadastro` | Redirect para Keycloak (registro). |
| `/sobre` | Sobre o projeto. |
| `/servicos` | Serviços oferecidos. |
| `/transparencia` | Transparência e regras do portal. |
| `/moderacao/promocoes` | Painel de moderação (role `moderator`/`admin`). |
| `/admin/importar` | Import admin de promoções via JSON. |
| `/erro` | Página de erro genérico. |
| `**` | 404 Not Found. |

## Fluxos implementados

- Listagem de promoções reais da API com paginação, busca e filtros.
- Publicação autenticada com upload de imagem local para R2.
- Votação (like/dislike) em promoções.
- Contadores de comentários vindos da API; listagem/envio completo de comentários na UI está no roadmap.
- Moderação: aprovar, rejeitar, remover, editar promoção com troca de imagem.
- Import admin com validação client-side e envio batch para API.
- Troca de imagem na moderação via presigned URL.
- SEO básico: `SeoService` com meta tags dinâmicas por rota.
- Guards de autenticação, e-mail verificado, moderador e admin.
- Interceptor de token Bearer automático.

## O que NÃO está implementado

- SSR / prerender (SPA puro por enquanto).
- Sitemap dinâmico com URLs de promoções individuais.
- Worker/crawler automático de ofertas.
- Integração de afiliados finalizada.
- Testes unitários (setup de karma-jasmine pendente).

## Desenvolvimento local

### Pré-requisitos

- Node.js 24+
- npm 10+

### Setup

```bash
npm install
npm start
# Aplicação em http://localhost:4200
```

### Environment

Configurar `src/environments/environment.ts` com:

```typescript
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080/api/v1',
  oidc: {
    authority: 'http://localhost:8082/realms/descontovivo',
    clientId: 'descontovivo-ui',
    redirectUrl: 'http://localhost:4200',
    postLogoutRedirectUri: 'http://localhost:4200',
    scope: 'openid profile email',
  },
};
```

### Build

```bash
npm run build
# Output: dist/descontovivo-ui/browser
```

### Testes

```bash
npm run build          # validação principal de build
npm test -- --watch=false  # ⚠️ pode falhar se karma-jasmine não estiver configurado
```

> **Nota:** o setup de testes unitários com karma-jasmine é um problema preexistente. A validação principal do projeto é feita via `npm run build`.

## Deploy

Hospedado no Cloudflare Pages (deploy automático na branch `master`).

Arquivos estáticos em `public/`:
- `robots.txt` — regras de crawling.
- `sitemap.xml` — sitemap estático (páginas principais).
- `_headers` — headers de segurança/cache.
- `_redirects` — fallback SPA.

## SEO

- `robots.txt` com Allow/Disallow por área.
- `sitemap.xml` estático com páginas públicas.
- `SeoService` aplicando meta tags por rota (`title`, `description`, `robots`).
- Rotas públicas com `index, follow`; rotas privadas com `noindex, nofollow`.
- Limitação: SPA sem SSR/prerender — Google indexa via JavaScript rendering.

Detalhes em [`docs/SEO.md`](docs/SEO.md).

## Documentação adicional

- [Arquitetura do frontend](docs/FRONTEND_ARCHITECTURE.md)
- [SEO](docs/SEO.md)
- [Produção / Deploy](docs/PRODUCTION_FRONTEND.md)
- [Resumo para portfólio](docs/PORTFOLIO_SUMMARY.md)
- [Keycloak Theme](docs/KEYCLOAK_THEME.md)
