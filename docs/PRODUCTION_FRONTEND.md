# Produção — Frontend (Cloudflare Pages)

## Hospedagem

| Item | Valor |
|------|-------|
| Plataforma | Cloudflare Pages |
| Projeto | `descontovivo-ui` |
| Branch de produção | `master` |
| Build command | `npm run build` |
| Output directory | `dist/descontovivo-ui/browser` |
| Node version | 24.16.0 |

## Domínios

| Domínio | Papel |
|---------|-------|
| `https://descontovivo.com` | Canônico (produção) |
| `https://www.descontovivo.com` | Redireciona 301 → canônico |
| `https://descontovivo.com.br` | Redireciona 301 → canônico |
| `https://www.descontovivo.com.br` | Redireciona 301 → canônico |

## Serviços de Backend

| Serviço | URL |
|---------|-----|
| API | `https://api.descontovivo.com/api/v1` |
| Keycloak (Auth) | `https://auth.descontovivo.com/realms/descontovivo` |
| Client OIDC | `descontovivo-ui` |

## Domínios a configurar no Keycloak

### Valid Redirect URIs

- `https://descontovivo.com/*`
- `https://www.descontovivo.com/*`
- `https://descontovivo.com.br/*`
- `https://www.descontovivo.com.br/*`

### Web Origins

- `https://descontovivo.com`
- `https://www.descontovivo.com`
- `https://descontovivo.com.br`
- `https://www.descontovivo.com.br`

## Deploy

O deploy é automático via Cloudflare Pages ao fazer merge na branch `master`. Não há CI/CD de deploy no GitHub Actions — o GitHub Actions valida apenas build em PRs/pushes.

## Checklist pós-deploy

1. Acessar `https://descontovivo.com` e verificar carregamento.
2. Confirmar redirect 301 de `www.descontovivo.com`, `descontovivo.com.br` e `www.descontovivo.com.br`.
3. Verificar `robots.txt` e `sitemap.xml` acessíveis.
4. Testar login OIDC (redirect + callback).
5. Verificar chamadas à API (`/api/v1/promotions` ou endpoint público equivalente).
6. Confirmar fallback SPA (rota inexistente deve carregar `index.html`).
7. Validar meta tags e Open Graph em ferramenta de preview (ex: metatags.io).
