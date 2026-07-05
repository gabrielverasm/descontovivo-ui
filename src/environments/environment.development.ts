export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080/api/v1',
  oidc: {
    issuer: 'http://localhost:8082/realms/descontovivo',
    clientId: 'descontovivo-ui',
    scope: 'openid profile email',
    redirectUri: 'http://localhost:4200',
    postLogoutRedirectUri: 'http://localhost:4200',
  },
  analytics: {
    ga4MeasurementId: '',
  },
};
