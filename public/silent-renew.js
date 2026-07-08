/**
 * Silent renew callback for angular-auth-oidc-client.
 * Uses the CustomEvent format required by the library (not postMessage).
 * This script runs inside the silent-renew iframe after Keycloak redirects back.
 */
window.onload = function () {
  var parentWindow = window.parent;
  var event = new CustomEvent('oidc-silent-renew-message', {
    detail: {
      url: window.location,
      srcFrameId: window.frameElement ? window.frameElement.id : undefined
    }
  });
  parentWindow.dispatchEvent(event);
};
