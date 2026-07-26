# Produção — Frontend (Cloudflare Pages / Workers)

## Hospedagem

| Item | Valor |
|------|-------|
| Plataforma | Cloudflare Pages + Cloudflare Worker + Static Assets |
| Worker de preview | `descontovivo-ui-ssr-preview` |
| Branch de produção | Deploy automático da `master` no Pages |
| Build command | `npm run build` |
| Output directory | `dist/descontovivo-ui/browser` |
| Worker assets alvo | `dist/descontovivo-ui/worker-assets` |
| Worker entrypoint alvo | `dist/descontovivo-ui/server/server.mjs` |
| Node version | 24.16.0 |

## Processo de deploy

O deploy automático da branch `master` atualiza somente o Cloudflare Pages. O
Worker não é atualizado automaticamente. Alterações em
`src/cloudflare-worker.ts`, Angular SSR, Static Assets, dependências ou em
arquivos servidos pelo Worker exigem build, upload de uma nova versão,
validação do preview e deploy manual dessa versão.

Enquanto esse processo manual não ocorrer, Pages e Worker podem exibir versões
diferentes. Nenhuma automação de deploy do Worker está configurada atualmente.
Pages Function e `_routes.json` são publicados automaticamente pelo Pages e não
exigem outro `npx wrangler deploy` do Worker separado.

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

O domínio continua disponível no Cloudflare Pages para a home, páginas
institucionais, assets estáticos e rotas CSR conhecidas. Uma Pages Function
importa `index.csr.html` como text module e retorna o HTML diretamente para as
rotas incluídas em `_routes.json`, sem passar pelo binding `ASSETS`,
redirect ou alteração da URL pública. O `_redirects` não participa mais do
fallback CSR.

Home, institucionais e assets ficam fora da Function. Como Pages Functions
possuem consumo de Workers, a lista explícita restringe as invocações às rotas
CSR. Em produção, `/promocoes/:slug`, `/story-image` e o fluxo próprio
`/index.csr` continuam no Worker separado. A migração total do domínio para o
Worker continua fora do escopo.

## Migração em duas fases

### Histórico do cutover controlado

- Publicar o Worker em `workers.dev` usando o `wrangler.jsonc`.
- Alterações no Worker exigem `npx wrangler deploy`; o deploy automático do
  Pages não publica o bundle do Worker.
- Configurar `SSR_PREVIEW_HOSTNAME` com o hostname exato do preview, quando conhecido.
- Validar SSR, rotas CSR, 404, headers e proxy de imagem.
- O Worker foi validado para `/promocoes/*` e `/story-image*` em produção.
- O Cloudflare Pages permanece ativo para home, institucionais, assets e rotas CSR.
- Uma Pages Function limitada por `_routes.json` atende o fallback CSR com o shell importado como texto.

### Migração total — fora do escopo

- Criar Cloudflare Redirect Rules ou Bulk Redirects para `www.descontovivo.com`,
  `descontovivo.com.br` e `www.descontovivo.com.br`, redirecionando para
  `descontovivo.com` com caminho e query string preservados.
- Associar todas as rotas do domínio ao Worker.
- Desativar o deploy automático do Pages.
- Migrar home, páginas institucionais e demais rotas ainda servidas pelo Pages.

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
