/**
 * Restricts a page to the allowlisted operator user (see super-admin-access.js).
 * Expects #operatorOnlyMain and optional #operatorOnlyDenied, #operatorOnlyDeniedMsg, #operatorOnlySignIn.
 * Auto-runs on DOMContentLoaded unless <body data-operator-gate="manual"> — then call
 * metricsEnsureOperatorOnlyAccess(callback) after DOM is ready.
 */
(function () {
  function el(id) {
    return document.getElementById(id);
  }

  function showDenied(message, showSignIn) {
    var denied = el('operatorOnlyDenied');
    var main = el('operatorOnlyMain');
    var msg = el('operatorOnlyDeniedMsg');
    var signIn = el('operatorOnlySignIn');
    if (main) main.hidden = true;
    if (denied) denied.hidden = false;
    if (msg) msg.textContent = message || '';
    if (signIn) signIn.hidden = !showSignIn;
  }

  function showMain() {
    var denied = el('operatorOnlyDenied');
    var main = el('operatorOnlyMain');
    if (denied) denied.hidden = true;
    if (main) main.hidden = false;
  }

  window.metricsEnsureOperatorOnlyAccess = function (onAllowed) {
    if (!el('operatorOnlyMain')) {
      if (typeof onAllowed === 'function') onAllowed();
      return;
    }
    if (el('operatorOnlyDenied')) showDenied('Checking access…', false);
    if (!window.metricsSupabase || !window.metricsSupabase.auth) {
      showDenied('This page is not available.', false);
      return;
    }
    window.metricsSupabase.auth.getSession().then(function (res) {
      var user = res && res.data && res.data.session && res.data.session.user;
      if (!user) {
        showDenied('Sign in to continue.', true);
        return;
      }
      if (!window.metricsIsSuperAdminUser || !window.metricsIsSuperAdminUser(user)) {
        showDenied('This page is not available for your account.', false);
        return;
      }
      showMain();
      if (typeof onAllowed === 'function') onAllowed();
    });
  };

  function autoGate() {
    if (document.body && document.body.getAttribute('data-operator-gate') === 'manual') return;
    if (!el('operatorOnlyMain')) return;
    showDenied('Checking access…', false);
    window.metricsEnsureOperatorOnlyAccess();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoGate);
  } else {
    autoGate();
  }
})();
