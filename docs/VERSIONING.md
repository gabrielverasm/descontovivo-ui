# Versionamento — DescontoVivo UI

## Versão atual

**0.5.10**

## Convenção

Usamos [SemVer](https://semver.org/) simplificado:

| Tipo | Quando usar | Exemplo |
|------|------------|---------|
| **patch** (0.1.X) | Correção de bug, ajuste visual pequeno | 0.1.0 → 0.1.1 |
| **minor** (0.X.0) | Nova feature, página, componente | 0.1.0 → 0.2.0 |
| **major** (X.0.0) | Quebra de compatibilidade, redesign | 0.2.0 → 1.0.0 |

## Onde atualizar

- `src/app/core/app-version.ts` → constante `UI_VERSION`
- O footer exibe a versão da UI e, quando disponível, da API.

## Processo

1. Toda PR deve avaliar se precisa de bump de versão.
2. O checklist do PR template inclui lembrete de atualização.
3. O footer exibe `UI v0.5.10 · API v0.2.1` para facilitar validação de deploy.

## Histórico

| Versão | Data       | Descrição |
|--------|------------|-----------|
| 0.5.10 | 2026-07-14 | Melhorias de SEO e indexação |
| 0.5.9  | 2026-07-12 | Remove selo “Oferta encontrada” do gerador de story |
| 0.5.8  | 2026-07-12 | Atualiza gerador de story com tema escuro e safe zone superior |
| 0.5.7  | 2026-07-12 | Melhora gerador de story com compartilhamento de imagem |
| 0.5.6  | 2026-07-12 | Fix: carrega logo e imagem do produto no gerador de story |
| 0.5.5  | 2026-07-12 | Adiciona gerador admin de story para promoções |
| 0.5.4  | 2026-07-12 | Fix: preview social da promoção e botão de compartilhar |
| 0.5.3  | 2026-07-10 | Corrige auto-load prematuro da home, evitando carregar novas promoções antes do usuário chegar perto do fim da lista, corrige exibição do selo de curadoria para depender do sinal explícito vindo da API.
| 0.5.2  | 2026-07-10 | Corrige travamento ao adicionar promoção manual, adiciona edição administrativa de quantidade de vendas, notas, loja oficial e sinais de confiança. 
| 0.5.1  | 2026-07-10 | Os selos de confiança “Oficial” e “Curadoria” agora usam badges visuais WebP em vez de texto puro.
| 0.5.0  | 2026-07-10 | Trust Signals: novos campos (salesCount, productRating, sellerRating, officialStore, trustSignals); auto-load no feed com contador e pause; seção "Por que essa promoção passou na curadoria?" e CTA "Ir para..." |
| 0.4.9  | 2026-07-09 | melhora fluxo de autenticação, tema Keycloak e destaque do botão "Criar conta grátis" |
| 0.4.8  | 2026-07-09 | Fix: envia imageKey no formulário manual da moderação |
| 0.4.7  | 2026-07-08 | Ajusta formulário manual da moderação e normalização de títulos |
| 0.4.6  | 2026-07-08 | Fix: storage OIDC, silent renew e upload de imagem |
| 0.4.5  | 2026-07-08 | Fix: reconhecimento automático de sessão em nova aba (auth ready gate + two-phase check) |
| 0.4.4  | 2026-07-08 | Correções de sessão e retorno ao feed |
| 0.4.3  | 2026-07-08 | Link oficial do Instagram |
| 0.4.2  | 2026-07-07 | Correções de navegação, detalhe e sessão |
| 0.3.4  | 2026-07-05 | Fix: usa snippet padrão do GA4 com consent default denied e eventos controlados pela UI |
| 0.4.1  | 2026-07-07 | Fix: restaura pesquisa de promoções no feed público |
| 0.4.0  | 2026-07-07 | Security headers e CSP MVP: headers de segurança, Content-Security-Policy enforcing, HSTS, Permissions-Policy |
| 0.3.3  | 2026-07-05 | Fix: configura GA4 somente após carregamento do script gtag.js |
| 0.3.2  | 2026-07-05 | Fix: dispatch GA4 events após consent granted (ordem de inicialização corrigida) |
| 0.3.1  | 2026-07-05 | Configuração do Measurement ID do GA4 em produção |
| 0.3.0  | 2026-07-05 | Analytics/Observabilidade MVP: GA4 com consentimento, eventos de negócio, UTMs, banner, pages legais |
| 0.2.0  | 2026-07-05 | SEO orgânico inicial: brand signals, JSON-LD, detail por slug e metadados melhores |
| 0.1.0  | 2026-07-05 | MVP inicial |
