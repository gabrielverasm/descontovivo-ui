# Versionamento — DescontoVivo UI

## Versão atual

**0.3.2**

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
3. O footer exibe `UI v0.3.2 · API v0.1.0` para facilitar validação de deploy.

## Histórico

| Versão | Data | Descrição |
|--------|------|-----------|
| 0.1.0 | 2026-07-05 | MVP inicial |
| 0.2.0 | 2026-07-05 | SEO orgânico inicial: brand signals, JSON-LD, detail por slug e metadados melhores |
| 0.3.0 | 2026-07-05 | Analytics/Observabilidade MVP: GA4 com consentimento, eventos de negócio, UTMs, banner, pages legais |
| 0.3.1 | 2026-07-05 | Configuração do Measurement ID do GA4 em produção |
| 0.3.2 | 2026-07-05 | Fix: dispatch GA4 events após consent granted (ordem de inicialização corrigida) |
