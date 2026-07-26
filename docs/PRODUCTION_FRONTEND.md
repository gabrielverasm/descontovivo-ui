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
institucionais, assets estáticos e demais rotas, conforme o fluxo já documentado.
Em produção, o Worker usa Angular SSR em `/promocoes/:slug`, atende
`/story-image` com o proxy de imagem e trata as rotas CSR conhecidas, fornecendo
internamente o shell canônico `/index.csr` sem expor esse nome na URL pública.

As Pages Functions `functions/promocoes/[slug].ts` e `functions/story-image.ts`
foram removidas após a ativação controlada das rotas correspondentes no Worker.
O shell legado `/__app-shell/` também foi removido. Nas rotas CSR conhecidas, o
Worker resolve internamente o asset público canônico `/index.csr`; esse nome
interno não deve aparecer no header `Location` nem substituir a URL solicitada
no navegador. A migração total do domínio para o Worker continua fora do escopo.

## Migração em duas fases

### Histórico do cutover controlado

- Publicar o Worker em `workers.dev` usando o `wrangler.jsonc`.
- Alterações no Worker exigem `npx wrangler deploy`; o deploy automático do
  Pages não publica o bundle do Worker.
- Configurar `SSR_PREVIEW_HOSTNAME` com o hostname exato do preview, quando conhecido.
- Validar SSR, rotas CSR, 404, headers e proxy de imagem.
- O Worker foi validado para `/promocoes/*` e `/story-image*` em produção.
- O Cloudflare Pages permanece ativo para as demais rotas.
- As Pages Functions substituídas e o shell legado foram removidos.

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
