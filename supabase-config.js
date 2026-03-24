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

    // Invite helper used by invite pages and row-level invite actions.
    // Email wording is controlled by Supabase email templates.
    window.metricsSendInvite = function (email, businessName, redirectTo) {
      if (!window.metricsSupabase) {
        return Promise.reject(new Error('Supabase is not initialized.'));
      }
      return window.metricsSupabase.auth.signInWithOtp({
        email: email,
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
      return window.metricsSupabase.from('metric_invites').upsert({
        owner_user_id: payload.ownerUserId,
        metric_index: payload.metricIndex,
        email: payload.email,
        first_name: payload.firstName || null,
        last_name: payload.lastName || null,
        business_name: payload.businessName || null,
        invited_by_user_id: payload.invitedByUserId || payload.ownerUserId,
        permission: payload.permission === 'read' ? 'read' : 'edit',
        status: 'invited'
      }, { onConflict: 'owner_user_id,metric_index,email' });
    };

    window.metricsDeleteMetricInvite = function (payload) {
      if (!window.metricsSupabase) {
        return Promise.reject(new Error('Supabase is not initialized.'));
      }
      return window.metricsSupabase
        .from('metric_invites')
        .delete()
        .eq('owner_user_id', payload.ownerUserId)
        .eq('metric_index', payload.metricIndex)
        .eq('email', payload.email);
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
      return window.metricsSupabase
        .from('metric_invites')
        .select('first_name,last_name,email,metric_index,owner_user_id,business_name,status,permission')
        .ilike('email', String(email || '').trim())
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
  }

  init();
})();
