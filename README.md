# DescontoVivo UI

Interface do DescontoVivo, um portal de promocoes para os dominios `descontovivo.com.br` e `descontovivo.com`.

O objetivo do produto e oferecer um feed publico simples, moderno e confiavel de ofertas aprovadas pela moderacao. Usuarios cadastrados poderao enviar promocoes, mas elas entram como pendentes e so aparecem publicamente depois de aprovadas.

## Stack

- Angular standalone com `bootstrapApplication`.
- Angular Router com rotas lazy via `loadComponent`.
- TypeScript.
- SCSS por componente.
- Mocks locais para o MVP.

## Arquitetura de pastas

- `src/app/core`: models e mocks centrais.
- `src/app/shared`: componentes reutilizaveis.
- `src/app/layouts`: layouts de pagina.
- `src/app/features`: paginas e fluxos do MVP.

## Regras de publicacao e moderacao

- Apenas usuarios cadastrados devem publicar promocoes no produto final.
- Promocoes publicadas entram como `pending`.
- O feed publico usa apenas promocoes `approved`.
- Promocoes `pending` e `rejected` nao devem aparecer publicamente.
- Ainda nao ha backend, autenticacao real, persistencia ou moderacao real.

## Roadmap inicial

1. Revisar estrutura do projeto.
2. Criar models/interfaces.
3. Criar mocks centralizados.
4. Criar componentes compartilhados.
5. Criar paginas do MVP.
6. Melhorar UI Clean Hybrid.
7. Preparar acessibilidade basica.
8. Preparar SEO/metadados e validacao de build/budget/styles.

## Comandos manuais

Depois de revisar as alteracoes e atualizar dependencias, rode manualmente:

```bash
npm install
npm run build
git diff --check
git status --short
```

## Observacao sobre dependencias

O `package.json` aponta para Angular 21 e dependencias relacionadas. O `package-lock.json` nao foi alterado manualmente; ele deve ser atualizado pelo `npm install`.
