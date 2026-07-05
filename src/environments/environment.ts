export const environment = {
  production: true,
  apiBaseUrl: 'https://api.descontovivo.com/api/v1',
  oidc: {
    issuer: 'https://auth.descontovivo.com/realms/descontovivo',
    clientId: 'descontovivo-ui',
    scope: 'openid profile email',
    redirectUri: 'https://descontovivo.com',
    postLogoutRedirectUri: 'https://descontovivo.com',
  },
  analytics: {
    ga4MeasurementId: 'G-CNB2DKTPC5',
  },
};
