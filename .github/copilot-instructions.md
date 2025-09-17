# Copilot Instructions for descontovivo-ui

## Visão Geral
Este projeto é uma aplicação Angular moderna, estruturada para escalabilidade e uso de Material Design. O foco é em promoções e ofertas, com arquitetura baseada em componentes e rotas.

## Estrutura Principal
- **src/app/**: Contém componentes, layouts, páginas e configuração principal do app.
- **src/main.ts**: Ponto de entrada da aplicação.
- **src/styles.scss**: Temas customizados (claro/escuro) usando Angular Material.
- **public/**: Arquivos estáticos e assets.

## Convenções e Padrões
- **Componentes**: Gerados via Angular CLI (`ng generate component`).
- **Estilos**: SCSS, com temas definidos em `styles.scss` e uso de classes `.light-theme` e `.dark-theme` no `<body>`.
- **Arquitetura**: Uso de módulos e configuração via `app.config.ts` e `app.module.ts`.
- **Rotas**: Definidas em `app.routes.ts` e injetadas via `provideRouter`.
- **Testes**: Estrutura de testes unitários já criada, mas desativada por padrão.

## Fluxos de Desenvolvimento
- **Iniciar servidor local**: `npm start` ou `ng serve` (porta padrão: 4200).
- **Build de produção**: `npm run build` ou `ng build` (saída em `dist/`).
- **Testes unitários**: `npm test` ou `ng test` (Karma + Jasmine).
- **Debug**: Use o launch config "ng serve" ou "ng test" no VS Code para depuração em Chrome.

## Integrações e Dependências
- **Angular Material**: Customização de temas e componentes UI.
- **ESLint/Prettier**: Linting e formatação automática (veja `.eslintrc.json` e `.prettierrc`).
- **EditorConfig**: Padronização de estilo entre editores.
- **Extensão recomendada**: `angular.ng-template` para suporte Angular no VS Code.

## Dicas Específicas
- Sempre use SCSS para novos componentes.
- Siga o padrão de importação e configuração de providers em `app.config.ts`.
- Para assets, utilize a pasta `public/` (configurado em `angular.json`).
- Para temas, altere a classe do `<body>` para alternar entre claro/escuro.

## Exemplos de Arquivos-Chave
- `src/app/app.component.ts` — Exemplo de componente raiz.
- `src/app/app.config.ts` — Configuração de providers e rotas.
- `src/styles.scss` — Definição de temas customizados.

## Referências
- [Angular CLI Docs](https://angular.dev/tools/cli)
- [Angular Material Theming](https://material.angular.io/guide/theming)

---

Seções pouco claras ou incompletas? Peça feedback para aprimorar as instruções!