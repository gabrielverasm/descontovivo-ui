# Arquitetura do Frontend — DescontoVivo UI

## Estrutura de pastas

```txt
src/app/
├── core/
│   ├── guards/          → route guards
│   ├── interceptors/    → HTTP interceptors
│   ├── models/          → interfaces e tipos
│   ├── services/        → serviços injetáveis
│   └── utils/           → utilitários puros
├── features/
│   ├── about/           → página "Sobre"
│   ├── admin/           → import admin
│   ├── auth/            → login/cadastro (redirect OIDC)
│   ├── errors/          → páginas de erro (404, 500)
│   ├── moderation/      → painel de moderação
│   ├── promotions/      → home/feed + detalhe
│   ├── publish/         → publicar promoção
│   ├── services/        → página "Serviços"
│   └── transparency/    → página "Transparência"
├── layouts/             → layouts de página (header, footer)
└── shared/
    └── components/      → componentes reutilizáveis
```

## Serviços (`core/services/`)

| Serviço | Responsabilidade |
|---------|-----------------|
| `auth.service` | Gerencia OIDC: login, logout, token, estado de autenticação. |
| `account.service` | Perfil do usuário via `/account/me`. |
| `promotion.service` | CRUD de promoções (listar, detalhe, criar, votar). |
| `comment.service` | Comentários e respostas (integração parcial; listagem/envio completo no roadmap). |
| `moderation.service` | Ações de moderação (aprovar, rejeitar, editar, remover). |
| `upload.service` | Presigned URL + upload de imagem para R2. |
| `admin-import.service` | Import batch de promoções via JSON. |
| `image-processing.service` | Processamento local de imagem antes do upload (resize, WebP). |
| `seo.service` | Meta tags dinâmicas por rota. |

## Guards (`core/guards/`)

| Guard | Regra |
|-------|-------|
| `auth.guard` | Redireciona para login se não autenticado. |
| `email-verified.guard` | Bloqueia se e-mail não verificado. |
| `moderator.guard` | Exige role `moderator` ou `admin`. |
| `admin.guard` | Exige role `admin`. |

## Interceptors (`core/interceptors/`)

| Interceptor | Função |
|-------------|--------|
| `auth.interceptor` | Injeta header `Authorization: Bearer <token>` em requests para a API. |

## Fluxo de autenticação

1. Usuário clica em "Entrar" → `auth.service` redireciona para Keycloak.
2. Keycloak autentica e retorna `code` via redirect.
3. `angular-auth-oidc-client` troca code por tokens (PKCE).
4. Token armazenado em memória; `auth.interceptor` injeta Bearer automaticamente.
5. `/account/me` obtém perfil (roles, email verified).
6. Guards protegem rotas com base nas roles e verificação de e-mail.

## Fluxo de upload de imagem

1. Usuário seleciona arquivo na UI.
2. `image-processing.service` redimensiona/converte para WebP localmente.
3. `upload.service` solicita presigned URL da API (`/uploads/promotion-image/presign`).
4. Upload PUT direto para R2 via presigned URL.
5. `objectKey` retornado é usado como `imageKey` ao criar/editar promoção.
6. API promove imagem de `temp/` para destino final.

## Fluxo de moderação

1. Moderador acessa `/moderacao/promocoes` (protegido por `moderator.guard`).
2. Lista promoções `PENDING_REVIEW`.
3. Pode aprovar, rejeitar, remover ou editar (com troca de imagem opcional).
4. Edição com nova imagem: faz upload para temp via presigned URL, envia `imageKey` no PATCH.
5. API promove imagem e remove antiga.

## Decisões técnicas

- Standalone components sem `NgModule`.
- Rotas lazy com `loadComponent` (code splitting automático).
- SCSS por componente (encapsulamento de estilos).
- Sem state management externo — serviços com signals/observables simples.
- Sem mocks em produção — promoções, votos e moderação consomem a API real.
- Comentários: contadores vindos da API; listagem/envio completo na UI está no roadmap.
