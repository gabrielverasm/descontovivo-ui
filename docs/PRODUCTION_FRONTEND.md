# Produção — Frontend (Cloudflare Pages / Workers)

## Hospedagem

| Item | Valor |
|------|-------|
| Plataforma atual | Cloudflare Pages + Pages Functions |
| Arquitetura alvo/preview | Cloudflare Workers + Static Assets |
| Worker de preview | `descontovivo-ui-ssr-preview` |
| Branch de produção | Deploy automático da `master` no Pages |
| Build command | `npm run build` |
| Output directory | `dist/descontovivo-ui/browser` |
| Worker assets alvo | `dist/descontovivo-ui/worker-assets` |
| Worker entrypoint alvo | `dist/descontovivo-ui/server/server.mjs` |
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

## Runtime atual e arquitetura alvo

Atualmente, o domínio continua no Cloudflare Pages. As Pages Functions
`functions/promocoes/[slug].ts` e `functions/story-image.ts`, além do shell
gerado em `/__app-shell/`, foram preservados para esse ambiente.

Na arquitetura alvo, o Worker atende `/promocoes/*` com Angular SSR e
`/story-image*` com o proxy de imagem. Os demais arquivos são servidos pelo
binding `ASSETS`, conforme `wrangler.jsonc`. Nenhum domínio está associado ao
Worker neste momento.

## Migração em duas fases

### Fase 1 — preview

- Publicar o Worker em `workers.dev` usando o `wrangler.jsonc`.
- Configurar `SSR_PREVIEW_HOSTNAME` com o hostname exato do preview, quando conhecido.
- Validar SSR, rotas CSR, 404, headers e proxy de imagem.
- Manter o Cloudflare Pages, as Pages Functions e os domínios atuais ativos.

### Fase 2 — cutover

- Criar Cloudflare Redirect Rules ou Bulk Redirects para `www.descontovivo.com`,
  `descontovivo.com.br` e `www.descontovivo.com.br`, redirecionando para
  `descontovivo.com` com caminho e query string preservados.
- Associar os domínios ao Worker.
- Validar o tráfego de produção.
- Desativar o deploy automático do Pages.
- Remover as Pages Functions e o shell legado em PR separada.

O `redirectLegacyHost` do Worker protege requests que alcancem o código do
Worker, mas não substitui Redirect Rules para todos os assets estáticos.

## Checklist pós-deploy

1. Acessar `https://descontovivo.com` e verificar carregamento.
2. Confirmar redirect 301 de `www.descontovivo.com`, `descontovivo.com.br` e `www.descontovivo.com.br`.
3. Verificar `robots.txt` e `sitemap.xml` acessíveis.
4. Testar login OIDC (redirect + callback).
5. Verificar chamadas à API (`/api/v1/promotions` ou endpoint público equivalente).
6. Confirmar as rotas CSR explícitas e que uma rota desconhecida continua 404.
7. Validar meta tags e Open Graph em ferramenta de preview (ex: metatags.io).
