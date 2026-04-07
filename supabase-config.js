/**
 * Supabase client for the Metrics app (metrics folder).
 *
 * Dashboard checklist (Authentication → URL Configuration):
 * - Site URL: https://metrics-test-one.vercel.app
 *   (or your exact deploy URL, including /metrics if the app lives in a subpath)
 * - Additional redirect URLs: same origin + /metrics/auth.html?mode=signup (invites + email confirm),
 *   password reset (…/reset-password/), super-admin portal recovery (…/super-admin/?portal_recovery=1),
 *   and http://localhost:* for local dev
 *
 * The anon key is safe to expose in the browser; protect data with Row Level Security (RLS).
 */
(function () {
  var SUPABASE_URL = 'https://atmghlkrmdbrfyondmly.supabase.co';
  var SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bWdobGtybWRicmZ5b25kbWx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NTI3NzEsImV4cCI6MjA4NzEyODc3MX0.RihXzcxLxMCbkx5l5IcAXAwpEguT9zkHEznyI-Nb32U';

  window.METRICS_SUPABASE_URL = SUPABASE_URL;
  var USER_CTX_KEY = 'metricsUserContext';

  function normalizeContextFromUser(user) {
    if (!user) return null;
    var meta = user.user_metadata || {};
    return {
      userId: user.id,
      email: user.email || '',
      accountType: 'user',
      businessName: meta.business_name || '',
      firstName: meta.first_name || '',
      lastName: meta.last_name || ''
    };
  }
  window.metricsNormalizeContextFromUser = normalizeContextFromUser;

  window.metricsGetUserContext = function () {
    try {
      var raw = localStorage.getItem(USER_CTX_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  };

  window.metricsSetUserContext = function (ctx) {
    try {
      if (ctx) localStorage.setItem(USER_CTX_KEY, JSON.stringify(ctx));
      else localStorage.removeItem(USER_CTX_KEY);
    } catch (e) {}
    if (typeof window.metricsSyncSuperAdminFooterDot === 'function') {
      window.metricsSyncSuperAdminFooterDot();
    }
  };

  function init() {
    if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
      console.warn('Metrics: load @supabase/supabase-js before supabase-config.js');
      window.metricsSupabase = null;
      return;
    }
    window.metricsSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });

    function normalizeInviteEmail(email) {
      return String(email || '').trim().toLowerCase();
    }

    function normalizeInvitePermission(p) {
      if (p === 'read') return 'read';
      if (p === 'admin') return 'admin';
      return 'edit';
    }

    // Invite helper used by invite pages and row-level invite actions.
    // Email wording is controlled by Supabase email templates.
    window.metricsSendInvite = function (email, businessName, redirectTo) {
      if (!window.metricsSupabase) {
        return Promise.reject(new Error('Supabase is not initialized.'));
      }
      var em = normalizeInviteEmail(email);
      if (!em) {
        return Promise.reject(new Error('Email is required.'));
      }
      return window.metricsSupabase.auth.signInWithOtp({
        email: em,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectTo,
          // Omit business_name so new users are not given the inviter's workspace in auth metadata.
          data: {
            invite_type: 'collaboration',
          },
        },
      });
    };

    window.metricsUpsertMetricInvite = function (payload) {
      if (!window.metricsSupabase) {
        return Promise.reject(new Error('Supabase is not initialized.'));
      }
      var em = normalizeInviteEmail(payload.email);
      if (!em) {
        return Promise.reject(new Error('Email is required.'));
      }
      var displayName = (payload.name != null ? String(payload.name) : '').trim();
      if (!displayName && payload.firstName) {
        displayName = [payload.firstName, payload.lastName || ''].join(' ').trim();
      }
      return window.metricsSupabase.from('metric_invites').upsert({
        owner_user_id: payload.ownerUserId,
        metric_index: payload.metricIndex,
        email: em,
        first_name: displayName || null,
        last_name: null,
        business_name: payload.businessName || null,
        invited_by_user_id: payload.invitedByUserId || payload.ownerUserId,
        permission: normalizeInvitePermission(payload.permission),
        status: 'invited'
      }, { onConflict: 'owner_user_id,metric_index,email' });
    };

    window.metricsUpdateMetricInvitePermission = function (payload) {
      if (!window.metricsSupabase) {
        return Promise.reject(new Error('Supabase is not initialized.'));
      }
      var em = normalizeInviteEmail(payload.email);
      return window.metricsSupabase
        .from('metric_invites')
        .update({ permission: normalizeInvitePermission(payload.permission) })
        .eq('owner_user_id', payload.ownerUserId)
        .eq('metric_index', payload.metricIndex)
        .eq('email', em)
        .select('email')
        .maybeSingle();
    };

    window.metricsDeleteMetricInvite = function (payload) {
      if (!window.metricsSupabase) {
        return Promise.reject(new Error('Supabase is not initialized.'));
      }
      var em = normalizeInviteEmail(payload.email);
      return window.metricsSupabase
        .from('metric_invites')
        .delete()
        .eq('owner_user_id', payload.ownerUserId)
        .eq('metric_index', payload.metricIndex)
        .eq('email', em);
    };

    window.metricsFetchMetricInvites = function (payload) {
      if (!window.metricsSupabase) {
        return Promise.reject(new Error('Supabase is not initialized.'));
      }
      return window.metricsSupabase
        .from('metric_invites')
        .select('first_name,last_name,email,metric_index,owner_user_id,status,permission,created_at')
        .eq('owner_user_id', payload.ownerUserId)
        .eq('metric_index', payload.metricIndex)
        .order('created_at', { ascending: true });
    };

    window.metricsFetchInvitesForEmail = function (email) {
      if (!window.metricsSupabase) {
        return Promise.reject(new Error('Supabase is not initialized.'));
      }
      var em = normalizeInviteEmail(email);
      return window.metricsSupabase
        .from('metric_invites')
        .select('first_name,last_name,email,metric_index,owner_user_id,business_name,status,permission')
        .eq('email', em)
        .order('created_at', { ascending: true });
    };

    window.metricsSyncContextFromSession = function () {
      if (!window.metricsSupabase) return Promise.resolve(null);
      return window.metricsSupabase.auth.getSession().then(function (res) {
        var user = res && res.data && res.data.session && res.data.session.user;
        var ctx = normalizeContextFromUser(user);
        window.metricsSetUserContext(ctx);
        return ctx;
      }).catch(function () {
        return window.metricsGetUserContext();
      });
    };

    function defaultMetricPayload() {
      return {
        showOnMainScreen: false,
        heading: '',
        goal: '',
        current: '',
        displayAsPercent: false,
        displayAs: 'summary',
        displaySummary: true,
        ranking: {
          enabled: true,
          showSimpleAggregate: false,
          displayAsPercent: false,
          showIndividualGoal: false,
          showIndividualGoalProgress: true,
          rankPerformance: true,
          totalLine: { goal: '', current: '' },
          rows: []
        }
      };
    }

    function slotsRowsToDashboard(profileRow, slotRows) {
      var byIndex = {};
      (slotRows || []).forEach(function (r) {
        byIndex[r.metric_index] = r.payload;
      });
      var metrics = [];
      for (var i = 0; i < 10; i++) {
        metrics.push(byIndex[i] ? JSON.parse(JSON.stringify(byIndex[i])) : defaultMetricPayload());
      }
      var pc = profileRow && profileRow.plan_column != null ? parseInt(profileRow.plan_column, 10) : 3;
      if (isNaN(pc) || pc < 1 || pc > 3) pc = 3;
      return {
        businessName: (profileRow && profileRow.business_name) ? String(profileRow.business_name) : '',
        businessImage: (profileRow && profileRow.business_image) ? String(profileRow.business_image) : '',
        displayBoardColor: (profileRow && profileRow.display_board_color) ? String(profileRow.display_board_color) : '',
        billingContactName: (profileRow && profileRow.billing_contact_name)
          ? String(profileRow.billing_contact_name)
          : '',
        billingContactEmail: (profileRow && profileRow.billing_contact_email)
          ? String(profileRow.billing_contact_email)
          : '',
        planColumn: pc,
        metrics: metrics
      };
    }

    /** Load profile + slots for the given dashboard owner (same id as business_metric_slots.owner_user_id). */
    window.metricsLoadBusinessDashboard = function (ownerUserId) {
      if (!window.metricsSupabase) {
        return Promise.reject(new Error('Supabase is not initialized.'));
      }
      var client = window.metricsSupabase;
      return Promise.all([
        client
          .from('business_profiles')
          .select(
            'business_name,business_image,display_board_color,billing_contact_name,billing_contact_email,plan_column'
          )
          .eq('owner_user_id', ownerUserId)
          .maybeSingle(),
        client.from('business_metric_slots').select('metric_index,payload').eq('owner_user_id', ownerUserId)
      ]).then(function (results) {
        var prof = results[0];
        var slots = results[1];
        if (prof && prof.error) throw prof.error;
        if (slots && slots.error) throw slots.error;
        return slotsRowsToDashboard(prof && prof.data ? prof.data : null, slots && slots.data ? slots.data : []);
      });
    };

    /**
     * Upsert business metric slots (0–9) for a dashboard.
     *
     * @param {string} ownerUserId - The business dashboard owner's UUID (auth.users.id), NOT necessarily
     *   the logged-in user. For the owner editing their own boards this equals auth.uid(); for invited
     *   editors it is the admin's id. RLS (bms_owner_* / bms_invitee_*) enforces who may write which owner row.
     */
    window.metricsSaveBusinessDashboard = function (ownerUserId, dashboardData, allowedMetricIndexes, saveOptions) {
      if (!window.metricsSupabase) {
        return Promise.reject(new Error('Supabase is not initialized.'));
      }
      var opts = saveOptions && typeof saveOptions === 'object' ? saveOptions : {};
      var includeProfile = opts.includeProfile !== false;
      var client = window.metricsSupabase;
      var metrics = (dashboardData && dashboardData.metrics) ? dashboardData.metrics : [];
      var name = dashboardData && dashboardData.businessName != null ? String(dashboardData.businessName) : '';
      var img = dashboardData && dashboardData.businessImage != null ? String(dashboardData.businessImage) : '';
      function buildProfileRow(existingRow) {
        var ex = existingRow || {};
        var dbcOut;
        if (dashboardData && Object.prototype.hasOwnProperty.call(dashboardData, 'displayBoardColor')) {
          dbcOut =
            dashboardData.displayBoardColor != null && String(dashboardData.displayBoardColor).trim()
              ? String(dashboardData.displayBoardColor).trim()
              : null;
        } else {
          dbcOut = ex.display_board_color != null ? String(ex.display_board_color) : null;
        }
        var billNameOut;
        if (dashboardData && Object.prototype.hasOwnProperty.call(dashboardData, 'billingContactName')) {
          billNameOut =
            dashboardData.billingContactName != null ? String(dashboardData.billingContactName) : null;
        } else {
          billNameOut = ex.billing_contact_name != null ? String(ex.billing_contact_name) : null;
        }
        var billEmailOut;
        if (dashboardData && Object.prototype.hasOwnProperty.call(dashboardData, 'billingContactEmail')) {
          billEmailOut =
            dashboardData.billingContactEmail != null ? String(dashboardData.billingContactEmail) : null;
        } else {
          billEmailOut = ex.billing_contact_email != null ? String(ex.billing_contact_email) : null;
        }
        var planColOut;
        if (dashboardData && Object.prototype.hasOwnProperty.call(dashboardData, 'planColumn')) {
          planColOut = parseInt(dashboardData.planColumn, 10);
        } else {
          planColOut = ex.plan_column != null ? parseInt(ex.plan_column, 10) : 3;
        }
        if (isNaN(planColOut) || planColOut < 1 || planColOut > 3) planColOut = 3;
        return {
          owner_user_id: ownerUserId,
          business_name: name,
          business_image: img,
          display_board_color: dbcOut,
          billing_contact_name: billNameOut,
          billing_contact_email: billEmailOut,
          plan_column: planColOut
        };
      }

      var profilePromise = includeProfile
        ? client
            .from('business_profiles')
            .select('display_board_color,billing_contact_name,billing_contact_email,plan_column')
            .eq('owner_user_id', ownerUserId)
            .maybeSingle()
            .then(function (pres) {
              if (pres && pres.error) throw pres.error;
              var existing = pres && pres.data ? pres.data : {};
              return client.from('business_profiles').upsert(buildProfileRow(existing), { onConflict: 'owner_user_id' });
            })
        : Promise.resolve({ data: null, error: null });
      var indices = allowedMetricIndexes;
      if (!indices || !indices.length) {
        indices = [];
        var cap = Math.min(Math.max(metrics.length, 1), 10);
        for (var j = 0; j < cap; j++) indices.push(j);
      }
      // Each row keys data under the dashboard owner (see RLS policies on business_metric_slots).
      var rows = indices.map(function (i) {
        var payload = metrics[i] ? JSON.parse(JSON.stringify(metrics[i])) : defaultMetricPayload();
        return { owner_user_id: ownerUserId, metric_index: i, payload: payload };
      });
      // Upsert = insert if missing, else update (invitees may rely on bms_invitee_insert / bms_invitee_update).
      var slotsPromise = client.from('business_metric_slots').upsert(rows, { onConflict: 'owner_user_id,metric_index' });
      return Promise.all([profilePromise, slotsPromise]).then(function (pair) {
        if (pair[0] && pair[0].error) throw pair[0].error;
        if (pair[1] && pair[1].error) throw pair[1].error;
        return true;
      });
    };

    window.metricsLoadPersonalDashboard = function (userId) {
      if (!window.metricsSupabase) {
        return Promise.reject(new Error('Supabase is not initialized.'));
      }
      return window.metricsSupabase
        .from('personal_dashboards')
        .select('dashboard')
        .eq('user_id', userId)
        .maybeSingle()
        .then(function (res) {
          if (res && res.error) throw res.error;
          var d = res && res.data && res.data.dashboard;
          if (!d || typeof d !== 'object') {
            return { businessName: '', businessImage: '', metrics: [] };
          }
          return {
            businessName: d.businessName != null ? String(d.businessName) : '',
            businessImage: d.businessImage != null ? String(d.businessImage) : '',
            metrics: Array.isArray(d.metrics) ? d.metrics : []
          };
        });
    };

    window.metricsSavePersonalDashboard = function (userId, dashboardData) {
      if (!window.metricsSupabase) {
        return Promise.reject(new Error('Supabase is not initialized.'));
      }
      return window.metricsSupabase
        .from('personal_dashboards')
        .upsert({
          user_id: userId,
          dashboard: {
            businessName: dashboardData.businessName || '',
            businessImage: dashboardData.businessImage || '',
            metrics: dashboardData.metrics || []
          }
        }, { onConflict: 'user_id' })
        .then(function (res) {
          if (res && res.error) throw res.error;
          return true;
        });
    };

    window.metricsCombineSlideOrder = {
      storageKey: function (uid) {
        return 'metricsInputSlideOrder:' + uid;
      },
      defaultKeysFromInvites: function (slotInvites, personalCount) {
        var invites = (slotInvites || []).slice().filter(function (r) {
          return (
            r &&
            r.metric_index != null &&
            r.metric_index >= 0 &&
            r.metric_index <= 9 &&
            r.status !== 'revoked'
          );
        });
        invites.sort(function (a, b) {
          var an = String(a.business_name || '').localeCompare(String(b.business_name || ''));
          if (an !== 0) return an;
          return (a.metric_index || 0) - (b.metric_index || 0);
        });
        var keys = invites.map(function (inv) {
          return 's:' + inv.owner_user_id + ':' + inv.metric_index;
        });
        var i;
        for (i = 0; i < personalCount; i++) keys.push('p:' + i);
        return keys;
      },
      mergeKeys: function (defaultKeys, savedKeys) {
        var seen = {};
        var out = [];
        (savedKeys || []).forEach(function (k) {
          if (typeof k !== 'string') return;
          if (defaultKeys.indexOf(k) >= 0 && !seen[k]) {
            out.push(k);
            seen[k] = true;
          }
        });
        defaultKeys.forEach(function (k) {
          if (!seen[k]) {
            out.push(k);
            seen[k] = true;
          }
        });
        return out;
      },
      loadMerged: function (userId, slotInvites, personalCount) {
        var def = this.defaultKeysFromInvites(slotInvites, personalCount);
        var raw = '';
        try {
          raw = localStorage.getItem(this.storageKey(userId)) || '';
        } catch (e) {}
        var saved = [];
        try {
          saved = raw ? JSON.parse(raw) : [];
        } catch (e2) {
          saved = [];
        }
        if (!Array.isArray(saved)) saved = [];
        return this.mergeKeys(def, saved);
      },
      saveOrder: function (userId, keys) {
        try {
          localStorage.setItem(this.storageKey(userId), JSON.stringify(keys || []));
        } catch (e) {}
      }
    };

    window.metricsFetchAllMetricInvitesForOwner = function (ownerUserId) {
      if (!window.metricsSupabase) {
        return Promise.reject(new Error('Supabase is not initialized.'));
      }
      return window.metricsSupabase
        .from('metric_invites')
        .select('first_name,last_name,email,metric_index,permission,status,created_at')
        .eq('owner_user_id', ownerUserId)
        .order('created_at', { ascending: true });
    };

    window.metricsDeleteAllInvitesForOwnerEmail = function (ownerUserId, email) {
      if (!window.metricsSupabase) {
        return Promise.reject(new Error('Supabase is not initialized.'));
      }
      var em = normalizeInviteEmail(email);
      if (!em) {
        return Promise.reject(new Error('Email is required.'));
      }
      return window.metricsSupabase
        .from('metric_invites')
        .delete()
        .eq('owner_user_id', ownerUserId)
        .eq('email', em);
    };

    window.metricsFetchInvitesForOwnerAndEmail = function (ownerUserId, email) {
      if (!window.metricsSupabase) {
        return Promise.reject(new Error('Supabase is not initialized.'));
      }
      var em = String(email || '').trim().toLowerCase();
      return window.metricsSupabase
        .from('metric_invites')
        .select('metric_index,permission,email,status')
        .eq('owner_user_id', ownerUserId)
        .then(function (res) {
          if (res && res.error) throw res.error;
          var rows = (res && res.data) ? res.data : [];
          var filtered = rows.filter(function (r) {
            return r && String(r.email || '').trim().toLowerCase() === em && r.status !== 'revoked';
          });
          return { data: filtered, error: null };
        });
    };

    window.metricsAppUrl = function (relPath) {
      var r = relPath != null ? String(relPath) : '';
      var path = window.location && window.location.pathname ? window.location.pathname : '/';
      var parts = path.split('/').filter(function (x) {
        return x && x !== 'index.html';
      });
      var depth = parts.length;
      if (depth <= 0) return './' + r;
      var prefix = '';
      var i;
      for (i = 0; i < depth; i++) prefix += '../';
      return prefix + r;
    };

    window.metricsAbsoluteAppUrl = function (relPath) {
      var rel = window.metricsAppUrl(relPath);
      try {
        return new URL(rel, window.location.href).href;
      } catch (e) {
        return rel;
      }
    };
  }

  window.metricsSuperAdminPortalPasswordConfigured = function () {
    if (!window.metricsSupabase) {
      return Promise.reject(new Error('Supabase is not initialized.'));
    }
    return window.metricsSupabase.rpc('super_admin_portal_password_configured').then(function (res) {
      if (res && res.error) throw res.error;
      return !!res.data;
    });
  };

  window.metricsSuperAdminPortalVerifyPassword = function (plain) {
    if (!window.metricsSupabase) {
      return Promise.reject(new Error('Supabase is not initialized.'));
    }
    return window.metricsSupabase.rpc('super_admin_portal_verify_password', { p_plain: plain }).then(function (res) {
      if (res && res.error) throw res.error;
      return !!res.data;
    });
  };

  window.metricsSuperAdminPortalBootstrapPassword = function (newPassword) {
    if (!window.metricsSupabase) {
      return Promise.reject(new Error('Supabase is not initialized.'));
    }
    return window.metricsSupabase.rpc('super_admin_portal_bootstrap_password', { p_new: newPassword }).then(function (res) {
      if (res && res.error) throw res.error;
    });
  };

  window.metricsSuperAdminPortalChangePassword = function (oldPassword, newPassword) {
    if (!window.metricsSupabase) {
      return Promise.reject(new Error('Supabase is not initialized.'));
    }
    return window.metricsSupabase
      .rpc('super_admin_portal_change_password', { p_old: oldPassword, p_new: newPassword })
      .then(function (res) {
        if (res && res.error) throw res.error;
      });
  };

  window.metricsSuperAdminPortalResetPasswordAfterOtp = function (newPassword) {
    if (!window.metricsSupabase) {
      return Promise.reject(new Error('Supabase is not initialized.'));
    }
    return window.metricsSupabase.rpc('super_admin_portal_reset_password_after_otp', { p_new: newPassword }).then(function (res) {
      if (res && res.error) throw res.error;
    });
  };

  window.metricsSuperAdminFetchDirectory = function () {
    if (!window.metricsSupabase) {
      return Promise.reject(new Error('Supabase is not initialized.'));
    }
    return window.metricsSupabase.rpc('super_admin_directory').then(function (res) {
      if (res && res.error) throw res.error;
      return res.data;
    });
  };

  window.metricsLogout = function (redirectTo) {
    var dest = redirectTo || 'https://www.metricsview.com.au/';
    function finish() {
      try {
        if (window.metricsSetUserContext) window.metricsSetUserContext(null);
      } catch (e) {}
      window.location.href = dest;
    }
    if (window.metricsSupabase && window.metricsSupabase.auth && typeof window.metricsSupabase.auth.signOut === 'function') {
      window.metricsSupabase.auth.signOut().then(finish).catch(finish);
    } else {
      finish();
    }
  };

  init();
  if (typeof window.metricsSyncSuperAdminFooterDot === 'function') {
    window.metricsSyncSuperAdminFooterDot();
  }
})();
