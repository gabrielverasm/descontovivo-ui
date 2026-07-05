# Analytics e Observabilidade — DescontoVivo

## Visão geral

O DescontoVivo utiliza uma camada de analytics e monitoramento para entender acessos, comportamento de usuários e saúde dos serviços, mantendo respeito à privacidade e conformidade com LGPD.

---

## Fase 1 — MVP (atual)

### Ferramentas

| Ferramenta | Objetivo | Requer consentimento? |
|---|---|---|
| **Cloudflare Web Analytics** | Tráfego geral, páginas, origens, Core Web Vitals | Não (sem cookies, ativado no painel Cloudflare) |
| **Google Analytics 4 (GA4)** | Eventos de negócio, campanhas, conversões | Sim (requer consent = granted) |
| **Uptime Kuma** | Monitoramento externo de disponibilidade | N/A (server-side) |

### O que NÃO está implementado nesta fase

- Grafana / Prometheus / Loki / Tempo
- OpenTelemetry
- Sentry (documentado para fase futura)
- Tracking com dados pessoais
- Remarketing ou Google Ads

---

## Cloudflare Web Analytics

### Ativação

Cloudflare Web Analytics é ativado pelo **painel do Cloudflare**, não pelo código Angular.

**Passos para Gabriel:**

1. Acesse o dashboard Cloudflare do domínio `descontovivo.com`
2. Vá em **Analytics & Logs > Web Analytics**
3. Ative para o domínio — Cloudflare injeta o snippet automaticamente via Pages
4. Não adicione o snippet manualmente no `index.html` para evitar duplicidade

### O que Cloudflare Web Analytics mede

- Visitas únicas e page views
- Top páginas
- Origem de tráfego (referrer)
- Países e dispositivos
- Core Web Vitals (LCP, FID, CLS)

### Divergência com GA4

Os números de Cloudflare e GA4 podem divergir. Isso é normal — Cloudflare conta visitas sem cookies, GA4 depende de consentimento e JavaScript habilitado.

---

## Google Analytics 4 (GA4)

### Configuração

O Measurement ID é configurado no arquivo de environment:

```
src/environments/environment.ts
```

```typescript
analytics: {
  ga4MeasurementId: 'G-XXXXXXXXXX', // Preencher com o ID real
}
```

**IMPORTANTE:** GA4 só começa a funcionar quando o Measurement ID é preenchido.
Se `ga4MeasurementId` estiver vazio em produção:
- A app **não quebra** e funciona normalmente
- O script `gtag.js` **não é carregado** (zero impacto de performance)
- Cloudflare Web Analytics continua funcionando independentemente (ativado pelo painel CF)
- Nenhum evento é enviado para GA4

### Comportamento por ambiente

| Ambiente | GA4 ativo? | Console logs? | Router page_view? |
|---|---|---|---|
| Desenvolvimento | Não | Sim (debug) | Sim (logado no console) |
| Produção sem ID | Não | Não | Sim (silencioso, sem envio) |
| Produção com ID | Sim (após consent) | Não | Sim (enviado ao GA4) |

### Consentimento

- GA4 **só envia dados** após o usuário aceitar métricas no banner
- Antes do aceite, `consent: default` é configurado com `analytics_storage: 'denied'`
- Se o usuário recusar, GA4 permanece bloqueado durante toda a sessão
- A escolha é persistida em `localStorage` (`descontovivo_analytics_consent`)
- O banner não aparece novamente se o usuário já decidiu
- Se no futuro houver opção de resetar preferências, aceitar após recusar funcionará (recarrega GA4 e atualiza consent)

### Controle no código

- `AnalyticsService` centraliza todos os eventos
- Componentes **não devem** chamar `window.gtag` diretamente
- Em ambiente de desenvolvimento, todos os eventos e page_views são logados no console para validação
- O Router NavigationEnd é assinado em **todos os ambientes** (dev e prod) para garantir rastreamento consistente

---

## Eventos rastreados

### page_view (automático)

Disparado em cada navegação Angular (NavigationEnd).

| Parâmetro | Descrição |
|---|---|
| page_path | URL path da página |
| page_title | Título da aba |
| ui_version | Versão da UI |

### view_promotion

Disparado quando uma promoção é carregada com sucesso no detalhe.

| Parâmetro | Descrição |
|---|---|
| promotion_id | ID da promoção |
| promotion_slug | Slug da promoção |
| store_name | Nome da loja |
| current_price | Preço atual |
| ui_version | Versão da UI |

### click_store

Disparado no clique de "Ir para loja" / "Acessar oferta".

| Parâmetro | Descrição |
|---|---|
| promotion_id | ID da promoção |
| promotion_slug | Slug |
| store_name | Nome da loja |
| source_component | `card` ou `detail` |
| position | Posição no feed (quando aplicável) |
| ui_version | Versão da UI |

### share

Disparado ao compartilhar promoção.

| Parâmetro | Descrição |
|---|---|
| method | `native_share`, `copy_link` (atuais) — `whatsapp`, `instagram` (fase futura com botões dedicados) |
| content_type | `promotion` |
| item_id | slug ou id |
| store_name | Nome da loja |
| ui_version | Versão da UI |

> **Nota:** A Web Share API não informa qual app o usuário escolheu. Portanto `native_share` pode incluir WhatsApp, Telegram, etc. O valor `whatsapp` será usado apenas quando um botão dedicado de WhatsApp for implementado em fase futura.

### login_start

Disparado quando o usuário clica em "Entrar".

### sign_up_start

Disparado quando o usuário clica em "Criar conta grátis" ou acessa /cadastro.

### promotion_submit_start

