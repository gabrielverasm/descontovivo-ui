# Copilot Instructions for descontovivo-ui

## Project Direction

- Angular standalone app using `bootstrapApplication`.
- Do not create `AppModule` while the app remains standalone.
- Keep the target architecture in `src/app/core`, `src/app/shared`, `src/app/layouts`, and `src/app/features`.
- Follow the Clean Hybrid direction: minimal, modern, responsive, and not dashboard-like.

## UI and Styling

- Angular Material may be used as a base when it clearly helps usability.
- The final UI should be custom, not default Material.
- Keep `styles.scss` limited to theme, global tokens, reset/base, and only strictly necessary globals.
- Do not move component styles into global styles without a clear reason.

## Product Scope

- MVP scope only: cadastro, login, publicar promoção, curtir, comentar, buscar, and error pages.
- Do not implement backend, real auth, real signup, or persistence without approval.

## Validation

- Before finishing meaningful changes, run `npm run build` and check bundle size, budgets, and CSS warnings.
