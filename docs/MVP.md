# DescontoVivo MVP — Estado Atual

## Objetivo

Portal público de promoções com moderação, comunidade e foco em confiança. Usuários publicam ofertas, moderadores aprovam, e o feed exibe apenas conteúdo verificado.

## O que está implementado

- Feed público com promoções aprovadas (paginação, busca, filtros).
- Página de detalhe da promoção com votos e contadores de comentários.
- Publicação autenticada com upload de imagem para Cloudflare R2.
- Login e cadastro via Keycloak/OIDC (Authorization Code + PKCE).
- Painel de moderação: aprovar, rejeitar, remover, editar promoção com troca de imagem.
- Import admin por JSON batch.
- SEO básico: `SeoService`, `robots.txt`, `sitemap.xml` estático.
- Guards (auth, email-verified, moderator, admin) e interceptor Bearer.
- Deploy automático via Cloudflare Pages.

## Parcialmente implementado

- Comentários: contadores vindos da API; listagem/envio completo na UI está no roadmap.

## Fora do escopo atual

- SSR / prerender.
- Sitemap dinâmico com URLs de promoções.
- Worker/crawler automático de ofertas.
- Integração de afiliados.
- Testes unitários (setup karma-jasmine pendente).

## Stack

- Angular 21 standalone (`bootstrapApplication`, lazy routes via `loadComponent`).
- TypeScript.
- SCSS por componente.
- `angular-auth-oidc-client` para OIDC.
- Cloudflare Pages (hosting).

## Arquitetura

- `src/app/core/` — services, guards, interceptors, models, utils.
- `src/app/features/` — páginas e fluxos por domínio.
- `src/app/shared/` — componentes reutilizáveis.
- `src/app/layouts/` — layouts de página.

## Validação

```bash
npm run build    # validação principal
```
