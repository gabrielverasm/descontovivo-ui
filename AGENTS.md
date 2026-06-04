# DescontoVivo UI - AGENTS

## Diretrizes do projeto

- O app deve permanecer em Angular standalone com `bootstrapApplication`.
- Nao criar `AppModule` se o bootstrap atual continuar via standalone.
- Manter a estrutura em `src/app/core`, `src/app/shared`, `src/app/layouts` e `src/app/features`.
- Priorizar UI Clean Hybrid: limpa, moderna, minimalista e responsiva, sem visual de dashboard/admin.
- Usar Angular Material apenas quando houver ganho claro de usabilidade; o visual final deve ser customizado.
- Manter `styles.scss` enxuto: tema, tokens globais, reset/base e estilos globais estritamente necessarios.
- Nao mover estilos de componentes para o global sem justificativa.
- Nao implementar backend, autenticacao real, cadastro real ou persistencia sem aprovacao.
- Antes de concluir mudancas relevantes, validar `npm run build` e observar warnings de bundle e CSS.
