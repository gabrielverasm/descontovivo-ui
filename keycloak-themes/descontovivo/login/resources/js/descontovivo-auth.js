/* DescontoVivo – Auth Topbar Injection */
document.addEventListener('DOMContentLoaded', function () {
  if (document.querySelector('.dv-auth-topbar')) return;

  var header = document.createElement('header');
  header.className = 'dv-auth-topbar';

  header.innerHTML =
    '<a href="https://descontovivo.com/" class="dv-auth-topbar__logo" aria-label="DescontoVivo">' +
      '<span class="dv-auth-topbar__logo-img"></span>' +
    '</a>' +
    '<a href="https://descontovivo.com/" class="dv-auth-topbar__back">' +
      '\u2190 Voltar ao DescontoVivo' +
    '</a>';

  document.body.insertBefore(header, document.body.firstChild);
});
