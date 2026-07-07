# Security Headers — DescontoVivo UI

## Visão geral

A UI do DescontoVivo serve security headers via Cloudflare Pages usando o arquivo `public/_headers`. Esse arquivo é copiado para a raiz do build pelo Angular e interpretado pelo Cloudflare Pages automaticamente.

## Headers implementados

| Header | Valor | Propósito |
|--------|-------|-----------|
| X-Content-Type-Options | nosniff | Impede MIME-sniffing |
| Referrer-Policy | strict-origin-when-cross-origin | Limita dados enviados no Referer |
| X-Frame-Options | DENY | Bloqueia embedding em iframes |
| Permissions-Policy | camera=(), microphone=(), geolocation=() | Desabilita APIs desnecessárias |
| Strict-Transport-Security | max-age=31536000 | Força HTTPS por 1 ano |
| Content-Security-Policy | (ver abaixo) | Controla origens de recursos |

## Content-Security-Policy (CSP)

### Estratégia

A CSP foi implementada em **modo enforcing** (não Report-Only) com uma política **pragmática para MVP**. O objetivo é reduzir a superfície para XSS e injeção de recursos sem quebrar funcionalidades existentes.

### Diretivas

| Diretiva | Valor | Motivo |
|----------|-------|--------|
| default-src | 'self' | Baseline restritiva |
| base-uri | 'self' | Previne hijack de base URL |
| object-src | 'none' | Bloqueia plugins (Flash, Java) |
| frame-ancestors | 'none' | Equivalente moderno do X-Frame-Options |
| script-src | 'self' 'unsafe-inline' + GTM + Cloudflare | GA4 usa snippet inline no index.html |
| connect-src | 'self' + API + Auth + GA4 endpoints | Permite chamadas à API, auth e analytics |
| img-src | 'self' data: blob: https: | Promoções usam imagens externas HTTPS |
| style-src | 'self' 'unsafe-inline' + Google Fonts | Angular injeta estilos inline |
| font-src | 'self' data: + Google Fonts | Material Icons e fontes customizadas |
| frame-src | 'self' + Auth | Keycloak pode usar iframe para silent renew |
| form-action | 'self' + Auth | Login/cadastro redirecionam para Keycloak |
| upgrade-insecure-requests | (flag) | Força upgrade de HTTP para HTTPS |

### Por que 'unsafe-inline' foi mantido

- **script-src**: o snippet do GA4 no `src/index.html` é inline. Remover exigiria refatorar para hash ou nonce, o que será avaliado em etapa futura.
- **style-src**: Angular injeta estilos inline em componentes. Remover quebraria a renderização.

### Por que img-src permite https:

Promoções no DescontoVivo podem ter imagens de qualquer loja/marketplace. Restringir a domínios específicos quebraria o carregamento de imagens. Quando a origem das imagens estiver padronizada (ex: apenas R2), essa política será refinada.

## HSTS

```
Strict-Transport-Security: max-age=31536000
```

**Sem** `includeSubDomains` e **sem** `preload` porque:

- O projeto usa subdomínios (api.descontovivo.com, auth.descontovivo.com).
- Novos subdomínios podem ser criados no futuro.
- `includeSubDomains` forçaria HTTPS em todos os subdomínios imediatamente.
- `preload` é difícil e lento de reverter, pois depende da lista mantida pelos browsers.
- Serão avaliados quando todos os subdomínios estiverem estabilizados.

## Validação pós-deploy

```bash
# Verificar headers
curl -I https://descontovivo.com

# Verificar CSP no browser
# DevTools > Console — não deve haver erros de CSP para:
# - api.descontovivo.com
# - auth.descontovivo.com
# - googletagmanager.com
# - google-analytics.com
# - fonts.googleapis.com / fonts.gstatic.com
# - imagens HTTPS de promoções
# - static.cloudflareinsights.com

# Verificar GA4
# DevTools > Network > filtrar "collect"
# Deve aparecer request com status 204 e tid=G-CNB2DKTPC5
```

## Próximos passos

- Avaliar remoção de `'unsafe-inline'` em script-src com hash/nonce para o snippet GA4.
- Refinar img-src quando a origem de imagens estiver padronizada.
- Avaliar HSTS com `includeSubDomains` quando todos os subdomínios estiverem sob controle.
- Avaliar `report-to` / `report-uri` se houver endpoint de coleta de violações.
- Não implementar `trusted-types` ou `cross-origin isolation` (COOP/COEP/CORP) no momento.
