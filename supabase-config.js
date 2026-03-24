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
  }

  init();
})();
