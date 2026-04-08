/**
 * Super admin: only the allowlisted Supabase auth user id may use the portal.
 * Loaded before supabase-config.js on Metrics pages.
 */
(function () {
  var SUPER_ADMIN_ALLOWED_USER_ID = '162403d6-08cf-4510-a890-f4f04388c66e';

  function normalizeUserId(id) {
    return String(id || '').trim().toLowerCase();
  }

  function deriveSportHref(operatorHref) {
    var href = String(operatorHref || '').trim();
    if (!href) return '';
    if (/super-admin\.html(?:$|[?#])/i.test(href)) return href.replace(/super-admin\.html/i, 'mv-sport.html');
    if (/super-admin\/?(?:$|[?#])/i.test(href)) return href.replace(/super-admin\/?/i, 'mv-sport/');
    return '';
  }

  function syncOperatorFooterLinks(isAllowed) {
    var groups = document.querySelectorAll('.mv-footer-dot-links');
    var i;
    for (i = 0; i < groups.length; i++) {
      var group = groups[i];
      var operatorLink = group.querySelector('.mv-super-admin-dot-link');
      if (operatorLink) {
        operatorLink.textContent = 'Operator Portal';
        operatorLink.setAttribute('title', 'Operator Portal');
        operatorLink.setAttribute('aria-label', 'Operator Portal');
        operatorLink.classList.add('mv-operator-portal-link');
      }
      var sportLink = group.querySelector('.mv-sport-dot-link');
      if (isAllowed) {
        if (!sportLink) {
          sportLink = document.createElement('a');
          sportLink.className = 'mv-sport-dot-link';
          sportLink.textContent = 'MV Sport';
          sportLink.setAttribute('title', 'MV Sport');
          sportLink.setAttribute('aria-label', 'MV Sport');
          group.appendChild(sportLink);
        }
        var sportHref = deriveSportHref(operatorLink && operatorLink.getAttribute('href'));
        if (sportHref) sportLink.setAttribute('href', sportHref);
      } else if (sportLink) {
        sportLink.remove();
      }
    }
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
    var isAllowed = !!(uid && normalizeUserId(uid) === normalizeUserId(SUPER_ADMIN_ALLOWED_USER_ID));
    document.body.classList.toggle('mv-super-admin-footer-dot', isAllowed);
    syncOperatorFooterLinks(isAllowed);
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
