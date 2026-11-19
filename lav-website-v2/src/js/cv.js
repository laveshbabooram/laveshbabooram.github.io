/* ============================================================================
   CV on request.

   With site.cvRequest.endpoint set (a Formspree form URL), the request is
   POSTed as JSON and Formspree emails it to you, keeping every submission in
   its dashboard: who, which email, organisation, why, and when (Mauritius
   time, plus the visitor's own timezone). Reply to that email with the CV.

   Without an endpoint it falls back to a pre-filled email from the visitor,
   so the button never dead-ends. No CV file is ever published on the site.
   ========================================================================= */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function muTime(d = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Indian/Mauritius', weekday: 'short', day: 'numeric', month: 'short',
      year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(d) + ' (Mauritius time)';
  } catch {
    return d.toISOString();
  }
}

export function initCv(site) {
  const dlg = document.getElementById('cv-dialog');
  if (!dlg || typeof dlg.showModal !== 'function') {
    // Very old browsers: degrade to the mailto path directly.
    document.addEventListener('click', (e) => {
      if (!e.target.closest('[data-cv-open]')) return;
      window.location.href = `mailto:${site.person.email}?subject=${encodeURIComponent('CV request')}`;
    });
    return;
  }
  const form = dlg.querySelector('form');
  const err = form.querySelector('.form-err');
  const submit = form.querySelector('[type=submit]');
  const submitLabel = submit.querySelector('span');
  const views = {
    form: dlg.querySelector('[data-view="form"]'),
    done: dlg.querySelector('[data-view="done"]'),
  };
  const doneTitle = dlg.querySelector('[data-done-title]');
  const doneText = dlg.querySelector('[data-done-text]');
  const endpoint = (site.cvRequest && site.cvRequest.endpoint) || '';

  const showView = (name) => {
    Object.entries(views).forEach(([k, v]) => { v.hidden = k !== name; });
  };

  function open() {
    if (!views.done.hidden) { form.reset(); showView('form'); }
    clearErrors();
    document.dispatchEvent(new CustomEvent('lav:close-sheet'));
    dlg.showModal();
    setTimeout(() => form.elements.name.focus(), 60);
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-cv-open]')) { e.preventDefault(); open(); }
    if (e.target.closest('[data-cv-close]')) dlg.close();
  });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

  function clearErrors() {
    err.hidden = true;
    err.textContent = '';
    form.querySelectorAll('.field.invalid').forEach((f) => f.classList.remove('invalid'));
  }
  function fail(msg, field) {
    err.innerHTML = '';
    const ico = document.querySelector('#i-alert-circle') ? '<svg class="ico" aria-hidden="true"><use href="#i-alert-circle"/></svg>' : '';
    err.insertAdjacentHTML('beforeend', ico);
    err.append(document.createTextNode(msg));
    err.hidden = false;
    if (field) {
      field.closest('.field').classList.add('invalid');
      field.focus();
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();
    const f = form.elements;
    const name = f.name.value.trim();
    const email = f.email.value.trim();
    const organisation = f.organisation.value.trim();
    const reason = f.reason.value;
    const message = f.message.value.trim();

    if (!name) return fail('Please add your name.', f.name);
    if (!EMAIL_RE.test(email)) return fail('That email address doesn’t look right.', f.email);

    // Honeypot: bots fill every field. Pretend it worked, send nothing.
    if (f._gotcha.value) { finish(email, true); return; }

    const requestedAt = muTime();
    let visitorTz = '';
    try { visitorTz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* ignore */ }

    if (!endpoint) {
      const body = [
        'Hi Lavesh,', '', 'Could you send me your CV?', '',
        `Name: ${name}`, `Email: ${email}`,
        organisation && `Organisation: ${organisation}`,
        `Reason: ${reason}`,
        message && `\n${message}`,
        '', `Requested ${requestedAt}`,
      ].filter(Boolean).join('\n');
      window.location.href = `mailto:${site.person.email}?subject=${encodeURIComponent(`CV request: ${name}${organisation ? ` (${organisation})` : ''}`)}&body=${encodeURIComponent(body)}`;
      finish(email, false, true);
      return;
    }

    submit.disabled = true;
    submitLabel.textContent = 'Sending…';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email, organisation, reason, message,
          requested_at: requestedAt,
          visitor_timezone: visitorTz,
          page: location.href,
          _subject: `CV request: ${name}${organisation ? ` (${organisation})` : ''}`,
          _replyto: email,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      finish(email);
    } catch {
      fail(`Couldn’t send that just now. Email me directly at ${site.person.email} and I’ll get back to you.`);
    } finally {
      submit.disabled = false;
      submitLabel.textContent = 'Send request';
    }
  });

  function finish(email, silent = false, viaMail = false) {
    doneTitle.textContent = viaMail ? 'Almost there' : 'Request sent';
    doneText.textContent = viaMail
      ? 'Your email app should have opened with the request ready to go. Hit send and I’ll reply with the CV.'
      : `Thanks. I’ll reply to ${email} with the CV, usually within a working day. Nothing after two days? Email me at ${site.person.email}.`;
    showView('done');
    if (!silent) dlg.querySelector('[data-view="done"] .btn').focus();
  }
}
