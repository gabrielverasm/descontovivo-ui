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

## Renderização e deploy

- `/promocoes/:slug` usa Angular SSR no Cloudflare Worker em produção.
- `/story-image` usa o proxy seguro do Worker.
- Home, páginas institucionais e demais rotas continuam sendo servidas pelo Cloudflare Pages.
- O Worker resolve internamente o asset canônico `/index.csr` nas rotas CSR conhecidas, sem expor o nome do shell nem alterar a URL pública; o shell legado `/__app-shell/` foi removido.

## O que NÃO está implementado

- Worker/crawler automático de ofertas.
- Integração de afiliados finalizada.

As URLs públicas de promoções são incluídas automaticamente no sitemap durante
o build por `scripts/generate-sitemap.mjs`.

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
# Output de assets: dist/descontovivo-ui/browser
# Output de assets do Worker: dist/descontovivo-ui/worker-assets
# Bundle do Worker: dist/descontovivo-ui/server/server.mjs
```

### Testes

```bash
npm run build          # validação principal de build
npm test -- --watch=false
```

## Deploy

O domínio continua disponível no Cloudflare Pages para home, páginas
institucionais e demais rotas. Em produção, as rotas de promoções dinâmicas e
o proxy de imagens já são atendidos pelo Worker. As antigas Pages Functions de
promoção e `story-image` e o shell `/__app-shell/` foram removidos; a migração
total do domínio para Workers está fora do escopo.

Para validar o Worker localmente:

```bash
npm run build
npx wrangler dev
```

O deploy e a associação de domínio não fazem parte deste fluxo local. Alterações
em `src/cloudflare-worker.ts` exigem publicação manual com `npx wrangler deploy`;
o deploy automático do Pages não atualiza esse Worker. O Pages continua ativo
para as rotas que não foram migradas.

Arquivos estáticos em `public/`:
- `robots.txt` — regras de crawling.
- `sitemap.xml` — sitemap estático (páginas principais).
- `_headers` — headers de segurança/cache.
- `_redirects` — redirects de domínio e rewrites explícitos das rotas CSR.

## SEO

- `robots.txt` permite crawl geral (`Allow: /`), sem Disallow.
- `sitemap.xml` estático com páginas públicas úteis.
- `SeoService` aplica meta tags por rota (`title`, `description`, `robots`).
- Rotas privadas usam `noindex, nofollow` via meta tag (controle exclusivo pelo SeoService).
- Limitação: SPA sem SSR/prerender — Google indexa via JavaScript rendering.

Detalhes em [`docs/SEO.md`](docs/SEO.md).

## Documentação adicional

- [Arquitetura do frontend](docs/FRONTEND_ARCHITECTURE.md)
- [SEO](docs/SEO.md)
- [Produção / Deploy](docs/PRODUCTION_FRONTEND.md)
- [Resumo para portfólio](docs/PORTFOLIO_SUMMARY.md)
- [Keycloak Theme](docs/KEYCLOAK_THEME.md)
# Preenchimento por marketplace

Os formulários administrativos de criação e edição exibem um único botão dinâmico
de acordo com o host da URL. Shopee está habilitada; Amazon, Mercado Livre, Magalu
e AliExpress são reconhecidos como integrações futuras. Um carregamento bem-sucedido
substitui todos os campos comerciais (inclusive com valores vazios), mas nunca salva,
aprova ou publica automaticamente.
