# TODO DescontoVivo

Checklist vivo para acompanhar a evolução do MVP sem misturar planejamento com implementação.

## Concluído

- [x] Migração/base Angular 21.
- [x] Estrutura standalone com `bootstrapApplication`.
- [x] Estrutura principal em `core`, `shared`, `layouts` e `features`.
- [x] Models iniciais.
- [x] Mocks iniciais.
- [x] Páginas placeholder do MVP.
- [x] Componentes compartilhados iniciais.
- [x] Rotas iniciais.
- [x] README inicial.
- [x] `docs/MVP.md` inicial.

## Próximo foco

- [ ] Revisar visual no navegador.
- [ ] Corrigir textos sem acento, se existirem.
- [ ] Melhorar home/feed.
- [ ] Melhorar card de promoção.
- [ ] Melhorar página de listagem/busca.
- [ ] Melhorar página de detalhe.
- [ ] Melhorar página de publicar promoção.
- [ ] Conferir responsividade mobile.

## MVP funcional

- [ ] Login visual.
- [ ] Cadastro visual.
- [ ] Publicar promoção visual.
- [ ] Curtir promoção mockado.
- [ ] Comentar mockado.
- [ ] Buscar promoção mockada.
- [ ] Página 404.
- [ ] Página 500.

## UI Clean Hybrid

- [ ] Refinar hierarquia visual da home.
- [ ] Ajustar espaçamentos e densidade do feed.
- [ ] Melhorar estados de cards e botões.
- [ ] Revisar consistencia de cores, bordas e sombras.
- [ ] Evitar visual de dashboard/admin.
- [ ] Validar experiencia em telas pequenas.

## Qualidade tecnica

- [ ] Revisar imports standalone.
- [ ] Conferir ausencia de `AppModule`.
- [ ] Conferir dependencias Angular 21 no `package.json`.
- [ ] Rodar build e observar warnings de bundle e CSS.
- [ ] Rodar `git diff --check` antes de fechar fases relevantes.
- [ ] Manter `styles.scss` enxuto.

## Acessibilidade e SEO

- [ ] Revisar headings por pagina.
- [ ] Conferir textos alternativos de imagens.
- [ ] Conferir labels e `aria-label` em ações importantes.
- [ ] Revisar navegação por teclado.
- [ ] Preparar metadados por rota quando houver conteudo real.
- [ ] Manter metadados base em `index.html`.

## Pipeline de imagens de promoções

- [ ] Definir padrão de imagem do card: 200x200 no layout, usando arquivo otimizado maior como 400x400 ou 512x512.
- [ ] Usar `object-fit: contain` nos cards para evitar corte ruim do produto.
- [ ] Criar fallback visual para promoções sem imagem.
- [ ] Permitir imagem enviada pelo usuário na publicação da promoção.
- [ ] No backend futuro, criar job assíncrono para tentar extrair imagens do link da oferta.
- [ ] Priorizar imagens vindas de `og:image`, schema.org e imagem principal do produto.
- [ ] Gerar 2 ou 3 imagens candidatas para o moderador escolher na aprovação.
- [ ] Padronizar imagens no backend: redimensionar, comprimir, converter para WebP e gerar miniaturas.
- [ ] Avaliar remoção de fundo como melhoria futura, não obrigatória no MVP.
- [ ] Armazenar imagens processadas em storage próprio, evitando hotlink direto dos sites das lojas.
- [ ] Definir política de cache e limpeza de imagens antigas.
- [ ] Garantir que o feed público use somente imagens aprovadas e armazenadas pelo DescontoVivo.

## Backend futuro

- [ ] Autenticação real, ainda fora da fase atual.
- [ ] Persistência real, ainda fora da fase atual.
- [ ] Moderação real, ainda fora da fase atual.
- [ ] Painel admin, ainda fora da fase atual.
- [ ] Integração com lojas, ainda fora da fase atual.
- [ ] Notificações reais, ainda fora da fase atual.

## Fora do escopo por enquanto

- [ ] Criar backend.
- [ ] Criar autenticação real.
- [ ] Criar cadastro real.
- [ ] Criar persistência.
- [ ] Alterar favicon, logo ou assets de marca.
- [ ] Implementar painel administrativo.
- [ ] Fazer integrações reais com lojas.
- [ ] Fazer notificações reais.
- [ ] Remoção automática de fundo.
- [ ] Crawler avançado de imagens.
- [ ] Storage definitivo de imagens.
- [ ] Moderação avançada de imagens.
