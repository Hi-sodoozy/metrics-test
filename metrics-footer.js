/**
 * Binds support forms (#mvSupportForm) to open the user's mail client with a pre-filled message.
 */
(function () {
  function bindForm(form) {
    if (!form || form.getAttribute('data-mv-support-bound') === '1') return;
    form.setAttribute('data-mv-support-bound', '1');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var name = (fd.get('mvSupportName') || '').toString().trim();
      var email = (fd.get('mvSupportEmail') || '').toString().trim();
      var company = (fd.get('mvSupportCompany') || '').toString().trim();
      var typ = (fd.get('mvSupportType') || 'Support').toString().trim();
      var message = (fd.get('mvSupportMessage') || '').toString().trim();
      if (!name || !email) {
        alert('Please enter your name and email.');
        return;
      }
      var subject = '[' + typ + '] Metrics View';
      var body =
        'Name: ' +
        name +
        '\nEmail: ' +
        email +
        '\nCompany: ' +
        (company || '—') +
        '\nType: ' +
        typ +
        '\n\nMessage:\n' +
        (message || '—');
      window.location.href =
        'mailto:support@metricsview.com.au?subject=' +
        encodeURIComponent(subject) +
        '&body=' +
        encodeURIComponent(body);
    });
  }

  function init() {
    document.querySelectorAll('#mvSupportForm').forEach(bindForm);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
