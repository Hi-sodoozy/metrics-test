/**
 * Super admin: only the allowlisted Supabase auth user id may use the portal.
 * Loaded before supabase-config.js on Metrics pages.
 */
(function () {
  var SUPER_ADMIN_ALLOWED_USER_ID = '162403d6-08cf-4510-a890-f4f04388c66e';

  function normalizeUserId(id) {
    return String(id || '').trim().toLowerCase();
  }

  window.MV_SUPER_ADMIN_ALLOWED_USER_ID = SUPER_ADMIN_ALLOWED_USER_ID;

  window.metricsIsSuperAdminUser = function (user) {
    if (!user || !user.id) return false;
    return normalizeUserId(user.id) === normalizeUserId(SUPER_ADMIN_ALLOWED_USER_ID);
  };

  window.metricsSyncSuperAdminFooterDot = function () {
    if (!document.body) return;
    var ctx = typeof window.metricsGetUserContext === 'function' ? window.metricsGetUserContext() : null;
    var uid = ctx && ctx.userId;
    if (uid && normalizeUserId(uid) === normalizeUserId(SUPER_ADMIN_ALLOWED_USER_ID)) {
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
