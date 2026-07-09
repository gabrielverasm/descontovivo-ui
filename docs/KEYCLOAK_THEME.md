# Keycloak Theme – DescontoVivo

## Visão geral

Tema customizado para Keycloak com branding DescontoVivo aplicado às telas de login, cadastro, recuperação de senha e e-mails transacionais.

## Estrutura

```
keycloak-themes/descontovivo/
├── login/
│   ├── theme.properties
│   ├── messages/
│   │   ├── messages_pt_BR.properties
│   │   └── messages_en.properties
│   └── resources/
│       ├── css/descontovivo-v4.css  (versão atual v4)
│       ├── css/descontovivo-v3.css   (versão anterior)
│       ├── css/descontovivo-v2.css   (mais antiga)
│       ├── js/descontovivo-auth-v4.js  (versão atual v4)
│       ├── js/descontovivo-auth-v3.js   (versão anterior)
│       ├── js/descontovivo-auth-v2.js   (mais antiga)
│       └── img/
│           ├── Logo.svg
│           ├── Logo-dark.svg
│           ├── discount-tag.svg
│           └── favicon.ico
└── email/
    ├── theme.properties
    ├── messages/
    │   ├── messages_pt_BR.properties
    │   └── messages_en.properties
    ├── html/
    │   ├── email-verification.ftl
    │   ├── password-reset.ftl
    │   └── executeActions.ftl
    └── text/
        ├── email-verification.ftl
        ├── password-reset.ftl
        └── executeActions.ftl
```

## Cache busting de assets

Keycloak mantém cache estático de assets CSS/JS, mesmo após deploy do tema. Para forçar o navegador a buscar versões novas:

### Solução: Versionamento de assets
1. **Renomear arquivos** com sufixo v2, v3, etc.
   - `descontovivo-auth.js` → `descontovivo-auth-v2.js`
   - `descontovivo.css` → `descontovivo-v2.css`
2. **Atualizar** `theme.properties`:
   ```
   styles=css/descontovivo-v2.css
   scripts=js/descontovivo-auth-v2.js
   ```
3. **Implante** o tema no Keycloak

### Quando versionar novamente?
Se correções em JS/CSS não aparecerem após deploy:
1. Crie novo sufixo (v3, v4, ...)
2. Renomeie assets e atualize `theme.properties`
3. Refaça deploy

### Arquivos antigos
Mantenha versões anteriores no diretório por segurança, mas verifique que `theme.properties` aponta para a versão mais recente.

## Features

### Login Theme
- Topbar com logo e link "Voltar ao DescontoVivo"
- Card centralizado com bordas suaves e sombra leve
- Ícone de olho integrado ao campo de senha (compatível com Keycloak 26.6.3)
- Acessibilidade: aria-label dinâmico, foco via teclado
- Card mais largo na tela de cadastro (520px)
- Asteriscos de campo obrigatório inline no label (corrigido duplo "*")
- Limpeza automática de erros de senha ao editar
- Texto instrucional estilizado na tela de reset password
- Responsivo (desktop/tablet/mobile)
- Mensagens em pt_BR e en

### Email Theme
- Templates HTML table-based com inline styles (compatível com Gmail, Outlook, Apple Mail)
- Logo texto estilizado "DescontoVivo" (sem SVG — incompatível com clientes de e-mail)
- Botão CTA com link de fallback
- Aviso de expiração condicional
- Aviso de segurança contextual
- Rodapé com branding
- Versões plain text para fallback
- Templates: verificação de e-mail, redefinição de senha, ações genéricas

## Compatibilidade Keycloak 26.6.3

O tema foi adaptado para o DOM real do Keycloak 26.6.3:

### Estrutura DOM de senhas
```html
<!-- Keycloak 26.6.3 renderiza assim: -->
<div class="pf-c-form__group">
  <label class="pf-c-form__label" ...>
    <span class="pf-c-form__label-text">Senha</span>
  </label>
  <div class="pf-c-input-group">
    <input type="password" id="password" class="pf-c-form-control">
    <button class="pf-c-button pf-m-control" type="button" aria-label="Show password">
      <i class="fa fa-eye"></i>
    </button>
  </div>
</div>
```

### Correções implementadas
1. **Botão de olho**: Não cria wrapper duplicado, estiliza o botão nativo `.pf-c-button.pf-m-control`
2. **Asteriscos obrigatórios**: Move `<span class="required">*</span>` para dentro dos labels
3. **Mensagem duplicada**: Corrige `requiredFields=* indica campo obrigatório` → `requiredFields=indica campo obrigatório`
4. **Limpeza de erros**: Remove erros de validação de senha quando o usuário começa a editar

## Deploy

