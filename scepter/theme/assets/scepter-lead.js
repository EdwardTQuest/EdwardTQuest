/*!
 * Scepter lead capture — one call, four optional channels:
 *   Klaviyo (client API: subscribe to a list + record an event that carries the reading plan),
 *   Omnisend (the store's app embed: identify the contact + record the same event),
 *   a webhook (Zapier, Make, n8n, your own endpoint), and Shopify's own customer/newsletter form.
 * Each channel is independent; a failure in one never blocks the others or the visitor.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else if (!root.ScepterLead) root.ScepterLead = factory(); // safe to include twice on one page
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var KLAVIYO_REVISION = '2024-10-15';
  var SENSITIVE = ['religion', 'gender'];

  function clean(obj, sensitive) {
    var out = {};
    Object.keys(obj || {}).forEach(function (k) {
      if (!sensitive && SENSITIVE.indexOf(k) >= 0) return;
      var v = obj[k];
      if (v === undefined || v === null || v === '') return;
      out[k] = v;
    });
    return out;
  }

  function klaviyo(cfg, lead, fetcher) {
    var key = cfg.publicKey, base = 'https://a.klaviyo.com/client/';
    var headers = { 'Content-Type': 'application/json', revision: KLAVIYO_REVISION };
    var profile = { type: 'profile', attributes: { email: lead.email, first_name: lead.firstName || undefined, properties: lead.properties } };
    var calls = [];
    if (cfg.listId && lead.marketing !== false) {
      calls.push(fetcher(base + 'subscriptions/?company_id=' + encodeURIComponent(key), {
        method: 'POST', headers: headers,
        body: JSON.stringify({ data: { type: 'subscription', attributes: { custom_source: lead.source, profile: { data: profile } },
          relationships: { list: { data: { type: 'list', id: cfg.listId } } } } })
      }));
    }
    if (lead.eventName) {
      calls.push(fetcher(base + 'events/?company_id=' + encodeURIComponent(key), {
        method: 'POST', headers: headers,
        body: JSON.stringify({ data: { type: 'event', attributes: {
          properties: lead.eventProperties || {},
          metric: { data: { type: 'metric', attributes: { name: lead.eventName } } },
          profile: { data: profile }
        } } })
      }));
    }
    return Promise.all(calls).then(function (rs) {
      return rs.every(function (r) { return r.ok || r.status === 202; });
    });
  }

  // Form-encoded, no preflight: Zapier and Make parse it, and CORS never gets in the way.
  function webhook(url, lead, fetcher) {
    var body = new URLSearchParams();
    body.set('email', lead.email);
    if (lead.firstName) body.set('first_name', lead.firstName);
    body.set('source', lead.source || '');
    body.set('tags', (lead.tags || []).join(','));
    body.set('accepts_marketing', lead.marketing === false ? 'no' : 'yes');
    Object.keys(lead.properties || {}).forEach(function (k) {
      var v = lead.properties[k];
      body.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    });
    body.set('payload', JSON.stringify({ email: lead.email, first_name: lead.firstName, source: lead.source,
      tags: lead.tags, properties: lead.properties, event: lead.eventName, event_properties: lead.eventProperties }));
    return fetcher(url, { method: 'POST', mode: 'no-cors', body: body }).then(function () { return true; });
  }

  // Shopify's newsletter form: creates (or tags) a customer who accepts marketing. The final URL
  // tells us whether it worked or whether Shopify wants a captcha (then the other channels carry it).
  function shopify(cfg, lead, fetcher) {
    var body = new URLSearchParams();
    body.set('form_type', 'customer');
    body.set('utf8', '✓');
    body.set('contact[email]', lead.email);
    if (lead.firstName) body.set('contact[first_name]', lead.firstName);
    body.set('contact[tags]', ['newsletter'].concat(lead.tags || []).join(', '));
    return fetcher((cfg.rootUrl || '/') + 'contact#contact_form', {
      method: 'POST', body: body, credentials: 'same-origin', redirect: 'follow'
    }).then(function (r) {
      var url = r.url || '';
      if (/\/challenge/.test(url)) return false;
      return r.ok || /customer_posted=true/.test(url);
    });
  }

  // Omnisend's browser API (https://api-docs.omnisend.com/reference/javascript-snippet) can
  // identify a contact and record a custom event; it cannot subscribe anyone. Subscribing is
  // left to Shopify's newsletter form, which Omnisend syncs. Event properties go as flat strings
  // (plan_1_title, plan_1_url …): Omnisend's docs disagree on nested values, and every template
  // can print a flat one.
  function flatten(obj, prefix, out) {
    out = out || {};
    Object.keys(obj || {}).forEach(function (k) {
      var v = obj[k], key = (prefix ? prefix + '_' : '') + String(k).replace(/[^A-Za-z0-9_]+/g, '_');
      if (v === null || v === undefined || v === '') return;
      if (Array.isArray(v)) {
        if (v.every(function (x) { return x === null || typeof x !== 'object'; })) out[key] = v.join(', ');
        else v.forEach(function (x, i) { flatten(x, key + '_' + (i + 1), out); });
      } else if (typeof v === 'object') flatten(v, key, out);
      else out[key] = String(v);
    });
    return out;
  }
  function omnisend(lead, win, waitMs) {
    return new Promise(function (resolve) {
      var tries = 0, most = Math.ceil((waitMs === undefined ? 6000 : waitMs) / 250);
      (function go() {
        var o = win.omnisend;
        var ready = !!(o && typeof o.identifyContact === 'function');
        if (!ready && tries++ < most) { setTimeout(go, 250); return; } // the launcher can take a few seconds
        try {
          win.omnisend = win.omnisend || [];
          if (ready) win.omnisend.identifyContact({ email: lead.email });
          if (lead.eventName) {
            win.omnisend.push(['track', lead.eventName, { origin: 'api', contact: { email: lead.email },
              properties: flatten(Object.assign({ email: lead.email, first_name: lead.firstName }, lead.eventProperties)) }]);
          }
          resolve(ready); // queued, not confirmed, when the launcher never arrived
        } catch (e) { resolve(false); }
      })();
    });
  }

  function timeout(p, ms) {
    return Promise.race([p, new Promise(function (resolve) { setTimeout(function () { resolve('timeout'); }, ms); })]);
  }

  /**
   * submit(config, lead)
   *   config: { klaviyo: {publicKey, listId}, omnisend: {enabled}, webhook: url, shopify: bool, rootUrl, sensitive: bool, fetch, window }
   *   lead:   { email, firstName, source, tags: [], properties: {}, eventName, eventProperties: {} }
   * Resolves (never rejects) to { ok: any channel succeeded, channels: {name: true|false|'timeout'|'error'} }.
   */
  function submit(config, lead) {
    config = config || {};
    var fetcher = config.fetch || (typeof fetch !== 'undefined' ? fetch.bind(typeof window !== 'undefined' ? window : undefined) : null);
    var sensitive = !!config.sensitive;
    lead = Object.assign({}, lead, {
      properties: clean(lead.properties, sensitive),
      eventProperties: clean(lead.eventProperties, sensitive),
      tags: (lead.tags || []).filter(Boolean).map(function (t) { return String(t).toLowerCase().replace(/[^a-z0-9:_-]+/g, '-').slice(0, 60); })
    });
    var jobs = {};
    if (fetcher && config.klaviyo && config.klaviyo.publicKey) jobs.klaviyo = klaviyo(config.klaviyo, lead, fetcher);
    var win = config.window || (typeof window !== 'undefined' ? window : null);
    if (win && config.omnisend && config.omnisend.enabled) jobs.omnisend = omnisend(lead, win, config.omnisend.waitMs);
    if (fetcher && config.webhook) jobs.webhook = webhook(config.webhook, lead, fetcher);
    if (fetcher && config.shopify && lead.marketing !== false) jobs.shopify = shopify(config, lead, fetcher);
    var names = Object.keys(jobs);
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('scepter:lead', { detail: { source: lead.source, tags: lead.tags } }));
        if (window.dataLayer && window.dataLayer.push) window.dataLayer.push({ event: 'scepter_lead', scepter_source: lead.source });
      } catch (e) { /* analytics are best-effort */ }
    }
    return Promise.all(names.map(function (n) {
      return timeout(jobs[n], 8000).then(function (v) { return v; }, function () { return 'error'; });
    })).then(function (results) {
      var channels = {};
      names.forEach(function (n, i) { channels[n] = results[i]; });
      return { ok: results.some(function (v) { return v === true; }), channels: channels };
    });
  }

  function validEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim()); }

  // Can any channel send the reader an email (so the page may say "we've emailed you")?
  function emails(config) {
    config = config || {};
    return !!((config.klaviyo && config.klaviyo.publicKey) || (config.omnisend && config.omnisend.enabled) || config.webhook);
  }

  return { submit: submit, validEmail: validEmail, emails: emails, _internal: { clean: clean, flatten: flatten } };
});
