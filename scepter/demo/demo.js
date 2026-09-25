/* Local preview harness. Stands in for Shopify: serves the mock catalogue at /products.json,
   answers /cart/add.js and /products/<handle>.js, catches the lead calls (Klaviyo, webhook,
   Shopify form) and shows them in a panel, and builds the same config the Liquid sections emit. */
(function () {
  'use strict';
  var BASE = document.currentScript.src.replace(/demo\.js.*$/, '');
  var MOCK = BASE + 'mock/';
  var realFetch = window.fetch.bind(window);
  var cache = {};
  function json(url) { return cache[url] || (cache[url] = realFetch(url).then(function (r) { return r.json(); })); }
  function respond(body, status, extra) {
    return Promise.resolve(new Response(typeof body === 'string' ? body : JSON.stringify(body),
      Object.assign({ status: status || 200, headers: { 'Content-Type': 'application/json' } }, extra || {})));
  }

  var panel;
  function log(kind, detail) {
    if (!panel) {
      panel = document.createElement('details');
      panel.className = 'demo-inspector';
      panel.innerHTML = '<summary>Lead inspector <span>0</span></summary><ol></ol>';
      document.body.appendChild(panel);
    }
    var li = document.createElement('li');
    li.innerHTML = '<strong></strong><pre></pre>';
    li.querySelector('strong').textContent = kind;
    li.querySelector('pre').textContent = typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2);
    panel.querySelector('ol').prepend(li);
    var n = panel.querySelector('summary span');
    n.textContent = String(Number(n.textContent) + 1);
  }
  window.demoLog = log;

  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : input.url;
    var u = new URL(url, location.href);
    if (/klaviyo\.com/.test(u.host)) { log('Klaviyo ' + u.pathname, JSON.parse(init.body)); return respond({}, 202); }
    if (u.host === 'hooks.example.com') { log('Webhook', Object.fromEntries(init.body.entries())); return respond('', 200); }
    if (u.pathname === '/contact') { log('Shopify customer form', Object.fromEntries(init.body.entries())); return respond('<html></html>', 200); }
    if (u.pathname === '/products.json') {
      var page = Number(u.searchParams.get('page') || 1);
      return json(MOCK + 'products.json').then(function (j) { return respond(page === 1 ? j : { products: [] }); });
    }
    var m = u.pathname.match(/^\/products\/([a-z0-9-]+)\.js$/);
    if (m) {
      return json(MOCK + 'products.json').then(function (j) {
        var p = j.products.filter(function (x) { return x.handle === m[1]; })[0];
        if (!p) return respond({}, 404);
        return respond({ id: p.id, handle: p.handle, title: p.title, vendor: p.vendor, tags: p.tags, url: '/products/' + p.handle, featured_image: null,
          price: Math.round(Number(p.variants[0].price) * 100), variants: p.variants.map(function (v) { return { id: v.id, available: v.available, price: Math.round(Number(v.price) * 100) }; }) });
      });
    }
    if (u.pathname === '/cart/add.js') { log('Add to cart', JSON.parse(init.body)); return respond({ items: [] }); }
    return realFetch(input, init);
  };

  // The config a Liquid section would print, from the mock store.
  window.demoConfig = function (variant, overrides) {
    return json(MOCK + 'store.json').then(function (s) {
      return json(MOCK + 'products.json').then(function (pj) {
        var wanted = {};
        s.lists.bestsellers.concat(s.lists.trending, s.library.map(function (e) { return e.handle; })).forEach(function (h) { wanted[h] = 1; });
        // Liquid prints only the bestsellers, trending and curated products; the rest comes from /products.json.
        var products = pj.products.filter(function (p) { return wanted[p.handle]; }).map(function (p) {
          return { id: p.id, handle: p.handle, title: p.title, vendor: p.vendor, type: p.product_type, tags: p.tags, available: true,
            price_cents: Math.round(Number(p.variants[0].price) * 100), variant: p.variants[0].id, image: '', url: '/products/' + p.handle,
            excerpt: p.body_html.replace(/<[^>]+>/g, '') };
        });
        return Object.assign({
          variant: variant, rootUrl: '/', currency: 'USD', products: products, lists: s.lists, topicMap: s.topicMap,
          library: s.library, rules: s.rules, featured: s.featured[variant] || [],
          settings: { bestsellerShare: variant === 'treasures' ? 0.55 : 0.7, maxPerAuthor: 2 },
          lead: { klaviyo: { publicKey: 'DEMO12', listId: 'AbC123' }, webhook: 'https://hooks.example.com/scepter', shopify: true, sensitive: false },
          planPageUrl: '/scepter/demo/plan.html', quizUrl: '/scepter/demo/quiz.html?v=' + variant, privacyUrl: '#privacy'
        }, overrides || {});
      });
    });
  };
})();
