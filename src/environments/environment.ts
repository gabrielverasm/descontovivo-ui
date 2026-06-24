export const environment = {
  production: true,
  apiBaseUrl: 'https://descontovivo.com.br/api/v1',
  oidc: {
    issuer: 'https://auth.descontovivo.com.br/realms/descontovivo',
    clientId: 'descontovivo-ui',
    scope: 'openid profile email',
    redirectUri: 'https://descontovivo.com.br',
    postLogoutRedirectUri: 'https://descontovivo.com.br',
  },
};
