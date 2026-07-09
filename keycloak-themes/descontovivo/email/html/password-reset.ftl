<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefina sua senha</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f6f8;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 32px 40px 24px 40px;">
              <span style="font-size: 24px; font-weight: bold; color: #172033; text-decoration: none;">DescontoVivo</span>
            </td>
          </tr>
          <!-- Title -->
          <tr>
            <td align="center" style="padding: 0 40px 16px 40px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 600; color: #172033;">Redefina sua senha</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #374151;">
                Olá ${user.firstName},
              </p>
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #374151;">
                Recebemos uma solicitação para redefinir a senha da sua conta no DescontoVivo. Clique no botão abaixo para criar uma nova senha:
              </p>
            </td>
          </tr>
          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 40px 24px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background-color: #172033; border-radius: 6px;">
                    <a href="${link}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">Redefinir senha</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Fallback Link -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #6b7280; word-break: break-all;">
                Se o botão não funcionar, copie e cole este link no navegador:<br>
                <a href="${link}" style="color: #172033; text-decoration: underline;">${link}</a>
              </p>
            </td>
          </tr>
          <!-- Expiration -->
          <tr>
            <td style="padding: 0 40px 24px 40px;">
              <#if linkExpiration??>
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #6b7280;">
                Este link expira em ${linkExpiration} minuto(s).
              </p>
              </#if>
            </td>
          </tr>
          <!-- Security Notice -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #6b7280;">
                Se você não solicitou esta alteração, ignore este e-mail. Sua senha permanecerá a mesma.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                DescontoVivo &mdash; descontovivo.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
