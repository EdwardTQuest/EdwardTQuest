/* The Claude kit in the Scepter quizzes world. Stands in for Shopify and the email services so the
   quizzes and pop-ups run as they would on scepterpublishers.org, in test mode:
   - the catalogue is a snapshot of the store (live/), and book links open the real store;
   - the lead calls (Omnisend, Klaviyo, a webhook, Shopify's newsletter form) and the cart are caught
     here and listed in the "Test mode" panel, which shows what the store would have sent;
   - nothing leaves the page (the world's CSP would refuse it anyway).
   It also builds the config the Liquid sections print (worldConfig). Adapted from demo/demo.js. */
(function () {
  'use strict';
  var STORE = 'https://scepterpublishers.org/';
  var ASSETS = document.currentScript.src.replace(/[^\/]*$/, '');
  var DATA = ASSETS + 'live/';
  var PAGES = ASSETS.replace(/assets\/$/, '');
  window.worldStore = STORE;
  window.worldData = DATA;
  window.worldPages = PAGES;

  var realFetch = window.fetch.bind(window);
  var cache = {};
  function json(url) {
    return cache[url] || (cache[url] = realFetch(url, { credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) throw new Error(url + ': HTTP ' + r.status);
      return r.json();
    }));
  }
  window.worldJson = json;
  function respond(body, status) {
    var s = status || 200;
    return Promise.resolve(new Response(s === 204 ? null : typeof body === 'string' ? body : JSON.stringify(body),
      { status: s, headers: { 'Content-Type': 'application/json' } }));
  }
  function form(body) { return body && typeof body.entries === 'function' ? Object.fromEntries(body.entries()) : String(body || ''); }
  function parsed(body) { try { return JSON.parse(body); } catch (e) { return String(body || ''); } }
  function img(src, width) { return src ? src + (src.indexOf('?') >= 0 ? '&' : '?') + 'width=' + width : ''; }

  // ---- the test-mode panel ----
  var panel;
  function ensurePanel() {
    if (panel || !document.body) return panel;
    panel = document.createElement('details');
    panel.className = 'w-inspector';
    panel.innerHTML = '<summary>Test mode · what would be sent <span>0</span></summary>' +
      '<p>Nothing here left this page. On the store, these calls would go to Omnisend and Shopify.</p><ol></ol>';
    document.body.appendChild(panel);
    return panel;
  }
  function log(kind, detail) {
    ensurePanel();
    var li = document.createElement('li');
    li.innerHTML = '<strong></strong><pre></pre>';
    li.querySelector('strong').textContent = kind;
    li.querySelector('pre').textContent = typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2);
    panel.querySelector('ol').prepend(li);
    var n = panel.querySelector('summary span');
    n.textContent = String(Number(n.textContent) + 1);
    panel.classList.remove('is-new');
    void panel.offsetWidth;
    panel.classList.add('is-new');
  }
  window.worldLog = log;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensurePanel);
  else ensurePanel();

  // A stand-in for Omnisend's launcher, so the panel shows what Omnisend would receive.
  window.omnisend = Object.assign([], {
    identifyContact: function (c) { log('Omnisend · identify contact', c); },
    push: function (x) { log('Omnisend · ' + x[0] + ' "' + x[1] + '"', x[2]); }
  });

  function productJs(p) {
    return {
      id: p.id, handle: p.handle, title: p.title, vendor: p.vendor, tags: p.tags, url: STORE + 'products/' + p.handle,
      featured_image: p.images && p.images[0] ? p.images[0].src : null,
      price: Math.min.apply(null, p.variants.map(function (v) { return Math.round(Number(v.price) * 100); })), // Shopify: the cheapest variant
      variants: p.variants.map(function (v) { return { id: v.id, available: v.available, price: Math.round(Number(v.price) * 100) }; })
    };
  }

  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : input.url;
    var u = new URL(url, location.href);
    var body = init && init.body;
    if (/(^|\.)klaviyo\.com$/.test(u.hostname)) { log('Klaviyo · ' + u.pathname, parsed(body)); return respond({}, 202); }
    if (u.hostname === 'hooks.example.com') { log('Webhook', form(body)); return respond('', 200); }
    if (u.pathname === '/contact') { log('Shopify · newsletter sign-up', form(body)); return respond('<html></html>', 200); }
    if (u.pathname === '/cart/add.js') { log('Shopify · add to cart', parsed(body)); return respond({ items: [] }); }
    if (u.pathname === '/products.json') {
      var page = Number(u.searchParams.get('page') || 1);
      return json(DATA + 'products.json').then(function (j) { return respond(page === 1 ? { products: j.products } : { products: [] }); });
    }
    var m = u.pathname.match(/^\/products\/([a-z0-9-]+)\.js$/);
    if (m) {
      return json(DATA + 'products.json').then(function (j) {
        var p = j.products.filter(function (x) { return x.handle === m[1]; })[0];
        return p ? respond(productJs(p)) : respond({}, 404);
      });
    }
    if (u.origin !== location.origin) { log('Held back (test mode) · ' + u.host, u.pathname); return respond(null, 204); }
    return realFetch(input, init);
  };

  // A product as the Liquid snippet prints it: the first available variant's price and id.
  function printed(p) {
    var v = p.variants.filter(function (x) { return x.available !== false; })[0] || p.variants[0];
    return {
      id: p.id, handle: p.handle, title: p.title, vendor: p.vendor, type: p.product_type, tags: p.tags, available: true,
      price_cents: Math.round(Number(v.price) * 100), variant: v.id, image: img(p.images && p.images[0] ? p.images[0].src : '', 360),
      url: STORE + 'products/' + p.handle, excerpt: String(p.body_html || '').replace(/<[^>]+>/g, '')
    };
  }
  window.worldProduct = printed;

  // The config the quiz section prints on the store, from the snapshot and the section's settings.
  window.worldConfig = function (variant, overrides) {
    return Promise.all([json(DATA + 'store.json'), json(DATA + 'products.json'), json(DATA + 'sections.json')]).then(function (r) {
      var s = r[0], pj = r[1], section = r[2][variant] || {};
      var rules = s.rules[variant] || [], featured = s.featured[variant] || [];
      var wanted = {};
      // Liquid prints the best-sellers, the trending list, the rules' and featured books and the
      // curated library; the rest of the catalogue comes from /products.json while the reader answers.
      s.lists.bestsellers.concat(s.lists.trending, featured, s.library.map(function (e) { return e.handle; }))
        .forEach(function (hd) { wanted[hd] = 1; });
      rules.forEach(function (rule) { (rule.products || []).forEach(function (hd) { wanted[hd] = 1; }); });
      return Object.assign({
        variant: variant, rootUrl: STORE, currency: 'USD', fetchCatalog: true,
        products: pj.products.filter(function (p) { return wanted[p.handle]; }).map(printed),
        lists: s.lists, topicMap: s.topicMap, library: s.library, rules: rules, featured: featured,
        settings: section.settings || { bestsellerShare: variant === 'treasures' ? 0.55 : 0.7, maxPerAuthor: 2 },
        lead: { omnisend: { enabled: true, waitMs: 0 }, shopify: true, sensitive: false },
        testMode: true,
        planPageUrl: PAGES + 'plan/', quizUrl: PAGES + variant + '/', privacyUrl: STORE + 'policies/privacy-policy'
      }, overrides || {});
    });
  };
})();
