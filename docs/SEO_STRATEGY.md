# SEO Strategy — DescontoVivo

## Status Atual

- Domínio verificado no Google Search Console.
- Sitemap processado com 57+ páginas (home + promoções individuais + estáticas).
- Home já aparece no Google.
- SPA puro (sem SSR/prerender por enquanto — Google renderiza via JavaScript).
- Marca nova: Google ainda confunde "DescontoVivo" com "desconto vivo" (operadora). Isso é normal e melhora com sinais consistentes de marca ao longo do tempo.

## O Que Foi Implementado (feat/seo-organic-baseline)

### Identidade de Marca
- `og:site_name` = "DescontoVivo" em todas as páginas.
- `og:locale` = "pt_BR".
- Title da home reforça marca: "DescontoVivo: Promoções e ofertas compartilhadas pela comunidade".
- Meta description da home ampliada com categorias de produtos.
- `rel="icon" type="image/png"` adicionado para browsers que preferem PNG.

### JSON-LD (Structured Data)
- `StructuredDataService` criado para gerenciar scripts JSON-LD no `<head>`.
- Home: WebSite (`name`, `alternateName`, `url`) + Organization (`name`, `url`, `logo`).
- Promoção individual: Product/Offer com `name`, `price`, `priceCurrency`, `availability`, `seller`, `image`.
- JSON-LD é limpo automaticamente na navegação SPA.

### Página de Promoção
- Carregamento individual por slug (antes carregava 50 promoções e fazia find).
- Title inclui preço: "{Título} por R$ X | DescontoVivo".
- Description inclui preço original quando disponível.
- Canonical correto: `https://descontovivo.com/promocoes/{slug}`.
- Texto contextual curto e objetivo abaixo do título.

### Links Internos
- Título do card de promoção é agora um link crawlable `<a routerLink>`.
- "Ver detalhes" continua como link crawlable.

### Links Externos
- `rel="sponsored noopener noreferrer"` (removido `nofollow` redundante).
- Decisão: todos os links "Ir para loja" usam `sponsored` porque podem ser monetizados.

### Imagens
- Alt text inclui nome da loja quando disponível.

## Por Que DescontoVivo NÃO Deve Virar Blog

O DescontoVivo é um portal de promoções objetivas. O valor está em:
1. Promoções reais com preço, loja e links diretos.
2. Comunidade que compartilha e vota.
3. Moderação que filtra antes de publicar.

Criar conteúdo tipo blog (reviews, guias de compra, listas editoriais) desvia do produto e:
- Dilui a proposta.
- Exige produção editorial constante.
- Mistura intenção informacional com transacional.

A estratégia de conteúdo é **programática e baseada em dados reais**.

## Estratégia de Páginas Futuras

### Páginas de Loja (próxima feature)
- `/descontos/amazon`
- `/descontos/mercado-livre`
- `/descontos/shopee`
- `/descontos/magalu`
- `/descontos/aliexpress`

Conteúdo: lista filtrada de promoções daquela loja, com title/meta/canonical próprios. Sem texto editorial inventado.

### Páginas de Categoria (próxima feature)
- `/categorias/tecnologia`
- `/categorias/casa`
- `/categorias/mercado`
- `/categorias/moda`
- `/categorias/games`

Conteúdo: lista filtrada de promoções daquela categoria. Mesma lógica.

### Benefícios SEO esperados
- Páginas indexáveis com intenção clara ("promoções Amazon", "ofertas tecnologia").
- Links internos naturais entre categorias e promoções.
- Sitemap mais rico sem criar conteúdo artificial.

## Estratégia de Conteúdo

- **Promoção objetiva**: título, preço, loja, link. Sem clickbait.
- **Descrição curta programática**: gerada a partir dos dados (título + loja + preço). Sem inventar especificações.
- **Dados reais**: não afirmar desconto se não houver preço original, não inventar brand/SKU.
- **Sem afirmações de parceria**: não dizer "parceiro oficial" sem ser verdade.
- **Sem rating fabricado**: votos da comunidade ≠ review de produto.

## Próximos Passos

| Prioridade | Item | Descrição |
|---|---|---|
| Alta | Páginas de loja | Implementar `/descontos/{store-slug}` com filtro de promoções |
| Alta | Páginas de categoria | Implementar `/categorias/{category-slug}` |
| Média | Sitemap automático no CI | Script `generate-sitemap` já existe; integrar no deploy |
| Média | Analytics | Google Analytics / Search Console insights para priorizar |
| Média | CSP headers | Content Security Policy para segurança e trust |
| Baixa | SSR / Prerender | Angular Universal ou prerender para melhorar indexação inicial |
| Baixa | Rich Results | Monitorar aceitação do Product JSON-LD no Search Console |
| Baixa | sameAs no Organization | Adicionar quando houver perfis oficiais em redes sociais |