Disparado quando o usuário inicia o envio de promoção (após validação de campos obrigatórios preenchidos, antes da validação de valor do preço). Mede a **intenção** de submeter — se o submit falhar por preço inválido, temos o dado de tentativa sem conclusão.

### promotion_submit

Disparado quando a promoção é enviada com sucesso para moderação.

### promotion_vote

Disparado quando voto é registrado com sucesso.

| Parâmetro | Descrição |
|---|---|
| promotion_id | UUID real da promoção |
| promotion_slug | Slug da promoção (ou id se slug não existir) |
| vote_type | `LIKE` ou `DISLIKE` |
| ui_version | Versão da UI |

### comment_submit

Disparado quando comentário é enviado com sucesso.

| Parâmetro | Descrição |
|---|---|
| promotion_id | ID |
| promotion_slug | Slug |
| ui_version | Versão da UI |

---

## O que NÃO é rastreado

- Email, nome, username, CPF, IP
- Token de autenticação
- Conteúdo de comentário
- Dados pessoais do usuário
- Dados de formulários

---

## Padrão UTM

### Convenções

- `utm_source`: sempre minúsculo
- `utm_medium`: valores padrão: `organic`, `social`, `share`, `referral`, `paid`, `email`
- `utm_campaign`: sem espaços, snake_case
- **Nunca** colocar dados pessoais em UTM

### Links padrão

| Contexto | URL |
|---|---|
| Instagram bio | `https://descontovivo.com/?utm_source=instagram&utm_medium=social&utm_campaign=perfil_bio` |
| Instagram post/story | `https://descontovivo.com/promocoes/{slug}?utm_source=instagram&utm_medium=social&utm_campaign=post_promocao` |
| WhatsApp manual | `https://descontovivo.com/promocoes/{slug}?utm_source=whatsapp&utm_medium=share&utm_campaign=compartilhamento_manual` |
| Botão compartilhar (WhatsApp) | Automático: `utm_source=native_share&utm_medium=share&utm_campaign=share_button` |
| Botão compartilhar (copiar link) | Automático: `utm_source=copy_link&utm_medium=share&utm_campaign=share_button` |
| Campanha futura | `https://descontovivo.com/?utm_source={origem}&utm_medium={meio}&utm_campaign={campanha}` |

### Implementação no código

O utilitário `share-promotion.util.ts` adiciona UTMs automaticamente ao compartilhar:
- Native Share API → `utm_source=native_share`
- Clipboard fallback → `utm_source=copy_link`

---

## Monitoramento — Uptime Kuma

### Monitores sugeridos

| Monitor | Tipo | URL | Esperado |
|---|---|---|---|
| **UI Home** | HTTP(s) | `https://descontovivo.com` | 200 |
| **API Version** | HTTP(s) | `https://api.descontovivo.com/api/v1/version` | 200 |
| **API Health** | HTTP(s) | `https://api.descontovivo.com/q/health` | 200 |
| **API Health (ready)** | HTTP(s) | `https://api.descontovivo.com/q/health/ready` | 200 |
| **Keycloak Realm** | HTTP(s) | `https://auth.descontovivo.com/realms/descontovivo/.well-known/openid-configuration` | 200 |

### Alertas

- Pode ser configurado com email, Telegram ou Discord após deploy do Uptime Kuma
- Não é necessário implementar dentro do repositório
- Documentar URL de status page se criada

### Health API

A API expõe automaticamente via Quarkus SmallRye Health:

- `GET /q/health` — todos os checks
- `GET /q/health/live` — liveness (processo rodando)
- `GET /q/health/ready` — readiness (banco conectado, Flyway OK)

Inclui checks automáticos de:
- Datasource PostgreSQL
- Flyway migrations

---

## Roadmap — Fases futuras

### Fase 2 (planejada)

- **Sentry** — captura de erros JS (frontend) e exceptions (backend)
  - Sampling baixo (~10% ou menos)
  - Remover dados pessoais dos eventos
  - Configurar environment (`production`, `development`) e release/version
  - Não implementar nesta branch
- **Dashboards GA4** — criar relatórios personalizados de conversão
- **Custom dimensions** — categoria, loja, tipo de selo

### Fase 3 (futura)

- **Grafana + Prometheus** — métricas técnicas (latência, request rate, error rate)
- **Loki** — aggregação de logs centralizada
- **OpenTelemetry** — tracing distribuído
- **Tempo** — trace backend

### Decisões registradas

| Decisão | Motivo |
|---|---|
| Não implementar Grafana/Prometheus agora | Custo e complexidade desnecessários para o estágio atual |
| Não implementar Sentry agora | Poucos usuários, erros podem ser acompanhados manualmente |
| Usar Cloudflare Web Analytics sem código | Zero impacto de performance, ativado pelo painel |
| GA4 com consent default denied | Conformidade LGPD, respeito ao usuário |
| Não usar Google Ads/remarketing | Fora do escopo, sem necessidade |
| Banner discreto | Não intrusivo, mobile-friendly, UX limpa |
| UTMs automáticos no share | Permite medir origem orgânica sem esforço |

---

## Arquivos de referência

| Arquivo | Descrição |
|---|---|
| `src/app/core/analytics/analytics.service.ts` | Serviço central de analytics |
| `src/app/core/analytics/analytics-config.ts` | Configuração (lê environment) |
| `src/app/core/analytics/analytics-events.ts` | Interfaces e builders de eventos |
| `src/app/core/analytics/analytics-consent.service.ts` | Gerenciamento de consentimento |
| `src/app/core/analytics/analytics-consent-banner.component.ts` | Banner de consentimento |
| `src/app/core/analytics/utm.util.ts` | Utilitário para UTMs em links |
| `src/environments/environment.ts` | Config prod (GA4 Measurement ID) |
| `docs/VERSIONING.md` | Histórico de versões |
