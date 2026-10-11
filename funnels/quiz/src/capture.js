/* Scepter quiz engine: where an email goes after a reader asks for the free ebook.
 *
 * One canonical payload (buildPayload) and one adapter per destination:
 *   demo     nothing leaves the page; the payload is logged and kept in ScepterQuiz.lastCapture
 *   klaviyo  Klaviyo client API: profile + properties, list subscription, "Completed Scepter Quiz" event
 *   shopify  Shopify's own customer form (/contact, form_type=customer) with customer tags
 *   webhook  JSON to any URL (Zapier, Make, n8n, Google Apps Script, your own server)
 *   custom   window.ScepterQuizCapture(payload) — your own function, returns a promise
 * Site settings live in window.SCEPTER_QUIZ_SETTINGS (see funnels/README.md).
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
    var now = ctx.now || new Date().toISOString();
    var magnet = ctx.magnet ? { id: ctx.magnet.id, title: ctx.magnet.title, url: ctx.magnet.url || null } : null;
    var recs = ctx.recs || [];
    return {
      email: String(form.email || '').trim(),
      first_name: String(form.firstName || '').trim() || null,
      consent: !!form.consent,
      consent_text: form.consentText || null,
      guardian: !!form.guardian,
      quiz: { id: quiz.id, title: quiz.meta && quiz.meta.title, version: quiz.version || 1 },
      profile: {
        recipient: profile.recipient, age: profile.age, stage: profile.stage, needs: profile.needs,
        life: profile.life, format: profile.format, lang: profile.lang, extras: profile.extras
      },
      tags: core.tagsFor(profile, settings().capture.extraTags),
      properties: core.propertiesFor(profile, { now: now, magnet: ctx.magnet, recs: recs }),
      magnet: magnet,
      recommendations: recs.map(function (r) { return { id: r.item.id, title: r.item.title, url: r.item.url || null }; }),
      // Raw answers (Mass, Confession, prayer habits) are religious-practice data. They stay out of
      // the record unless the site turns on capture.includeAnswers.
      answers: settings().capture.includeAnswers ? readableAnswers(quiz, answers) : undefined,
      page: root.location ? root.location.href : null,
      referrer: root.document ? root.document.referrer || null : null,
      utm: utm(),
      submitted_at: now
    };
  }

  // ---- adapters ------------------------------------------------------------------------------

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  var adapters = {};

  adapters.demo = function (payload) {
    SQ.lastCapture = payload;
    try { root.console && root.console.info('[ScepterQuiz demo] would send:', payload); } catch (e) {}
    return wait(500).then(function () { return { ok: true, provider: 'demo' }; });
  };

  adapters.custom = function (payload) {
    if (typeof root.ScepterQuizCapture !== 'function') return Promise.reject(new Error('window.ScepterQuizCapture is not defined'));
    return Promise.resolve(root.ScepterQuizCapture(payload)).then(function (r) { return r || { ok: true, provider: 'custom' }; });
  };

  // Klaviyo client API (public key only; safe in the browser).
  adapters.klaviyo = function (payload, cfg) {
    if (!cfg.companyId) return Promise.reject(new Error('Klaviyo companyId (public API key) is not set'));
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
    var props = Object.assign({}, payload.properties, {
      scepter_marketing_consent: payload.consent,
      scepter_tags: payload.tags
    });
    var profileAttrs = { email: payload.email, properties: props };
    if (payload.first_name) profileAttrs.first_name = payload.first_name;

    var steps = [post('profiles', { data: { type: 'profile', attributes: profileAttrs } })];
    if (payload.consent && cfg.listId) {
      steps.push(post('subscriptions', {
        data: {
          type: 'subscription',
          attributes: {
            custom_source: 'Scepter quiz: ' + (payload.quiz.title || payload.quiz.id),
            profile: { data: { type: 'profile', attributes: { email: payload.email } } }
          },
          relationships: { list: { data: { type: 'list', id: cfg.listId } } }
        }
      }));
    }
    // The event carries everything a flow needs to branch on: stage, age, needs, the ebook.
    steps.push(post('events', {
      data: {
        type: 'event',
        attributes: {
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
    }));
    return Promise.all(steps).then(function () { return { ok: true, provider: 'klaviyo' }; });
  };

  // Shopify's own newsletter form, posted into a hidden same-origin iframe. Works only when the
  // quiz is on the shop's own domain. If Shopify asks for a captcha, the iframe is shown so the
  // reader can answer it; the ebook is already on screen either way.
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
    return new Promise(function (resolve) {
      var done = false;
      function finish(r) { if (!done) { done = true; form.remove(); resolve(r); } }
      frame.addEventListener('load', function () {
        var href = '';
        try { href = frame.contentWindow.location.href; } catch (e) { href = ''; }
        if (/challenge/.test(href)) {
          frame.hidden = false;
          if (ui && ui.onChallenge) ui.onChallenge(frame);
          finish({ ok: true, provider: 'shopify', challenge: true });
        } else {
          frame.remove();
          finish({ ok: true, provider: 'shopify', url: href });
        }
      });
      setTimeout(function () { finish({ ok: true, provider: 'shopify', timeout: true }); }, cfg.timeoutMs || 15000);
      form.submit();
    });
  };

  // Any URL. Sent as text/plain so the browser needs no CORS preflight (Zapier, Make and Apps
  // Script all read the body as JSON regardless).
  adapters.webhook = function (payload, cfg) {
    if (!cfg.url) return Promise.reject(new Error('webhook url is not set'));
    var body = JSON.stringify(payload);
    var type = cfg.contentType || 'text/plain;charset=UTF-8';
    return fetch(cfg.url, { method: 'POST', headers: { 'Content-Type': type }, body: body })
      .then(function (res) {
        if (!res.ok) throw new Error('webhook ' + res.status);
        return { ok: true, provider: 'webhook' };
      }, function () {
        // The endpoint may not answer CORS; send it blind rather than lose the sign-up.
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

  function track(name, detail, el) {
    detail = detail || {};
    try {
      var ev = new CustomEvent('scepterquiz:' + name, { detail: detail, bubbles: true });
      (el || root.document).dispatchEvent(ev);
    } catch (e) {}
    try {
      if (root.dataLayer && root.dataLayer.push) root.dataLayer.push(Object.assign({ event: 'scepter_quiz_' + name }, detail));
    } catch (e) {}
    try {
      if (root.Shopify && root.Shopify.analytics && root.Shopify.analytics.publish) root.Shopify.analytics.publish('scepter_quiz_' + name, detail);
    } catch (e) {}
  }

  SQ.capture = { buildPayload: buildPayload, send: send, adapters: adapters, settings: settings, readableAnswers: readableAnswers };
  SQ.track = track;
})(typeof window !== 'undefined' ? window : globalThis);