### 1. Empacotar

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
tar -xzf descontovivo-keycloak-theme.tar.gz -C themes
```

### 4. Montar volume no docker-compose

```yaml
services:
  keycloak:
    volumes:
      - ./themes:/opt/keycloak/themes:ro
```

### 5. Reiniciar Keycloak

```bash
docker compose restart keycloak
```

## Ativação no Admin Console

1. Admin Console → **Realm Settings → Themes**
2. **Login theme** → `descontovivo`
3. **Email theme** → `descontovivo`
4. Salvar

### Habilitar "Esqueceu a senha?"

1. Admin Console → **Realm Settings → Login**
2. Ativar **"Forgot password"** (toggle ON)
3. Salvar

## Cache de temas (desenvolvimento)

```yaml
command:
  - start
  - --spi-theme-static-max-age=-1
  - --spi-theme-cache-themes=false
  - --spi-theme-cache-templates=false
```

> ⚠️ Remover em produção para performance.

## Sugestão: Logo PNG para e-mails

Os templates de e-mail atualmente usam texto estilizado em vez de imagem. Para adicionar logo real:
1. Exportar Logo.svg para PNG (200x50px recomendado)
2. Hospedar em `https://descontovivo.com/assets/logo-email.png` ou CDN
3. Substituir no template: `<img src="URL" alt="DescontoVivo" width="160" height="44">`


## Versão v4 – Validação live também em atualização de senha

A versão v4 estende a validação live para telas de UPDATE_PASSWORD e corrige expiração de e-mails.

### Mudanças da v4

- **Validação live em atualizar/redefinir senha:** checklist de senha agora aparece também na tela de required action UPDATE_PASSWORD
- **Correção de e-mails:** texto de expiração agora mostra "minuto(s)" (ex: "Este link expira em 5 minuto(s).")
- **Correção de confirmação:** mensagem "A senha de confirmação não coincide." aparece abaixo do campo também em reset/update password
- **Regras informativas:** regras de username/e-mail ficam neutras quando esses campos não existem no DOM (update password)
- **CSS:** nova classe `.dv-password-rule--info` para regras informativas/neutras

### Validação de senha client-side

A validação espelha a política configurada no realm **descontovivo**:

**Política atual do Keycloak:**
- Minimum Length: 10
- Digits: 1
- Lowercase Characters: 1
- Uppercase Characters: 1
- Special Characters: 1
- Not Username: ligado
- Not Email: ligado
- Not Recently Used: 3

**Implementação client-side v4:**
- Valida em tempo real enquanto o usuário digita
- Checklist com 7 regras visuais
- Regras "Not Username" e "Not Email" são informativas quando o campo não existe no DOM
- Regra "Not Recently Used: 3" é sempre informativa (validada no envio pelo Keycloak)
- Mensagem de confirmação de senha aparece abaixo do campo
- Erros aparecem abaixo dos inputs (não grudados na label)

### Checklist de senha

```
✓ Pelo menos 10 caracteres
✓ Pelo menos 1 letra minúscula
✓ Pelo menos 1 letra maiúscula
✓ Pelo menos 1 número
✓ Pelo menos 1 caractere especial
✓ Não pode conter seu nome de usuário
✓ Não pode conter seu e-mail
○ Não pode ser uma das 3 últimas senhas (validado no envio)
```

### CSS v4 – Novas features

1. **Erros abaixo dos inputs:**
   ```css
   .dv-field-error-below {
     display: block;
     margin-top: 0.35rem;
     font-size: 0.78rem;
     color: #dc2626;
   }
   ```

2. **Checklist visual:**
   ```css
   .dv-password-rules { ... }
   .dv-password-rule--valid { color: #059669; }
   .dv-password-rule--invalid { color: #dc2626; }
   .dv-password-rule--info {
     color: #6b7280;
     font-style: italic;
     opacity: 0.85;
   }
   ```

3. **Correção de alinhamento vertical:**
   ```css
   .login-pf-page input[type="password"] {
     min-height: 42px !important;
     line-height: normal !important;
   }
   ```

### Manutenção

**⚠️ IMPORTANTE:** Se a política de senha mudar no Admin Console do Keycloak, atualize também no JavaScript v4:

1. Acesse `keycloak-themes/descontovivo/login/resources/js/descontovivo-auth-v4.js`
2. Edite a função `setupLivePasswordValidation()`
3. Atualize as regras no array `rules`
4. Faça novo deploy do tema com novo cache bust (v5, v6, etc.)

### Compatibilidade

- Mantém todas as features da v3 (validação live, checklist, etc.)
- Erros server-side do Keycloak continuam funcionando normalmente
- A validação client-side é complementar à validação server-side
- Não desabilita o botão "Criar conta" / "Atualizar senha"
- Botão de olho continua funcionando
- Mensagem "indica campo obrigatório" continua escondida no cadastro