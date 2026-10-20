/* The hub: one tab per quiz set, read from world.json. Adding a set is a folder in this world plus
   an entry in world.json; nothing here changes. The tab in the address (#formation) is the one shown. */
(function () {
  'use strict';
  var root = document.getElementById('world');

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  // Links stay inside the world or go to a web page; never a script URL.
  function safeHref(href) {
    var s = String(href || '').trim();
    return /^(https?:\/\/|[\w.~-]+\/|[\w.~-]+\/?[?#]|\.\.?\/|#)/i.test(s) && !/^javascript:/i.test(s) ? s : null;
  }

  function card(it) {
    var href = safeHref(it.href);
    var tone = /^(dark|warm|light|empty)$/.test(it.tone || '') ? ' w-card--' + it.tone : '';
    var kids = [
      it.kind ? h('span', { class: 'w-card__kind', text: it.kind }) : null,
      h('span', { class: 'w-card__title', text: it.title || '' }),
      it.sub ? h('span', { class: 'w-card__sub', text: it.sub }) : null,
      it.meta ? h('span', { class: 'w-card__meta', text: it.meta }) : null
    ];
    return href ? h('a', { class: 'w-card' + tone, href: href }, kids) : h('div', { class: 'w-card' + tone }, kids);
  }

  function render(world) {
    var sets = (world.sets || []).filter(function (s) { return s && s.key; });
    root.innerHTML = '';
    if (!sets.length) { root.appendChild(h('p', { class: 'w-loading', text: 'No quizzes yet.' })); return; }
    var tabs = h('div', { class: 'w-tabs', role: 'tablist', 'aria-label': 'Quiz sets' });
    var panels = [];
    sets.forEach(function (s, i) {
      var id = 'w-' + String(s.key).replace(/[^\w-]/g, '');
      var tab = h('button', { type: 'button', class: 'w-tab', role: 'tab', id: id + '-tab', 'aria-controls': id, 'data-key': s.key, tabindex: '-1' },
        [h('span', { text: s.tab || s.key }), s.by || s.count ? h('small', { text: [s.by, s.count].filter(Boolean).join(' · ') }) : null]);
      tabs.appendChild(tab);
      var items = (s.items || []).filter(Boolean);
      var panel = h('section', { class: 'w-panel', role: 'tabpanel', id: id, 'aria-labelledby': id + '-tab', hidden: true }, [
        s.about ? h('p', { class: 'w-about', text: s.about }) : null,
        s.notes && s.notes.length ? h('ul', { class: 'w-notes' }, s.notes.map(function (n) { return h('li', { text: n }); })) : null,
        h('div', { class: 'w-cards' }, items.length ? items.map(card) : [card({ title: s.empty || 'Coming soon', sub: s.emptySub || '', tone: 'empty' })])
      ]);
      panels.push(panel);
    });
    root.appendChild(tabs);
    panels.forEach(function (p) { root.appendChild(p); });

    var buttons = Array.prototype.slice.call(tabs.querySelectorAll('.w-tab'));
    function select(i, focus, push) {
      buttons.forEach(function (b, j) {
        var on = i === j;
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
        panels[j].hidden = !on;
      });
      if (focus) buttons[i].focus();
      if (push && history.replaceState) history.replaceState(null, '', '#' + sets[i].key);
    }
    buttons.forEach(function (b, i) {
      b.addEventListener('click', function () { select(i, false, true); });
      b.addEventListener('keydown', function (ev) {
        var n = buttons.length, to = null;
        if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') to = (i + 1) % n;
        else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') to = (i - 1 + n) % n;
        else if (ev.key === 'Home') to = 0;
        else if (ev.key === 'End') to = n - 1;
        if (to !== null) { ev.preventDefault(); select(to, true, true); }
      });
    });
    function fromHash() {
      var key = decodeURIComponent(location.hash.replace(/^#/, ''));
      var i = sets.map(function (s) { return s.key; }).indexOf(key);
      select(i >= 0 ? i : 0, false, false);
    }
    window.addEventListener('hashchange', fromHash);
    fromHash();
  }

  fetch('world.json', { cache: 'no-cache', credentials: 'same-origin' })
    .then(function (r) { if (!r.ok) throw new Error('world.json ' + r.status); return r.json(); })
    .then(render)
    .catch(function (e) {
      root.innerHTML = '';
      root.appendChild(h('p', { class: 'w-loading', text: 'The list of quizzes did not load. Refresh the page to try again.' }));
      if (window.console) console.error('[world]', e);
    });
})();
