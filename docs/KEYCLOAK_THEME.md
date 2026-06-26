# Keycloak Login Theme – DescontoVivo

## O que foi criado

Tema customizado de login para o Keycloak chamado `descontovivo`, que estende o tema padrão (`keycloak`) e aplica o visual do produto: fundo escuro/azulado, card branco, botão vermelho/laranja, logo e tipografia Inter (fallback sistema).

## Estrutura local

```
keycloak-themes/descontovivo/login/
├── theme.properties
├── messages/
│   ├── messages_pt_BR.properties
│   └── messages_en.properties
└── resources/
    ├── css/descontovivo.css
    └── img/
        ├── logo-icon-white.svg
        ├── logo-icon-dark.png
        └── discount-tag.svg
```

## Deploy no servidor

### 1. Empacotar localmente

```bash
tar -czf descontovivo-keycloak-theme.tar.gz -C keycloak-themes descontovivo
```

### 2. Enviar para a VPS

```bash
scp descontovivo-keycloak-theme.tar.gz root@SEU_IP:/opt/descontovivo/auth/
```

### 3. Extrair no servidor

```bash
cd /opt/descontovivo/auth
mkdir -p themes
tar -xzf descontovivo-keycloak-theme.tar.gz -C themes
```

Estrutura final esperada:

```
/opt/descontovivo/auth/themes/descontovivo/login/theme.properties
/opt/descontovivo/auth/themes/descontovivo/login/messages/...
/opt/descontovivo/auth/themes/descontovivo/login/resources/...
```

### 4. Validar estrutura

```bash
find themes/descontovivo -maxdepth 5 -type f | sort
```

### 5. Montar volume no docker-compose.yml

```yaml
services:
  keycloak:
    # mantenha o restante da configuração existente
    volumes:
      - ./themes:/opt/keycloak/themes:ro
```

### 6. Reiniciar

```bash
docker compose restart keycloak
```

Se o serviço tiver outro nome:

```bash
docker compose ps
docker compose restart NOME_DO_SERVICO
```

## Como ativar no Admin Console

1. Acesse o Admin Console do Keycloak.
2. Vá em **Realm Settings → Themes**.
3. Em **Login theme**, selecione `descontovivo`.
4. Salve.

## Como testar

Acesse a URL de login do realm:

```
https://auth.descontovivo.com.br/realms/descontovivo/account
```

## Cache de temas

Os parâmetros abaixo são úteis **apenas em desenvolvimento**:

```bash
bin/kc.sh start \
  --spi-theme--static-max-age=-1 \
  --spi-theme--cache-themes=false \
  --spi-theme--cache-templates=false
```

No Docker, passe via `command`:

```yaml
services:
  keycloak:
    command:
      - start
      - --spi-theme--static-max-age=-1
      - --spi-theme--cache-themes=false
      - --spi-theme--cache-templates=false
```

> ⚠️ **Produção**: mantenha o cache ATIVO para performance. Remova essas flags.

## Próximos passos

- Customizar templates `.ftl` se necessário (ex: frase de apoio como HTML nativo).
- Criar tema de e-mail (`email/`) com branding DescontoVivo.
- Criar tema de conta (`account/`) se necessário.
- Adicionar mais idiomas conforme necessário.
