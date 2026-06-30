# Textos para GitHub e Portfólio — DescontoVivo

## 1. Descrição curta (1 frase)

Portal público de promoções com moderação, comunidade e imagens seguras — Angular + Quarkus + Keycloak + Cloudflare R2.

## 2. Descrição média (1 parágrafo)

DescontoVivo é um portal de promoções onde usuários publicam ofertas que passam por moderação antes de aparecerem no feed público. O backend (Java/Quarkus) gerencia promoções, votos, comentários, upload de imagens para Cloudflare R2 e autenticação via Keycloak. O frontend (Angular) oferece uma interface clean com feed paginado, busca, publicação autenticada, painel de moderação e SEO básico. Todo o fluxo de imagens é seguro: sem hotlinks externos, com processamento server-side e armazenamento próprio.

## 3. Descrição para README/GitHub (bullets)

- 🛒 Portal público de promoções com feed moderado e comunidade.
- 🔐 Autenticação via Keycloak/OIDC com roles (user, moderator, admin).
- 🖼️ Pipeline seguro de imagens: upload via presigned URL → processamento → Cloudflare R2.
- ⚡ Backend Java 25 + Quarkus 3.33 com PostgreSQL, Flyway e testes automatizados.
- 🎨 Frontend Angular 21 standalone com SCSS, lazy routes e SEO básico.

## 4. Texto para portfólio pessoal

### Problema

Portais de promoções existentes misturam conteúdo não verificado com ofertas reais, gerando desconfiança. Imagens são frequentemente hotlinks que quebram, e não há controle de qualidade antes da publicação.

### Solução

DescontoVivo: portal com moderação obrigatória, onde toda promoção é revisada antes de aparecer publicamente. Imagens passam por pipeline próprio (download, resize, WebP, R2) — nunca dependem de hotlinks externos. Autenticação robusta via Keycloak com roles diferenciadas.

### Stack

- **Backend:** Java 25, Quarkus 3.33, PostgreSQL, Flyway, Panache, Keycloak/OIDC, Cloudflare R2.
- **Frontend:** Angular 21, TypeScript, SCSS, angular-auth-oidc-client, Cloudflare Pages.
- **Infra:** Docker, Caddy (reverse proxy), Keycloak self-hosted, Cloudflare (DNS, R2, Pages).

### Responsabilidades

- Arquitetura completa (backend + frontend + infra).
- Modelagem de domínio com separação hexagonal pragmática.
- Pipeline de imagens com SSRF protection.
- Fluxo de moderação com audit trail.
- SEO básico para SPA (robots, sitemap, meta tags dinâmicas).
- Testes automatizados com Testcontainers.
- Deploy e configuração de produção.

### Aprendizados

- Separar status de moderação de disponibilidade da oferta simplifica regras de negócio.
- Presigned URL + promoção de imagem é mais seguro que aceitar URLs externas.
- Monólito modular atende bem o MVP sem complexidade prematura de microsserviços.
- Keycloak como IdP externo elimina toda a complexidade de auth no código da aplicação.
- SSRF protection é essencial quando o backend baixa recursos de URLs fornecidas pelo usuário.

## 5. Topics sugeridos para GitHub — API

```
java quarkus postgresql keycloak cloudflare-r2 rest-api openapi backend portfolio-project
```

## 6. Topics sugeridos para GitHub — UI

```
angular typescript scss keycloak seo cloudflare-r2 frontend portfolio-project
```

## 7. Checklist manual pós-merge

- [ ] Conferir README renderizado no GitHub (API e UI).
- [ ] Conferir links internos (docs/) nos READMEs.
- [ ] Adicionar descrição do repositório no GitHub (Settings → About).
- [ ] Adicionar topics sugeridos no GitHub (Settings → About).
- [ ] Conferir badges, se houver.
- [ ] Adicionar screenshots/GIFs depois do deploy final.
- [ ] Atualizar portfólio pessoal com textos da seção 4.
