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
    if (/^\.\/?(?:$|[?#])/i.test(href)) return '../mv-sport/';
    if (/super-admin\/?(?:$|[?#])/i.test(href)) return href.replace(/super-admin\/?/i, 'mv-sport/');
    return '';
  }

  function deriveAuctionHref(operatorHref) {
    var href = String(operatorHref || '').trim();
    if (!href) return '';
    if (/super-admin\.html(?:$|[?#])/i.test(href)) return href.replace(/super-admin\.html/i, 'auction-house-input.html');
    if (/^\.\/?(?:$|[?#])/i.test(href)) return '../auction-house/input/';
    return href.replace(/super-admin\/?/i, 'auction-house/input/');
  }

  /** Resolves to the Auction House landing page from any footer context. */
  function auctionHouseLandingHref(operatorHref) {
    var op = String(operatorHref || '').trim();
    var rel = 'auction-house/';
    if (/super-admin\.html/i.test(op)) rel = 'auction-house.html';
    if (typeof window.metricsAbsoluteAppUrl === 'function') {
      try {
        var relUrl = window.metricsAbsoluteAppUrl(rel);
        return new URL(relUrl, window.location.href).href;
      } catch (e) {}
    }
    var derived = deriveAuctionHref(op);
    if (derived) {
      if (/auction-house-input\.html/i.test(derived)) return derived.replace(/auction-house-input\.html/i, 'auction-house.html');
      if (/\/auction-house\/input\/?$/i.test(derived)) return derived.replace(/\/input\/?$/i, '/');
    }
    try {
      return new URL('/' + String(rel).replace(/^\/+/, ''), window.location.origin).href;
    } catch (e2) {
      return rel;
    }
  }

  function syncOperatorFooterLinks(isAllowed) {
    var groups = document.querySelectorAll('.mv-footer-dot-links');
    var i;
    for (i = 0; i < groups.length; i++) {
      var group = groups[i];
      var corporateLink = group.querySelector('.mv-corporate-dot-link');
      if (corporateLink) {
        corporateLink.textContent = 'Corporate profile';
        corporateLink.setAttribute('title', 'Corporate profile');
        corporateLink.setAttribute('aria-label', 'Corporate profile');
        corporateLink.classList.add('mv-footer-admin-menu-link');
      }
      var pricingLink = group.querySelector('.mv-pricing-dot-link');
      if (pricingLink) {
        pricingLink.textContent = 'Pricing';
        pricingLink.setAttribute('title', 'Pricing');
        pricingLink.setAttribute('aria-label', 'Pricing');
        pricingLink.classList.add('mv-footer-admin-menu-link');
      }
      var operatorLink = group.querySelector('.mv-super-admin-dot-link');
      if (operatorLink) {
        operatorLink.textContent = 'Operator Portal';
        operatorLink.setAttribute('title', 'Operator Portal');
        operatorLink.setAttribute('aria-label', 'Operator Portal');
        operatorLink.classList.add('mv-operator-portal-link', 'mv-footer-admin-menu-link');
      }
      var sportLink = group.querySelector('.mv-sport-dot-link');
      var auctionLink = group.querySelector('.mv-auction-dot-link');
      if (isAllowed) {
        if (!sportLink) {
          sportLink = document.createElement('a');
          sportLink.className = 'mv-sport-dot-link mv-footer-admin-menu-link';
          sportLink.textContent = 'MV Sport';
          sportLink.setAttribute('title', 'MV Sport');
          sportLink.setAttribute('aria-label', 'MV Sport');
          group.appendChild(sportLink);
        }
        var sportHref = deriveSportHref(operatorLink && operatorLink.getAttribute('href'));
        if (sportHref) sportLink.setAttribute('href', sportHref);
        if (!auctionLink) {
          auctionLink = document.createElement('a');
          auctionLink.className = 'mv-auction-dot-link mv-footer-admin-menu-link';
          auctionLink.textContent = 'Auction House';
          auctionLink.setAttribute('title', 'Auction House');
          auctionLink.setAttribute('aria-label', 'Auction House');
          group.appendChild(auctionLink);
        }
        auctionLink.setAttribute('href', auctionHouseLandingHref(operatorLink && operatorLink.getAttribute('href')));
      } else {
        if (sportLink) sportLink.remove();
        if (auctionLink) auctionLink.remove();
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
