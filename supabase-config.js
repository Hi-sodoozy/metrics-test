/**
 * Supabase client for the Metrics app (metrics folder).
 *
 * Dashboard checklist (Authentication → URL Configuration):
 * - Site URL: https://metrics-test-one.vercel.app
 *   (or your exact deploy URL, including /metrics if the app lives in a subpath)
 * - Additional redirect URLs: same origin + /metrics/auth.html (and http://localhost:* for local dev)
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
    var accountType = (meta.account_type === 'business') ? 'business' : 'individual';
    return {
      userId: user.id,
      email: user.email || '',
      accountType: accountType,
      businessName: meta.business_name || '',
      firstName: meta.first_name || '',
      lastName: meta.last_name || ''
    };
  }

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
          data: {
            invite_type: 'collaboration',
            business_name: businessName || '',
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
        .select('first_name,last_name,email,metric_index,owner_user_id,status,permission')
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
        ranking: { enabled: false, displayAsPercent: false, showIndividualGoal: false, rows: [] }
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
      return {
        businessName: (profileRow && profileRow.business_name) ? String(profileRow.business_name) : '',
        businessImage: (profileRow && profileRow.business_image) ? String(profileRow.business_image) : '',
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
        client.from('business_profiles').select('business_name,business_image').eq('owner_user_id', ownerUserId).maybeSingle(),
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
      var profilePromise = includeProfile
        ? client.from('business_profiles').upsert({
            owner_user_id: ownerUserId,
            business_name: name,
            business_image: img
          }, { onConflict: 'owner_user_id' })
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
  }

  window.metricsLogout = function (redirectTo) {
    var dest = redirectTo || 'welcome.html';
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
})();
