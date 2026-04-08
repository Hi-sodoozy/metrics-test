/**
 * Super admin: only the allowlisted auth user id may open the portal.
 * Second factor is a static portal password in this file (not Supabase).
 * Loaded before supabase-config.js on Metrics pages.
 */
(function () {
  var SUPER_ADMIN_ALLOWED_USER_ID = '162403d6-08cf-4510-a890-f4f04388c66e';

  /**
   * Operator portal password (plain text in source — change before deploy, min 8 characters).
   * This is not stored in the database.
   */
  var SUPER_ADMIN_PORTAL_PASSWORD = 'CHANGE_THIS_PASSWORD';

  function normalizeUserId(id) {
    return String(id || '').trim().toLowerCase();
  }

  window.MV_SUPER_ADMIN_ALLOWED_USER_ID = SUPER_ADMIN_ALLOWED_USER_ID;

  window.metricsIsSuperAdminUser = function (user) {
    if (!user || !user.id) return false;
    return normalizeUserId(user.id) === normalizeUserId(SUPER_ADMIN_ALLOWED_USER_ID);
  };

  window.metricsSuperAdminPortalIsConfigured = function () {
    var p = SUPER_ADMIN_PORTAL_PASSWORD;
    return typeof p === 'string' && p.trim().length >= 8;
  };

  window.metricsSuperAdminVerifyPortalPassword = function (plain) {
    if (!window.metricsSuperAdminPortalIsConfigured()) return false;
    return String(plain || '') === String(SUPER_ADMIN_PORTAL_PASSWORD);
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
