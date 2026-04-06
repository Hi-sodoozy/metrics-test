/**
 * Super admin allowlist (footer dot + portal email check). Portal password lives in Supabase (see migration).
 * Loaded before supabase-config.js on Metrics pages.
 */
(function () {
  var SUPER_ADMIN_EMAIL = 'iain@iainduguid.com';

  window.MV_SUPER_ADMIN_EMAIL = SUPER_ADMIN_EMAIL;

  window.metricsNormalizeEmailForSuperAdmin = function (s) {
    return String(s || '').trim().toLowerCase();
  };

  window.metricsIsSuperAdminEmail = function (email) {
    return (
      window.metricsNormalizeEmailForSuperAdmin(email) ===
      window.metricsNormalizeEmailForSuperAdmin(SUPER_ADMIN_EMAIL)
    );
  };

  window.metricsIsSuperAdminUser = function (user) {
    if (!user) return false;
    var em = user.email || (user.user_metadata && user.user_metadata.email) || '';
    return window.metricsIsSuperAdminEmail(em);
  };

  window.metricsSyncSuperAdminFooterDot = function () {
    if (!document.body) return;
    var ctx = typeof window.metricsGetUserContext === 'function' ? window.metricsGetUserContext() : null;
    var em = ctx && ctx.email;
    if (window.metricsIsSuperAdminEmail(em)) {
      document.body.classList.add('mv-super-admin-footer-dot');
    } else {
      document.body.classList.remove('mv-super-admin-footer-dot');
    }
  };

  function runSync() {
    window.metricsSyncSuperAdminFooterDot();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runSync);
  } else {
    runSync();
  }
})();
