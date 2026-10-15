/* Scepter quiz engine: where an email goes after a reader asks for the free ebook.
 *
 * One canonical payload (buildPayload) and one adapter per destination:
 *   demo     nothing leaves the page; the payload is logged and kept in ScepterQuiz.lastCapture
 *   klaviyo  Klaviyo client API: profile + properties, list subscription (only if they agreed),
 *            and a "Completed Scepter Quiz" event
 *   shopify  Shopify's own customer form (/contact, form_type=customer) with customer tags
 *   webhook  JSON to any URL (Zapier, Make, n8n, Google Apps Script, your own server)
 *   custom   window.ScepterQuizCapture(payload) — your own function, returns a promise
 * Site settings live in window.SCEPTER_QUIZ_SETTINGS (see funnels/README.md).
 *
 * What is sent depends on who is asking:
 *   - a reader who agreed to emails: age band, stage, needs, life season, language, the books;
 *   - a reader who did NOT agree, or a parent or guardian's address for a reader under 18:
 *     only which quiz it was and which ebook, never anything about faith, age or needs.
 * Raw answers (Mass, Confession, prayer habits) are never sent unless capture.includeAnswers is on.
 */
(function (root) {
  'use strict';
  var SQ = root.ScepterQuiz = root.ScepterQuiz || {};
  var core = SQ.core;

  function settings() {
    var s = root.SCEPTER_QUIZ_SETTINGS || {};
    s.capture = s.capture || {};
    return s;
  }

  function utm() {
    var out = {};
    try {
      var q = new URLSearchParams(root.location.search);
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) {
        if (q.get(k)) out[k] = q.get(k);
      });
    } catch (e) { /* no location in tests */ }
    return out;
  }

  function makeId() {
    try {
      var a = new Uint32Array(3);
      root.crypto.getRandomValues(a);
      return Array.prototype.map.call(a, function (n) { return n.toString(36); }).join('');
    } catch (e) {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    }
  }

  // Human-readable answers: what the reader actually clicked, for a person reading the record.
  function readableAnswers(quiz, answers) {
    var out = {};
    core.visibleQuestions(quiz, answers).forEach(function (q) {
      var picked = core.asList(answers[q.id]);
      if (!picked.length) return;
      out[q.id] = picked.map(function (oid) {
        var o = q.options.filter(function (x) { return x.id === oid; })[0];
        return o ? o.label : oid;
      });
    });
    return out;
  }

  function buildPayload(quiz, answers, profile, form, ctx) {
    ctx = ctx || {};
    var cap = settings().capture;
    var now = ctx.now || new Date().toISOString();
    var consent = !!form.consent, guardian = !!form.guardian;
    var gift = profile.recipient && profile.recipient !== 'self';
    var limited = !consent || guardian || (!gift && core.isMinor(profile.age));
    var magnet = ctx.magnet ? { id: ctx.magnet.id, title: ctx.magnet.title, url: ctx.magnet.url || null } : null;
    var recs = limited ? [] : (ctx.recs || []);
    return {
      submission_id: ctx.id || makeId(),
      email: String(form.email || '').trim(),
      first_name: String(form.firstName || '').trim() || null,
      consent: consent,
      consent_text: form.consentText || null,
      guardian: guardian,
      limited: limited,
      quiz: { id: quiz.id, title: quiz.meta && quiz.meta.title, version: quiz.version || 1 },
      profile: limited
        ? { recipient: profile.recipient, lang: profile.lang }
        : { recipient: profile.recipient, age: profile.age, stage: profile.stage, needs: profile.needs,
            life: profile.life, format: profile.format, lang: profile.lang, extras: profile.extras },
      tags: core.tagsFor(profile, cap.extraTags, { limited: limited }),
      properties: core.propertiesFor(profile, { now: now, magnet: ctx.magnet, recs: recs, limited: limited }),
      magnet: magnet,
      recommendations: recs.map(function (r) { return { id: r.item.id, title: r.item.title, url: r.item.url || null }; }),
      // Raw answers (Mass, Confession, prayer habits) are religious-practice data: opt-in only.
      answers: cap.includeAnswers && !limited ? readableAnswers(quiz, answers) : undefined,
      page: root.location && root.location.origin ? root.location.origin + root.location.pathname : null,
      utm: utm(),
      submitted_at: now
    };
  }

  // ---- adapters ------------------------------------------------------------------------------

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  var adapters = {};

  adapters.demo = function (payload) {
    SQ.lastCapture = payload;
    try {
      var p = root.location && root.location.protocol;
      if (p === 'http:' || p === 'https:') root.console.warn('[ScepterQuiz] Preview mode: sign-ups are NOT being sent anywhere. Set SCEPTER_QUIZ_SETTINGS.capture.provider.');
      else root.console.info('[ScepterQuiz demo] would send:', payload);
    } catch (e) {}
    return wait(500).then(function () { return { ok: true, provider: 'demo' }; });
  };

  adapters.custom = function (payload) {
    if (typeof root.ScepterQuizCapture !== 'function') return Promise.reject(new Error('window.ScepterQuizCapture is not defined'));
    return Promise.resolve(root.ScepterQuizCapture(payload)).then(function (r) { return r || { ok: true, provider: 'custom' }; });
  };

  // Klaviyo client API (public key only; safe in the browser). Sequential on purpose: the event
  // that starts a welcome flow is sent last, and carries a unique id, so a retry after a partial
  // failure cannot start the flow twice.
  adapters.klaviyo = function (payload, cfg) {
    if (!/^[A-Za-z0-9]{6}$/.test(cfg.companyId || '')) {
      return Promise.reject(new Error('Klaviyo companyId must be the 6-character public API key (site ID), never a private key'));
    }
    var base = cfg.baseUrl || 'https://a.klaviyo.com/client/';
    var q = '?company_id=' + encodeURIComponent(cfg.companyId);
    var headers = {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      revision: cfg.revision || '2025-01-15'
    };
    function post(path, body) {
      return fetch(base + path + q, { method: 'POST', headers: headers, body: JSON.stringify(body) }).then(function (res) {
        if (!res.ok) return res.text().then(function (t) { throw new Error('Klaviyo ' + path + ' ' + res.status + ' ' + t.slice(0, 200)); });
        return res;
      });
    }
    var props = Object.assign({}, payload.properties, { scepter_marketing_consent: payload.consent });
    if (payload.tags.length) props.scepter_tags = payload.tags;
    var profileAttrs = { email: payload.email, properties: props };
    if (payload.first_name) profileAttrs.first_name = payload.first_name;

    var chain = post('profiles', { data: { type: 'profile', attributes: profileAttrs } });
    if (payload.consent && cfg.listId) {
      chain = chain.then(function () {
        return post('subscriptions', {
          data: {
            type: 'subscription',
            attributes: {
              custom_source: 'Scepter quiz: ' + (payload.quiz.title || payload.quiz.id),
              profile: { data: { type: 'profile', attributes: { email: payload.email } } }
            },
            relationships: { list: { data: { type: 'list', id: cfg.listId } } }
          }
        });
      });
    }
    return chain.then(function () {
      return post('events', {
        data: {
          type: 'event',
          attributes: {
            unique_id: payload.submission_id,
            properties: Object.assign({}, props, {
              quiz_title: payload.quiz.title,
              free_ebook_title: payload.magnet && payload.magnet.title,
              free_ebook_url: payload.magnet && payload.magnet.url,
              recommended_titles: payload.recommendations.map(function (r) { return r.title; }),
              recommended_urls: payload.recommendations.map(function (r) { return r.url; }),
              answers: payload.answers,
              page: payload.page
            }),
            metric: { data: { type: 'metric', attributes: { name: cfg.metricName || 'Completed Scepter Quiz' } } },
            profile: { data: { type: 'profile', attributes: { email: payload.email } } }
          }
        }
      });
    }).then(function () { return { ok: true, provider: 'klaviyo' }; });
  };

  // Shopify's own newsletter form, posted into a hidden same-origin iframe. Works only when the
  // quiz is on the shop's own domain. Success is judged from where the iframe lands:
  //   /contact?contact_posted=true  created
  //   /challenge                    Shopify wants a captcha; the iframe is shown for the reader
  //   anything else                 not created: the reader is told to try again
  // A reader who did not agree to emails is not added at all (nothing is posted).
  adapters.shopify = function (payload, cfg, ui) {
    if (!payload.consent) return Promise.resolve({ ok: true, provider: 'shopify', skipped: 'no marketing consent' });
    var doc = root.document;
    var name = 'sq-shopify-' + Math.random().toString(36).slice(2);
    var frame = doc.createElement('iframe');
    frame.name = name;
    frame.title = 'Confirm your sign-up';
    frame.className = 'sq-shopify-frame';
    frame.hidden = true;
    var form = doc.createElement('form');
    form.method = 'post';
    form.action = cfg.endpoint || '/contact#contact_form';
    form.target = name;
    form.hidden = true;
    var fields = {
      form_type: 'customer',
      utf8: '✓',
      'contact[email]': payload.email,
      'contact[tags]': ['newsletter'].concat(payload.tags).join(','),
      'contact[accepts_marketing]': 'true'
    };
    if (payload.first_name) fields['contact[first_name]'] = payload.first_name;
    Object.keys(fields).forEach(function (k) {
      var i = doc.createElement('input');
      i.type = 'hidden'; i.name = k; i.value = fields[k];
      form.appendChild(i);
    });
    var host = (ui && ui.frameHost) || doc.body;
    host.appendChild(frame);
    doc.body.appendChild(form);
    return new Promise(function (resolve, reject) {
      var done = false, armed = false;
      function finish(fn, v) { if (!done) { done = true; try { form.remove(); } catch (e) {} fn(v); } }
      frame.addEventListener('load', function () {
        if (!armed) return;                                  // the empty frame's own first load
        var href = '';
        try { href = frame.contentWindow.location.href; } catch (e) { href = null; }
        if (href === 'about:blank') return;
        if (href === null) return finish(resolve, { ok: true, provider: 'shopify', opaque: true });
        if (/\/challenge/.test(href)) {
          frame.hidden = false;
          if (ui && ui.onChallenge) ui.onChallenge(frame);
          return finish(resolve, { ok: true, provider: 'shopify', challenge: true });
        }
        if (/contact_posted=true/.test(href)) { frame.remove(); return finish(resolve, { ok: true, provider: 'shopify' }); }
        frame.remove();
        finish(reject, new Error('Shopify did not accept the sign-up (' + href + ')'));
      });
      setTimeout(function () { frame.remove(); finish(reject, new Error('Shopify did not answer in time')); }, cfg.timeoutMs || 15000);
      armed = true;
      form.submit();
    });
  };

  // Any URL. Sent as text/plain so the browser needs no CORS preflight (Zapier, Make and Apps
  // Script all read the body as JSON regardless). If the response is hidden by CORS the same body
  // is sent once more with no-cors; both carry the same submission_id, so the receiver can
  // discard the duplicate.
  adapters.webhook = function (payload, cfg) {
    if (!cfg.url) return Promise.reject(new Error('webhook url is not set'));
    var body = JSON.stringify(payload);
    var type = cfg.contentType || 'text/plain;charset=UTF-8';
    return fetch(cfg.url, { method: 'POST', headers: { 'Content-Type': type }, body: body })
      .then(function (res) {
        if (!res.ok) throw new Error('webhook ' + res.status);
        return { ok: true, provider: 'webhook' };
      }, function () {
        return fetch(cfg.url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: body })
          .then(function () { return { ok: true, provider: 'webhook', opaque: true }; });
      });
  };

  function send(payload, ui) {
    var cap = settings().capture;
    var provider = cap.provider || 'demo';
    var adapter = adapters[provider];
    if (!adapter) return Promise.reject(new Error('Unknown capture provider "' + provider + '"'));
    return adapter(payload, cap[provider] || {}, ui);
  }

  // ---- analytics -----------------------------------------------------------------------------
  // Only anonymous milestones leave the page for analytics: which quiz, which step, which book.
  // Never stage, age or needs (religious belief, and sometimes a minor), whatever tag manager
  // happens to be listening.

  function track(name, detail, el) {
    var safe = {};
    ['quiz', 'book', 'magnet'].forEach(function (k) { if (detail && detail[k]) safe[k] = detail[k]; });
    try {
      var ev = new CustomEvent('scepterquiz:' + name, { detail: safe, bubbles: true });
      (el || root.document).dispatchEvent(ev);
    } catch (e) {}
    try {
      if (root.dataLayer && root.dataLayer.push) root.dataLayer.push(Object.assign({ event: 'scepter_quiz_' + name }, safe));
    } catch (e) {}
    try {
      if (root.Shopify && root.Shopify.analytics && root.Shopify.analytics.publish) root.Shopify.analytics.publish('scepter_quiz_' + name, safe);
    } catch (e) {}
  }

  SQ.capture = { buildPayload: buildPayload, send: send, adapters: adapters, settings: settings, readableAnswers: readableAnswers };
  SQ.track = track;
})(typeof window !== 'undefined' ? window : globalThis);
