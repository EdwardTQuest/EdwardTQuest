/*!
 * Scepter pop-ups: the free e-book offer and the temperament test.
 * Mount: an element with [data-sp-popup="ebook"] or [data-sp-popup="temperament"] containing
 * <script type="application/json" data-sp-config>. Needs scepter-lead.js (and, for the test,
 * scepter-temperament.js).
 *
 * Etiquette: one pop-up at a time; never on top of a quiz; never twice in a session; a dismissed
 * offer stays away for N days, a converted one for a year. Links to #free-ebook or
 * #temperament-test (or any [data-sp-open="ebook|temperament"]) always open them.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else if (!root.ScepterPopups) root.ScepterPopups = factory(); // safe to include twice on one page
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === undefined || v === null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    (Array.isArray(kids) ? kids : kids === undefined ? [] : [kids]).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }
  function get(kind, key) { try { return (kind === 'local' ? localStorage : sessionStorage).getItem(key); } catch (e) { return null; } }
  function set(kind, key, v) { try { (kind === 'local' ? localStorage : sessionStorage).setItem(key, v); } catch (e) { /* private mode */ } }
  function emit(name, detail) {
    try {
      window.dispatchEvent(new CustomEvent('scepter:' + name, { detail: detail }));
      if (window.dataLayer && window.dataLayer.push) window.dataLayer.push(Object.assign({ event: 'scepter_' + name.replace(/:/g, '_') }, detail));
    } catch (e) { /* analytics are best-effort */ }
  }
  function money(n, currency) {
    if (!(n > 0)) return '';
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(n); }
    catch (e) { return '$' + Number(n).toFixed(2); }
  }
  // Defaults, overridden only by values that are really there (a cleared theme-editor field is "").
  function merge(defaults, over) {
    var out = Object.assign({}, defaults);
    Object.keys(over || {}).forEach(function (k) { var v = over[k]; if (v !== '' && v !== null && v !== undefined) out[k] = v; });
    return out;
  }
  function readConfig(el) {
    var node = el.querySelector('script[data-sp-config]');
    try { return node ? JSON.parse(node.textContent) : {}; } catch (e) { return {}; }
  }
  var designMode = function () { return !!(window.Shopify && window.Shopify.designMode); };

  // A drawn cover when there is no image (same look as the quiz).
  var TONES = ['#1f3d2e', '#6f1d2c', '#2d5842', '#3b4a3f', '#57222e', '#264c3a'];
  function cover(item, cls) {
    if (item.image) return h('img', { class: 'sp-cover ' + (cls || ''), src: item.image, alt: '', loading: 'lazy' });
    var x = 0; String(item.title || '').split('').forEach(function (c) { x = (x * 31 + c.charCodeAt(0)) | 0; });
    return h('div', { class: 'sp-cover sp-cover--drawn ' + (cls || ''), style: '--sp-tone:' + TONES[Math.abs(x) % TONES.length], 'aria-hidden': 'true' }, [
      h('span', { class: 'sp-cover__rule' }), h('span', { class: 'sp-cover__title', text: String(item.title || '').split(':')[0] }),
      item.author ? h('span', { class: 'sp-cover__author', text: item.author }) : null
    ]);
  }

  // ---------------------------------------------------------------------------------------------
  // The modal manager
  // ---------------------------------------------------------------------------------------------

  var current = null;
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

  function createModal(opts) {
    var content = h('div', { class: 'sp-modal__content' });
    var closeBtn = h('button', { type: 'button', class: 'sp-modal__close', 'aria-label': 'Close', html: '<span aria-hidden="true">&times;</span>' });
    var dialog = h('div', { class: 'sp-modal__dialog', tabindex: '-1' }, [closeBtn, content]);
    var scrim = h('div', { class: 'sp-modal__scrim' });
    var root = h('div', { class: 'sp sp-modal ' + (opts.theme === 'dark' ? 'sp-dark ' : '') + (opts.narrow ? 'sp-modal--narrow ' : '') + (opts.className || ''),
      role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.label || '', hidden: true, 'data-sp-modal': opts.id }, [scrim, dialog]);
    if (opts.style) root.setAttribute('style', opts.style);
    document.body.appendChild(root);
    var lastFocus = null;
    var api = {
      root: root, dialog: dialog, content: content, onHide: null,
      isOpen: function () { return !root.hidden; },
      show: function () {
        if (current && current !== api) current.hide('replaced');
        lastFocus = document.activeElement;
        root.hidden = false;
        document.documentElement.classList.add('sp-noscroll');
        current = api;
        setTimeout(function () { var f = dialog.querySelector('[autofocus]') || dialog; try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }, 30);
      },
      hide: function (reason) {
        if (root.hidden) return;
        root.hidden = true;
        document.documentElement.classList.remove('sp-noscroll');
        if (current === api) current = null;
        if (api.onHide) api.onHide(reason || 'close');
        if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) { /* gone */ } }
      },
      destroy: function () { api.hide('destroy'); root.remove(); }
    };
    closeBtn.addEventListener('click', function () { api.hide('dismiss'); });
    scrim.addEventListener('click', function () { api.hide('dismiss'); });
    root.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { ev.preventDefault(); api.hide('dismiss'); return; }
      if (ev.key !== 'Tab') return;
      var f = Array.prototype.filter.call(dialog.querySelectorAll(FOCUSABLE), function (n) { return n.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (ev.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
    });
    return api;
  }

  // Auto-open etiquette and triggers shared by both pop-ups.
  function excluded(cfg, path) {
    return (cfg.excludePaths || []).some(function (p) { p = String(p || '').trim(); return p && path.indexOf(p) === 0; });
  }
  function canAutoOpen(id, cfg) {
    if (designMode()) return false;
    if (get('local', 'sp:' + id + ':converted')) return false;
    var dismissed = Number(get('local', 'sp:' + id + ':dismissed') || 0);
    if (dismissed && Date.now() - dismissed < (cfg.suppressDays || 14) * 86400000) return false;
    if (get('session', 'sp:' + id + ':shown')) return false;
    var path = window.location.pathname;
    if (excluded(cfg, path)) return false;
    if (cfg.suppressOnQuiz !== false && document.querySelector('[data-sp-quiz], .sp-quiz')) return false;
    return true;
  }

  function wireTriggers(id, cfg, openFn, listeners) {
    var t = cfg.triggers || {};
    var hash = t.hash || (id === 'ebook' ? 'free-ebook' : 'temperament-test');
    listen(listeners, document, 'click', function (ev) {
      var a = ev.target && ev.target.closest && ev.target.closest('a[href$="#' + hash + '"], [data-sp-open="' + id + '"]');
      if (!a) return;
      ev.preventDefault();
      openFn('link');
    });
    var params = new URLSearchParams(window.location.search);
    if (window.location.hash === '#' + hash || params.get('sp') === id) { setTimeout(function () { openFn('url'); }, 400); return; }
    if (!canAutoOpen(id, cfg)) return;
    var fired = false, timer = null;
    function auto(src) {
      if (fired || current || !canAutoOpen(id, cfg)) return;
      fired = true; cleanup();
      set('session', 'sp:' + id + ':shown', '1');
      openFn(src);
    }
    function onScroll() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && (window.scrollY / max) * 100 >= t.scroll) auto('scroll');
    }
    function onOut(ev) { if (!ev.relatedTarget && ev.clientY <= 0) auto('exit'); }
    function cleanup() {
      if (timer) clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('mouseout', onOut);
    }
    if (t.delay > 0) timer = setTimeout(function () { auto('delay'); }, t.delay * 1000);
    if (t.scroll > 0) window.addEventListener('scroll', onScroll, { passive: true });
    if (t.exitIntent && window.matchMedia && window.matchMedia('(pointer: fine)').matches) document.addEventListener('mouseout', onOut);
  }

  // In the theme editor, selecting the section opens its pop-up so it can be edited live. A setting
  // change re-renders the section (unload, then load): the old pop-up and its listeners go, and the
  // new one reopens if its section is still the selected one.
  var selectedSection = null;
  if (typeof document !== 'undefined') {
    document.addEventListener('shopify:section:select', function (e) { selectedSection = e.detail && e.detail.sectionId; });
    document.addEventListener('shopify:section:deselect', function (e) { if (e.detail && e.detail.sectionId === selectedSection) selectedSection = null; });
  }
  function wireEditor(sectionId, modal, openFn, listeners) {
    if (!sectionId) return;
    listen(listeners, document, 'shopify:section:select', function (e) { if (e.detail && e.detail.sectionId === sectionId) openFn('editor'); });
    listen(listeners, document, 'shopify:section:deselect', function (e) { if (e.detail && e.detail.sectionId === sectionId) modal.hide('editor'); });
    listen(listeners, document, 'shopify:section:unload', function (e) {
      if (!e.detail || e.detail.sectionId !== sectionId) return;
      listeners.forEach(function (undo) { undo(); });
      modal.destroy();
    });
    if (designMode() && selectedSection === sectionId) setTimeout(function () { openFn('editor'); }, 0);
  }
  // Every listener a pop-up adds is recorded as a function that removes it.
  function listen(listeners, target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    listeners.push(function () { target.removeEventListener(type, fn, opts); });
  }

  // Only Klaviyo (with a key) or a webhook can send an email; a Shopify customer record cannot.
  function canEmail(cfg) {
    var lc = cfg.lead || {};
    return !!((lc.klaviyo && lc.klaviyo.publicKey) || lc.webhook);
  }
  function leadConfig(cfg) {
    var lc = cfg.lead || {};
    return { klaviyo: lc.klaviyo, webhook: lc.webhook, shopify: lc.shopify, rootUrl: cfg.rootUrl || '/', sensitive: !!lc.sensitive };
  }

  // ---------------------------------------------------------------------------------------------
  // Free e-book: name, email, and one of three interests (peace, prosperity, enlightenment).
  // ---------------------------------------------------------------------------------------------

  var ICONS = {
    peace: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 13c3.5 0 6-1.5 8-4 1.2 2.2 3.3 3.3 6 3.3L21 10l-1.6 3.4c-1.3 2.9-4.3 4.6-7.4 4.6H7l-3 3v-3.5C3.4 17 3 15.3 3 13z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M11 9c-.6-2.6.4-4.8 2.6-6-.1 2.5.7 4.3 2.3 5.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="17.2" cy="11.2" r=".9" fill="currentColor"/></svg>',
    prosperity: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21V9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M12 13c-3.6 0-5.5-2-5.5-5.2 3.4 0 5.5 1.9 5.5 5.2zm0 0c3.6 0 5.5-2 5.5-5.2-3.4 0-5.5 1.9-5.5 5.2zm0 4c-3 0-4.7-1.6-4.7-4.2 2.9 0 4.7 1.5 4.7 4.2zm0 0c3 0 4.7-1.6 4.7-4.2-2.9 0-4.7 1.5-4.7 4.2zM12 9c-1.6-1.4-1.7-3.6 0-6 1.7 2.4 1.6 4.6 0 6z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    enlightenment: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/><path d="M12 7v3M10.5 8.5h3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
  };
  var DEFAULT_INTERESTS = [
    { key: 'peace', label: 'Peace', blurb: 'Rest for a restless heart' },
    { key: 'prosperity', label: 'Prosperity', blurb: 'Work, family and a flourishing life' },
    { key: 'enlightenment', label: 'Enlightenment', blurb: 'Light for the mind and the soul' }
  ];

  function mountEbook(host, cfgIn) {
    var cfg = cfgIn || readConfig(host);
    if (cfg.enabled === false) return null;
    var L = window.ScepterLead;
    var copy = merge({
      kicker: 'A gift for you', title: 'Choose a free e-book', sub: 'Tell us what you’re hoping for, and we’ll send you a book to match.',
      legend: 'What are you hoping for most?', button: 'Send me my free e-book', doneTitle: 'It’s yours{name}.',
      doneText: 'Your e-book is ready to download. We’ve emailed you a copy too.', doneTextEmailOnly: 'Check your inbox: your e-book is on its way.',
      doneTextNoEmail: 'Your e-book is ready to download.',
      download: 'Download the e-book', consent: 'Also send me occasional emails from Scepter. Unsubscribe anytime.', fine: 'We’ll never share your email.'
    }, cfg.copy);
    var given = (cfg.interests || []).filter(function (x) { return x && x.key; });
    var interests = (given.length ? given : DEFAULT_INTERESTS).map(function (it, i) {
      return merge(DEFAULT_INTERESTS.filter(function (d) { return d.key === it.key; })[0] || DEFAULT_INTERESTS[i] || {}, it);
    });
    var modal = createModal({ id: 'ebook', label: copy.title, className: 'sp-modal--ebook', style: cfg.style });
    var chosen = null;

    function renderForm() {
      modal.content.innerHTML = '';
      var covers = interests.map(function (it) {
        var c = cover({ title: it.title || it.label, author: it.author, image: it.image });
        c.setAttribute('data-interest', it.key);
        return c;
      });
      var err = h('p', { class: 'sp-error', role: 'alert' });
      var name = h('input', { class: 'sp-input', type: 'text', name: 'first_name', autocomplete: 'given-name', placeholder: 'First name', 'aria-label': 'First name', required: true });
      var email = h('input', { class: 'sp-input', type: 'email', name: 'email', autocomplete: 'email', inputmode: 'email', placeholder: 'Email address', 'aria-label': 'Email address', required: true });
      var consent = h('input', { type: 'checkbox', class: 'sp-check__box', checked: (cfg.lead || {}).consentChecked === true });
      var buttons = interests.map(function (it) {
        return h('button', { type: 'button', class: 'sp-interest', 'data-interest': it.key, 'aria-pressed': 'false', onclick: function () { pick(it.key); } }, [
          h('span', { class: 'sp-interest__icon', html: ICONS[it.key] || ICONS.enlightenment }),
          h('span', {}, [h('span', { class: 'sp-interest__name', text: it.label }), h('span', { class: 'sp-interest__book', text: it.title ? it.title + (it.author ? ' · ' + it.author : '') : it.blurb })])
        ]);
      });
      function pick(key) {
        chosen = key;
        buttons.forEach(function (b) { var on = b.getAttribute('data-interest') === key; b.classList.toggle('is-selected', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        covers.forEach(function (c) { c.classList.toggle('is-active', c.getAttribute('data-interest') === key); });
        err.textContent = '';
      }
      var form = h('form', { class: 'sp-ebook__form', novalidate: true, onsubmit: function (ev) {
        ev.preventDefault();
        if (!chosen) { err.textContent = 'Choose one of the three books.'; return; }
        if (!name.value.trim()) { err.textContent = 'Please tell us your first name.'; name.focus(); return; }
        if (!L.validEmail(email.value)) { err.textContent = 'Please enter a valid email address.'; email.focus(); return; }
        submit(name.value.trim().slice(0, 60), email.value.trim(), consent.checked);
      } }, [
        h('fieldset', { class: 'sp-fieldset', style: 'margin:0' }, [h('legend', { class: 'sp-legend', text: copy.legend }), h('div', { class: 'sp-interests' }, buttons)]),
        name, email,
        h('label', { class: 'sp-check' }, [consent, h('span', { text: copy.consent })]),
        err,
        h('button', { type: 'submit', class: 'sp-btn sp-btn--primary sp-btn--lg sp-btn--block' }, [copy.button, h('span', { class: 'sp-btn__arrow', 'aria-hidden': 'true', text: '→' })]),
        h('p', { class: 'sp-fine', text: copy.fine })
      ]);
      modal.content.appendChild(h('div', { class: 'sp-ebook' }, [
        h('div', { class: 'sp-ebook__art' }, [
          h('p', { class: 'sp-kicker', text: copy.kicker }),
          h('h2', { class: 'sp-ebook__title', id: 'sp-ebook-title', text: copy.title }),
          h('p', { class: 'sp-ebook__sub', text: copy.sub }),
          h('div', { class: 'sp-ebook__stack' }, covers)
        ]),
        form
      ]));
      modal.root.setAttribute('aria-labelledby', 'sp-ebook-title');
      if (chosen) pick(chosen);
      else if (cfg.defaultInterest) pick(cfg.defaultInterest);
    }

    function submit(first, email, marketing) {
      var it = interests.filter(function (x) { return x.key === chosen; })[0];
      set('local', 'sp:ebook:converted', String(Date.now()));
      var lc = cfg.lead || {};
      L.submit(leadConfig(cfg), {
        email: email, firstName: first, marketing: marketing, source: 'Scepter free e-book pop-up',
        tags: [lc.tag || 'free-ebook', 'interest-' + chosen],
        properties: { ebook_interest: it.label, ebook_title: it.title || '', ebook_url: it.url || '' },
        eventName: lc.eventName || 'Requested Free E-book',
        eventProperties: { interest: it.label, ebook_title: it.title || '', ebook_url: it.url || '', ebook_image: it.image || '' }
      });
      emit('ebook:submit', { interest: chosen });
      renderDone(it, first);
    }

    function renderDone(it, first) {
      // "By email only" needs something that can email; otherwise the download is still offered.
      var emailOnly = (cfg.deliver === 'email' && canEmail(cfg)) || !it.url;
      var text = emailOnly ? copy.doneTextEmailOnly : canEmail(cfg) ? copy.doneText : copy.doneTextNoEmail;
      modal.content.innerHTML = '';
      modal.content.appendChild(h('div', { class: 'sp-ebook__done' }, [
        cover({ title: it.title || it.label, author: it.author, image: it.image }),
        h('p', { class: 'sp-kicker', text: it.label }),
        h('h2', { class: 'sp-ebook__title', text: copy.doneTitle.replace('{name}', first ? ', ' + first : '') }),
        h('p', { class: 'sp-lead', text: text }),
        emailOnly ? null : h('a', { class: 'sp-btn sp-btn--primary sp-btn--lg', href: it.url, target: '_blank', rel: 'noopener', download: '', onclick: function () { emit('ebook:download', { interest: it.key }); } }, copy.download),
        h('button', { type: 'button', class: 'sp-btn sp-btn--quiet', onclick: function () { modal.hide('done'); } }, 'Back to the store')
      ]));
      var focusable = modal.content.querySelector('.sp-btn');
      if (focusable) focusable.focus();
    }

    modal.onHide = function (reason) {
      if (reason === 'dismiss') set('local', 'sp:ebook:dismissed', String(Date.now()));
      emit('popup:close', { popup: 'ebook', reason: reason });
    };
    function open(src) {
      if (modal.isOpen()) return;
      if (!chosen || modal.content.querySelector('.sp-ebook__done') === null) renderForm();
      modal.show();
      emit('popup:open', { popup: 'ebook', source: src });
    }
    renderForm();
    var listeners = [];
    wireTriggers('ebook', cfg, open, listeners);
    wireEditor(cfg.sectionId, modal, open, listeners);
    return { open: open, close: function () { modal.hide('api'); }, modal: modal };
  }

  // ---------------------------------------------------------------------------------------------
  // Temperament test, then Scepter's Havard books.
  // ---------------------------------------------------------------------------------------------

  function mountTemperament(host, cfgIn) {
    var cfg = cfgIn || readConfig(host);
    if (cfg.enabled === false) return null;
    var T = window.ScepterTemperament, L = window.ScepterLead;
    var copy = merge({
      kicker: 'Temperament test', title: 'What’s your temperament?',
      lead: 'Twenty-two quick questions about your first reactions. Answer with what comes to you first, not what you think you should say. You’ll discover your dominant temperament, your secondary one, and the virtue that will help you most.',
      cta: 'Start the test', meta: '22 questions · about 5 minutes',
      attribution: 'Based on the four classical temperaments as Alexandre Havard presents them in From Temperament to Character.',
      attributionUrl: '', resultKicker: 'Your temperament', booksTitle: 'Go deeper with Alexandre Havard',
      booksLead: 'Temperament is where we start; character is what we build. These books show how.',
      launcher: 'What’s your temperament?', emailTitle: 'Email me my result', progress: '{n} of {total}',
      consent: 'Also send me occasional emails from Scepter. Unsubscribe anytime.'
    }, cfg.copy);
    var given = (cfg.questions || []).filter(Boolean);
    var questions = T.normaliseQuestions(given.length ? given : null);
    var results = {};
    T.KEYS.forEach(function (k) { results[k] = merge(T.TEMPERAMENTS[k], (cfg.results || {})[k]); });
    // Liquid sends each picked book as { for: [...], product: {...} }; the demo sends flat entries.
    cfg.books = (cfg.books || []).filter(Boolean).map(function (b) {
      return b.product ? Object.assign({}, b.product, { for: b.for || [] }) : b;
    }).filter(function (b) { return b && b.handle; });
    var modal = createModal({ id: 'temperament', label: copy.title, theme: 'dark', narrow: true, className: 'sp-modal--temperament', style: cfg.style });
    var picks = [], index = 0, stage = 'intro', outcome = null, advancing = null;

    function topbar(n, total) {
      return h('div', { class: 'sp-topbar' }, [
        h('button', { type: 'button', class: 'sp-back', 'aria-label': 'Back', onclick: back, html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
        h('div', { class: 'sp-progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(n - 1), 'aria-label': 'Progress' },
          [h('span', { style: 'width:' + Math.round(((n - 1) / total) * 100) + '%' })]),
        h('div', { class: 'sp-count', text: copy.progress.replace('{n}', n).replace('{total}', total) })
      ]);
    }
    function back() {
      if (stage === 'q' && index > 0) { index--; render(); return; }
      stage = 'intro'; render();
    }
    function attribution() {
      return h('p', { class: 'sp-temp__attrib' }, copy.attributionUrl
        ? [h('a', { href: copy.attributionUrl, target: '_blank', rel: 'noopener', text: copy.attribution })]
        : [copy.attribution]);
    }

    function render() {
      var box = h('div', { class: 'sp-temp' });
      modal.content.innerHTML = '';
      modal.content.appendChild(box);
      if (stage === 'intro') {
        box.appendChild(h('div', { class: 'sp-temp__intro sp-enter-forward' }, [
          h('div', { class: 'sp-emblem', html: '<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M60 10 A50 50 0 0 1 110 60 L60 60 Z" fill="var(--sp-burgundy-hover)"/><path d="M110 60 A50 50 0 0 1 60 110 L60 60 Z" fill="currentColor" opacity=".55"/><path d="M60 110 A50 50 0 0 1 10 60 L60 60 Z" fill="currentColor" opacity=".25"/><path d="M10 60 A50 50 0 0 1 60 10 L60 60 Z" fill="currentColor" opacity=".85"/><circle cx="60" cy="60" r="14" fill="var(--sp-forest-deep)"/></svg>' }),
          h('p', { class: 'sp-kicker', text: copy.kicker }),
          h('h2', { class: 'sp-display', id: 'sp-temp-title', text: copy.title }),
          h('p', { class: 'sp-lead', text: copy.lead }),
          h('button', { type: 'button', class: 'sp-btn sp-btn--primary sp-btn--lg', autofocus: true, onclick: function () {
            stage = 'q'; index = picks.findIndex(function (p) { return p === undefined || p === null; });
            if (index < 0) index = picks.length < questions.length ? picks.length : 0;
            emit('temperament:start', {}); render();
          } }, [copy.cta, h('span', { class: 'sp-btn__arrow', 'aria-hidden': 'true', text: '→' })]),
          h('ul', { class: 'sp-meta' }, copy.meta.split('·').map(function (m) { return h('li', { text: m.trim() }); })),
          attribution()
        ]));
        modal.root.setAttribute('aria-labelledby', 'sp-temp-title');
        return;
      }
      if (stage === 'q') {
        var q = questions[index];
        box.appendChild(topbar(index + 1, questions.length));
        var list = h('div', { class: 'sp-options sp-options--list', role: 'group', 'aria-label': q.prompt });
        q.answers.forEach(function (a, i) {
          list.appendChild(h('button', { type: 'button', class: 'sp-opt' + (picks[index] === i ? ' is-selected' : ''), 'aria-pressed': picks[index] === i ? 'true' : 'false',
            onclick: function (ev) {
              var at = index;
              if (advancing === at) return; // a second tap on the same question
              advancing = at;
              picks[index] = i;
              Array.prototype.forEach.call(list.children, function (b) { b.classList.remove('is-selected'); b.setAttribute('aria-pressed', 'false'); });
              ev.currentTarget.classList.add('is-selected'); ev.currentTarget.setAttribute('aria-pressed', 'true');
              setTimeout(function () {
                advancing = null;
                if (index !== at || stage !== 'q') return;
                if (index < questions.length - 1) { index++; render(); }
                else finish();
              }, 200);
            } }, [h('span', { class: 'sp-opt__label', text: a.text })]));
        });
        box.appendChild(h('section', { class: 'sp-temp__q sp-enter-forward' }, [h('h2', { class: 'sp-title', tabindex: '-1', text: q.prompt }), list]));
        var title = box.querySelector('.sp-title');
        if (title) { try { title.focus({ preventScroll: true }); } catch (e) { title.focus(); } }
        return;
      }
      if (stage === 'result') renderResult(box);
    }

    function finish() {
      outcome = T.score(questions, picks);
      stage = 'result';
      set('local', 'sp:temperament:result', JSON.stringify({ d: outcome.dominant, s: outcome.secondary, t: Date.now() }));
      emit('temperament:complete', { dominant: outcome.dominant, secondary: outcome.secondary });
      render();
    }

    function renderResult(box) {
      var d = results[outcome.dominant], s = outcome.secondary ? results[outcome.secondary] : null;
      var wrap = h('div', { class: 'sp-temp__result sp-enter-forward' });
      wrap.appendChild(h('p', { class: 'sp-kicker', text: copy.resultKicker }));
      wrap.appendChild(h('h2', { class: 'sp-display', tabindex: '-1', text: d.name }));
      wrap.appendChild(h('p', { class: 'sp-lead', text: d.tagline + (s ? ', with ' + (outcome.close ? 'a strong ' : 'a ') + s.name.toLowerCase() + ' streak.' : '.') + ' ' + d.summary }));

      // Share of answers per temperament: sorted, labelled, never colour alone.
      var bars = h('div', { class: 'sp-bars', role: 'list', 'aria-label': 'Your answers by temperament' });
      outcome.ranking.forEach(function (k, i) {
        var pct = outcome.percent[k];
        var role = k === outcome.dominant ? 'Dominant' : (k === outcome.secondary ? 'Secondary' : '');
        bars.appendChild(h('div', { class: 'sp-bar' + (i === 0 ? ' is-top' : ''), role: 'listitem', title: results[k].name + ': ' + outcome.totals[k] + ' points (' + pct + '%)' }, [
          h('span', { class: 'sp-bar__label' }, [h('span', { class: 'sp-bar__name', text: results[k].name }), role ? h('span', { class: 'sp-bar__role', text: role }) : null]),
          h('span', { class: 'sp-bar__track', 'aria-hidden': 'true' }, [h('span', { class: 'sp-bar__fill', style: 'width:0%', 'data-w': pct + '%' })]),
          h('span', { class: 'sp-bar__pct', text: pct + '%' })
        ]));
      });
      wrap.appendChild(h('div', { class: 'sp-bars-panel' }, [bars]));
      wrap.appendChild(h('div', { class: 'sp-temp__cols' }, [
        h('div', { class: 'sp-temp__card' }, [h('h4', { text: 'Your strengths' }), h('p', { text: d.strengths })]),
        h('div', { class: 'sp-temp__card' }, [h('h4', { text: 'Watch out for' }), h('p', { text: d.watch })])
      ]));
      wrap.appendChild(h('div', { class: 'sp-virtue' }, [
        h('p', { class: 'sp-eyebrow', text: 'The virtue to grow' }),
        h('p', { class: 'sp-virtue__name', text: d.virtue }),
        h('p', { text: d.virtueText })
      ]));
      wrap.appendChild(renderBooks());
      if (cfg.askEmail !== 'off' && L && canEmail(cfg)) wrap.appendChild(emailForm());
      wrap.appendChild(h('div', { class: 'sp-results__actions' }, [
        h('button', { type: 'button', class: 'sp-btn sp-btn--quiet', onclick: function () { picks = []; index = 0; stage = 'intro'; render(); } }, 'Retake the test')
      ]));
      wrap.appendChild(attribution());
      box.appendChild(wrap);
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        Array.prototype.forEach.call(box.querySelectorAll('.sp-bar__fill'), function (f) { f.style.width = f.getAttribute('data-w'); });
      }); });
      var title = box.querySelector('.sp-display');
      if (title) { try { title.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
      modal.dialog.scrollTop = 0;
    }

    // Books: the one chosen for this temperament first, then the one for everyone, then the rest.
    function renderBooks() {
      var merged = {}, books = [];
      (cfg.books || []).forEach(function (b) {
        if (!b || !b.handle) return;
        if (!merged[b.handle]) { merged[b.handle] = Object.assign({}, b, { for: [] }); books.push(merged[b.handle]); }
        merged[b.handle].for = merged[b.handle].for.concat(b.for || []);
      });
      var dom = outcome.dominant;
      var ordered = books.slice().sort(function (a, b) {
        function rank(x) { var f = x.for || []; return f.indexOf(dom) >= 0 ? 0 : f.indexOf('all') >= 0 ? 1 : 2; }
        return rank(a) - rank(b);
      });
      var seen = {};
      ordered = ordered.filter(function (b) { if (!b || !b.handle || seen[b.handle]) return false; seen[b.handle] = 1; return true; }).slice(0, cfg.maxBooks || 4);
      if (!ordered.length) return h('div');
      return h('div', { class: 'sp-temp__books' }, [
        h('h3', { class: 'sp-h3', text: copy.booksTitle }),
        h('p', { class: 'sp-sub', text: copy.booksLead }),
        h('div', { class: 'sp-books' }, ordered.map(function (b, i) {
          var mine = (b.for || []).indexOf(dom) >= 0;
          var note = mine ? (cfg.copy && cfg.copy.forYou) || 'Written for you' : (b.for || []).indexOf('all') >= 0 ? 'Start here' : '';
          var price = b.price_cents ? b.price_cents / 100 : b.price;
          return h('div', { class: 'sp-book' + (i === 0 ? ' is-featured' : '') }, [
            h('a', { href: b.url, tabindex: '-1', 'aria-hidden': 'true' }, [cover({ title: b.title, author: b.author || (b.vendor && !/scepter/i.test(b.vendor) ? b.vendor : 'Alexandre Havard'), image: b.image })]),
            h('div', { class: 'sp-book__body' }, [
              note ? h('p', { class: 'sp-book__note', text: note }) : null,
              h('p', { class: 'sp-book__title' }, [h('a', { href: b.url, text: b.title })]),
              price ? h('p', { class: 'sp-book__price', text: money(price, cfg.currency) }) : null,
              b.variant ? h('button', { type: 'button', class: 'sp-btn sp-btn--small', onclick: function (ev) { addToCart(ev.currentTarget, b.variant); } }, 'Add to cart')
                : h('a', { class: 'sp-btn sp-btn--small', href: b.url }, 'See the book')
            ])
          ]);
        }))
      ]);
    }

    function addToCart(btn, variantId) {
      var root = cfg.rootUrl || '/';
      btn.disabled = true; btn.textContent = 'Adding…';
      fetch(root + 'cart/add.js', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: [{ id: variantId, quantity: 1 }] }) })
        .then(function (r) { if (!r.ok) throw new Error('cart'); return r.json(); })
        .then(function () {
          btn.textContent = 'Added ✓'; btn.classList.add('is-done');
          emit('cart:add', { source: 'temperament', temperament: outcome && outcome.dominant });
          try { document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true })); } catch (e) { /* theme-specific */ }
          if (!btn.parentNode.querySelector('.sp-link--cart')) btn.after(h('a', { class: 'sp-link sp-link--cart', href: root + 'cart', text: 'View cart' }));
        })
        .catch(function () {
          btn.disabled = false; btn.textContent = 'Add to cart';
          var note = btn.parentNode.querySelector('.sp-cart-error') || h('p', { class: 'sp-cart-error', role: 'status' });
          note.textContent = 'Couldn’t add it: it may be sold out.';
          btn.after(note);
        });
    }

    function emailForm() {
      var err = h('p', { class: 'sp-error', role: 'alert' });
      var email = h('input', { class: 'sp-input', type: 'email', name: 'email', autocomplete: 'email', placeholder: 'Email address', 'aria-label': 'Email address' });
      var consent = h('input', { type: 'checkbox', class: 'sp-check__box', checked: (cfg.lead || {}).consentChecked === true });
      var send = h('button', { type: 'submit', class: 'sp-btn sp-btn--primary' }, 'Send');
      var form = h('form', { class: 'sp-form sp-temp__email', novalidate: true, onsubmit: function (ev) {
        ev.preventDefault();
        if (!L.validEmail(email.value)) { err.textContent = 'Please enter a valid email address.'; return; }
        var d = results[outcome.dominant], s = outcome.secondary ? results[outcome.secondary] : null;
        send.disabled = true;
        L.submit(leadConfig(cfg), {
          email: email.value.trim(), source: 'Scepter temperament test', marketing: consent.checked,
          tags: [(cfg.lead || {}).tag || 'temperament-test', 'temperament-' + outcome.dominant],
          properties: { temperament: d.name, temperament_secondary: s ? s.name : '', temperament_virtue: d.virtue },
          eventName: (cfg.lead || {}).eventName || 'Completed Temperament Test',
          eventProperties: { temperament: d.name, secondary: s ? s.name : '', virtue: d.virtue, percent: outcome.percent }
        }).then(function (r) {
          if (r.ok) form.replaceWith(h('p', { class: 'sp-sent', role: 'status', text: 'Sent. Look for your result in your inbox.' }));
          else { send.disabled = false; err.textContent = 'We couldn’t send it just now. Please try again in a moment.'; }
        });
      } }, [
        h('p', { class: 'sp-legend', text: copy.emailTitle }),
        h('div', { class: 'sp-form__inline' }, [email, send]),
        h('label', { class: 'sp-check' }, [consent, h('span', { text: copy.consent })]),
        err
      ]);
      return form;
    }

    modal.onHide = function (reason) {
      if (reason === 'dismiss' && stage === 'intro') set('local', 'sp:temperament:dismissed', String(Date.now()));
      emit('popup:close', { popup: 'temperament', reason: reason });
    };
    function open(src) {
      if (modal.isOpen()) return;
      if (stage === 'result' && !outcome) stage = 'intro';
      render();
      modal.show();
      emit('popup:open', { popup: 'temperament', source: src });
    }

    var t = cfg.triggers || {};
    var launcher = null;
    if (t.launcher !== false && !designMode()) {
      launcher = h('button', { type: 'button', class: 'sp-launcher sp-launcher--' + (t.launcherPosition || 'left'), onclick: function () { open('launcher'); } },
        [h('span', { class: 'sp-launcher__dot', 'aria-hidden': 'true' }), copy.launcher]);
      if (!excluded(cfg, window.location.pathname)) document.body.appendChild(launcher);
    }
    render();
    var listeners = [];
    wireTriggers('temperament', cfg, open, listeners);
    wireEditor(cfg.sectionId, modal, open, listeners);
    if (launcher) listeners.push(function () { launcher.remove(); });
    return { open: open, close: function () { modal.hide('api'); }, modal: modal };
  }

  // Sections load their scripts in page order, so this file can run before scepter-temperament.js
  // (e.g. the e-book pop-up sits above the test in the footer). A pop-up is only mounted once its
  // scripts are all there; mounting is retried when scepter-temperament.js arrives, on
  // DOMContentLoaded (after every deferred script) and on load.
  function autoMount() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-sp-popup]'), function (el) {
      if (el.__spMounted) return;
      var kind = el.getAttribute('data-sp-popup');
      if (!window.ScepterLead || (kind === 'temperament' && !window.ScepterTemperament)) return;
      el.__spMounted = true;
      try {
        if (kind === 'ebook') el.__sp = mountEbook(el);
        if (kind === 'temperament') el.__sp = mountTemperament(el);
      } catch (e) { if (window.console) console.error('[scepter-popups]', e); }
    });
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoMount);
    else autoMount();
    document.addEventListener('DOMContentLoaded', autoMount);
    window.addEventListener('load', autoMount);
    document.addEventListener('shopify:section:load', autoMount);
  }

  return { mountEbook: mountEbook, mountTemperament: mountTemperament, autoMount: autoMount, _canAutoOpen: canAutoOpen };
});
