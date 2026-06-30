# TODO DescontoVivo UI

Checklist de evolução do projeto.

## Concluído

- [x] Angular 21 standalone com `bootstrapApplication`.
- [x] Estrutura: `core`, `shared`, `layouts`, `features`.
- [x] Rotas lazy com `loadComponent`.
- [x] Feed público com promoções reais da API (paginação, busca).
- [x] Detalhe da promoção com votos.
- [x] Publicação autenticada com upload de imagem para R2.
- [x] Login/cadastro via Keycloak/OIDC.
- [x] Guards: auth, email-verified, moderator, admin.
- [x] Interceptor Bearer automático.
- [x] Painel de moderação (aprovar, rejeitar, remover, editar com troca de imagem).
- [x] Import admin por JSON batch.
- [x] SEO básico: SeoService, robots.txt, sitemap.xml estático.
- [x] Deploy Cloudflare Pages.
- [x] Remoção de mocks — produção consome API real.
- [x] Páginas institucionais (sobre, serviços, transparência).
- [x] Páginas de erro (404, erro genérico).

## Próximo foco

- [ ] Listagem e envio completo de comentários na UI.
- [ ] Limpeza de SCSS budgets (warnings de build).
- [ ] Setup de testes unitários (karma-jasmine ou migrar para Jest/Vitest).
- [ ] Sitemap dinâmico com URLs de promoções.
- [ ] SSR / prerender para SEO e Open Graph.
- [ ] JSON-LD structured data para promoções.
- [ ] Dashboard admin melhorado.
- [ ] Integração de afiliados.
- [ ] Notificações para autores (promoção aprovada/rejeitada).

## Qualidade técnica

- [ ] Resolver warnings de SCSS budget no build.
- [ ] Configurar linting (ESLint + Angular rules).
- [ ] Configurar formatter (Prettier).
- [ ] Configurar testes unitários funcionando.
- [ ] CI com validação de build + lint em PRs.

## Decisões de produto

- [x] Home `/` é o feed principal.
- [x] `/promocoes` redireciona para `/`.
- [x] Toda promoção publicada entra como `PENDING_REVIEW`.
- [x] Feed exibe apenas promoções `PUBLISHED`.
