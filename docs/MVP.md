# DescontoVivo MVP

## Objetivo

O DescontoVivo e um portal de promocoes inspirado em comunidades como Gatry e Promobit, mas com identidade propria, foco em clareza e moderacao antes da publicacao publica.

## Escopo inicial

- Feed publico com promocoes aprovadas.
- Busca simples por titulo, descricao, loja, categoria e tags.
- Pagina de detalhe da promocao.
- Fluxos placeholder de login, cadastro e publicacao.
- Mock centralizado para dados de promocoes.
- Paginas de erro 404 e 500.

## Regras do produto

- Apenas usuarios cadastrados devem publicar promocoes no produto final.
- Toda promocao enviada entra com status `pending`.
- Apenas promocoes com status `approved` aparecem no feed publico.
- Promocoes `rejected` ou `pending` nao devem ser exibidas publicamente.
- A moderacao real ainda nao esta implementada.

## Fora do escopo neste momento

- Backend real.
- Autenticacao real.
- Persistencia.
- Integracao com lojas.
- Painel administrativo de moderacao.
- Alteracoes de favicon, logo ou assets de marca.

## Stack alvo

- Angular standalone com `bootstrapApplication`.
- Rotas standalone com `loadComponent`.
- TypeScript compativel com Angular 21.
- CSS por componente, mantendo `styles.scss` enxuto.

## Arquitetura

- `src/app/core`: models, mocks e futuros servicos centrais.
- `src/app/shared`: componentes reutilizaveis e utilitarios compartilhados.
- `src/app/layouts`: layouts de pagina.
- `src/app/features`: paginas e fluxos do produto.

## Validacao manual

Depois de instalar dependencias, validar:

- `npm run build`
- budgets de bundle e CSS no output do build
- warnings de estilos
- navegacao das rotas principais
- exibicao apenas de promocoes aprovadas no feed publico
