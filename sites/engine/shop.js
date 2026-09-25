/* One bookshop, four houses. Reads window.SITE (brand) and window.CATALOG (books),
   renders the shop, keeps a basket in this browser. Works from file:// — no build step,
   no network, no modules. */
(function () {
  'use strict';

  const SITE = window.SITE, CAT = window.CATALOG;
  const { cover, heroArt, MARKS, esc, typo } = window.Covers;
  const FORMATS = ['print', 'ebook', 'audio'];
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));

  const ICON = {
    print: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15zM5 19.5A1.5 1.5 0 0 0 6.5 21H19" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 7h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    ebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="2.5" width="13" height="19" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 6.5h6M9 9.5h6M9 12.5h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="12" cy="18.2" r="0.9" fill="currentColor"/></svg>',
    audio: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15v-3a8 8 0 0 1 16 0v3" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="3.5" y="14" width="4.5" height="7" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="16" y="14" width="4.5" height="7" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 13H6L5 8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M15 15l5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12M12 6v12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  // ---------- data ----------
  const shelves = CAT.shelves.filter(s => CAT.books.some(b => b.shelf === s.slug));
  const shelfIndex = Object.fromEntries(CAT.shelves.map((s, i) => [s.slug, i]));
  const shelfName = Object.fromEntries(CAT.shelves.map(s => [s.slug, s.name]));
  const byId = new Map(CAT.books.map(b => [b.id, b]));
  const sortKey = t => t.toLowerCase().replace(/^(the|a|an)\s+/, '').replace(/[^a-z0-9 ]/g, '');
  const books = CAT.books.slice().sort((a, b) => sortKey(a.title).localeCompare(sortKey(b.title)));
  const haystack = new Map(books.map(b => [b.id, fold([b.title, b.subtitle, b.author, b.description, shelfName[b.shelf]].join(' '))]));
  function fold(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

  const money = new Intl.NumberFormat(SITE.locale, { style: 'currency', currency: SITE.currency, minimumFractionDigits: SITE.currency === 'KES' || SITE.currency === 'PHP' ? 0 : 2, maximumFractionDigits: 2 });
  const priceOf = (b, f) => (b.price && typeof b.price[f] === 'number' ? b.price[f] : null);
  // The format switch only means something once titles carry prices; until then it stays out of the way.
  const anyPriced = CAT.books.some(b => FORMATS.some(f => priceOf(b, f) != null));
  const show = n => (n == null ? '' : money.format(n));

  // ---------- storage (this browser only; everything still works without it) ----------
  const KEY = 'shop:' + SITE.key;
  function load(k, d) { try { const v = localStorage.getItem(KEY + ':' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(KEY + ':' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } }

  const state = {
    shelf: 'all',
    q: '',
    format: FORMATS.includes(load('format', 'print')) ? load('format', 'print') : 'print',
    basket: (load('basket', []) || []).filter(l => byId.has(l.id) && FORMATS.includes(l.format)),
  };

  // ---------- shell ----------
  const brand = SITE.logo
    ? `<img class="brand-logo" src="${esc(SITE.logo)}" alt="${esc(SITE.name)}">`
    : `<span class="brand-mark">${MARKS[SITE.mark]}</span><span class="brand-word">${SITE.wordmark}</span>`;

  document.body.innerHTML = `
  <a class="skip" href="#catalogue">Skip to books</a>
  <header class="bar${anyPriced ? ' has-fmt' : ''}">
    <a class="brand" href="#/" aria-label="${esc(SITE.name)} — home">${brand}</a>
    <label class="search">${ICON.search}<span class="sr-only">Search books</span>
      <input type="search" id="q" placeholder="Search" autocomplete="off" spellcheck="false"></label>
    <div class="fmt" role="group" aria-label="Show prices for"${anyPriced ? '' : ' hidden'}>
      ${FORMATS.map(f => `<button type="button" data-fmt="${f}" aria-pressed="${f === state.format}">${ICON[f]}<span>${esc(SITE.formats[f])}</span></button>`).join('')}
    </div>
    <button type="button" class="bag-btn" id="bag-open" aria-label="Basket">${ICON.bag}<span class="bag-count" id="bag-count" hidden>0</span></button>
  </header>
  <main>
    <section class="hero" aria-label="${esc(SITE.name)}">
      <div class="hero-art">${heroArt(SITE, SITE.key + '-hero')}</div>
      <div class="hero-inner">
        <div class="hero-copy">
          <p class="eyebrow">${esc(SITE.hero.eyebrow)}</p>
          <h1 class="hero-title">${SITE.hero.title}</h1>
          <p class="hero-line">${FORMATS.map(f => `<span>${ICON[f]}${esc(SITE.formats[f])}</span>`).join('')}</p>
          <a class="btn btn-hero" href="#catalogue">${esc(SITE.words.browse)} ${books.length} ${esc(SITE.words.titles)} ${ICON.arrow}</a>
        </div>
        <div class="ascent" aria-hidden="true">${ascent()}</div>
      </div>
    </section>
    <nav class="shelves" aria-label="Shelves"><div class="shelves-in" id="shelves"></div></nav>
    <section class="catalogue" id="catalogue" tabindex="-1" aria-live="polite"></section>
  </main>
  <footer class="foot">
    <div class="foot-in">
      <div class="foot-brand">${brand}</div>
      <div class="foot-cols">${SITE.footer.map(col => `<div class="foot-col">${col.map(l => `<p>${l}</p>`).join('')}</div>`).join('')}</div>
    </div>
    <p class="foot-note">${SITE.note}</p>
  </footer>
  <dialog class="dlg dlg-book" id="dlg-book" aria-labelledby="bk-title"></dialog>
  <dialog class="dlg dlg-bag" id="dlg-bag" aria-labelledby="bag-title"></dialog>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>`;

  function ascent() {
    const feat = CAT.books.filter(b => b.featured);
    const pick = feat.concat(books.filter(b => !b.featured)).slice(0, 5);
    return pick.map((b, i) => `<a class="step" href="#/book/${b.id}" tabindex="-1" style="--i:${i};--n:${pick.length}">${cover(b, SITE, shelfIndex[b.shelf] || 0)}</a>`).join('');
  }

  // ---------- catalogue ----------
  // No price yet: show the three formats every title comes in.
  const priceCell = p => (p == null ? `<span class="fmt-icons" title="${esc(FORMATS.map(f => SITE.formats[f]).join(' · '))}">${FORMATS.map(f => ICON[f]).join('')}</span>` : show(p));

  function card(b, i) {
    const p = priceOf(b, state.format);
    return `<a class="card" href="#/book/${b.id}" style="--d:${Math.min(i, 16)}">
      <div class="card-cover">${cover(b, SITE, shelfIndex[b.shelf] || 0)}</div>
      <div class="card-body">
        <h3 class="card-title">${esc(b.title)}</h3>
        <p class="card-author">${esc(b.author)}</p>
        <p class="card-price">${priceCell(p)}</p>
      </div></a>`;
  }

  function renderShelves() {
    const counts = Object.fromEntries(shelves.map(s => [s.slug, books.filter(b => b.shelf === s.slug).length]));
    $('#shelves').innerHTML =
      `<a href="#/" class="chip" aria-current="${state.shelf === 'all' && !state.q}">${esc(SITE.words.all)}<span>${books.length}</span></a>` +
      shelves.map(s => `<a href="#/shelf/${s.slug}" class="chip" aria-current="${state.shelf === s.slug && !state.q}">${esc(s.name)}<span>${counts[s.slug]}</span></a>`).join('');
    const cur = $('#shelves [aria-current="true"]');
    if (cur) cur.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'auto' });
  }

  function renderCatalogue() {
    const el = $('#catalogue');
    const q = fold(state.q.trim());
    if (q) {
      const terms = q.split(/\s+/);
      const hits = books.filter(b => terms.every(t => haystack.get(b.id).includes(t)));
      el.innerHTML = `<section class="shelf"><header class="shelf-head"><h2>${hits.length ? `“${esc(state.q.trim())}”` : esc(SITE.words.none)}</h2><span class="count">${hits.length}</span></header>
        ${hits.length ? `<div class="grid">${hits.map(card).join('')}</div>` : `<p class="empty">${esc(SITE.words.noneHint)}</p>`}</section>`;
    } else {
      const list = state.shelf === 'all' ? shelves : shelves.filter(s => s.slug === state.shelf);
      el.innerHTML = list.map(s => {
        const bs = books.filter(b => b.shelf === s.slug);
        return `<section class="shelf" id="shelf-${s.slug}" aria-labelledby="h-${s.slug}">
          <header class="shelf-head"><h2 id="h-${s.slug}">${esc(s.name)}</h2><span class="count">${bs.length}</span></header>
          <div class="grid">${bs.map(card).join('')}</div></section>`;
      }).join('');
    }
    renderShelves();
  }

  // ---------- book ----------
  let current = null, chosen = 'print', qty = 1, openedInApp = false;

  function renderBook(b) {
    const unpriced = FORMATS.every(f => priceOf(b, f) == null);
    const more = books.filter(x => x.shelf === b.shelf && x.id !== b.id).slice(0, 6);
    const meta = [
      b.isbn && [SITE.words.isbn, esc(b.isbn)],
      b.pages && [SITE.words.pages, String(b.pages)],
      b.kind && b.kind !== 'book' && [SITE.words.kind, esc(SITE.kinds[b.kind] || b.kind)],
    ].filter(Boolean);
    $('#dlg-book').innerHTML = `
      <button type="button" class="x" data-close aria-label="Close">${ICON.close}</button>
      <div class="bk">
        <div class="bk-cover">${cover(b, SITE, shelfIndex[b.shelf] || 0)}</div>
        <div class="bk-info">
          <a class="eyebrow" href="#/shelf/${b.shelf}" data-shelf>${esc(shelfName[b.shelf] || '')}</a>
          <h2 id="bk-title" class="bk-title" tabindex="-1">${typo(b.title)}</h2>
          ${b.subtitle ? `<p class="bk-sub">${typo(b.subtitle)}</p>` : ''}
          ${b.author ? `<p class="bk-author">${esc(b.author)}</p>` : ""}
          ${b.description ? `<p class="bk-desc">${esc(b.description)}</p>` : ''}
          <fieldset class="formats"><legend class="sr-only">Format</legend>
            ${FORMATS.map(f => {
              const p = priceOf(b, f);
              return `<label class="fopt"><input type="radio" name="fmt" value="${f}" ${f === chosen ? 'checked' : ''}>
                <span class="fopt-in">${ICON[f]}<span class="fopt-name">${esc(SITE.formats[f])}</span>${unpriced ? '' : `<span class="fopt-price">${p == null ? '—' : show(p)}</span>`}</span></label>`;
            }).join('')}
          </fieldset>
          ${unpriced ? `<p class="bk-pending">${esc(SITE.words.unpriced)}</p>` : ''}
          <div class="bk-actions">
            <div class="qty" ${chosen === 'print' ? '' : 'hidden'}>
              <button type="button" data-qty="-1" aria-label="One fewer">${ICON.minus}</button>
              <output aria-live="polite">${qty}</output>
              <button type="button" data-qty="1" aria-label="One more">${ICON.plus}</button>
            </div>
            <button type="button" class="btn btn-primary" id="add"></button>
          </div>
          ${meta.length ? `<dl class="meta">${meta.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` : ''}
        </div>
      </div>
      ${more.length ? `<div class="bk-more"><p class="eyebrow">${esc(SITE.words.more)} ${esc(shelfName[b.shelf] || '')}</p>
        <div class="bk-more-row">${more.map(x => `<a href="#/book/${x.id}" class="mini" data-swap aria-label="${esc(x.title)}">${cover(x, SITE, shelfIndex[x.shelf] || 0)}</a>`).join('')}</div></div>` : ''}`;
    syncAdd();
  }

  function syncAdd() {
    const p = priceOf(current, chosen), btn = $('#add');
    if (!btn) return;
    btn.textContent = p == null ? SITE.words.add : `${SITE.words.add} · ${show(p * (chosen === 'print' ? qty : 1))}`;
    const q = $('.dlg-book .qty');
    if (q) { q.hidden = chosen !== 'print'; q.querySelector('output').textContent = qty; }
  }

  function openBook(id) {
    const b = byId.get(id);
    if (!b) { location.replace('#/'); return; }
    current = b; qty = 1;
    chosen = priceOf(b, state.format) != null ? state.format : (FORMATS.find(f => priceOf(b, f) != null) || state.format);
    renderBook(b);
    const d = $('#dlg-book');
    if (!d.open) d.showModal();
    d.scrollTop = 0;
    $('#bk-title').focus({ preventScroll: true });
    document.title = `${b.title} — ${SITE.name}`;
  }

  function closeBook() {
    const d = $('#dlg-book');
    if (d.open) d.close();
    document.title = SITE.title;
  }

  // ---------- basket ----------
  function bagTotal() { return state.basket.reduce((s, l) => s + (priceOf(byId.get(l.id), l.format) || 0) * l.qty, 0); }
  function bagUnpriced() { return state.basket.filter(l => priceOf(byId.get(l.id), l.format) == null).length; }
  function bagCount() { return state.basket.reduce((s, l) => s + l.qty, 0); }

  function renderBagCount() {
    const n = bagCount(), c = $('#bag-count');
    c.hidden = n === 0; c.textContent = n;
    $('#bag-open').setAttribute('aria-label', `${SITE.words.basket}, ${n}`);
  }

  function renderBag() {
    const lines = state.basket.map((l, i) => {
      const b = byId.get(l.id), p = priceOf(b, l.format);
      return `<li class="line">
        <a href="#/book/${b.id}" class="line-cover" data-from-bag aria-label="${esc(b.title)}">${cover(b, SITE, shelfIndex[b.shelf] || 0)}</a>
        <div class="line-info"><p class="line-title">${esc(b.title)}</p><p class="line-fmt">${ICON[l.format]}${esc(SITE.formats[l.format])}</p>
          <div class="line-ctl">
            ${l.format === 'print' ? `<div class="qty qty-s"><button type="button" data-line="${i}" data-d="-1" aria-label="One fewer">${ICON.minus}</button><output>${l.qty}</output><button type="button" data-line="${i}" data-d="1" aria-label="One more">${ICON.plus}</button></div>` : ''}
            <button type="button" class="link" data-remove="${i}">${esc(SITE.words.remove)}</button></div></div>
        <p class="line-price">${p == null ? `<span class="line-pending">${esc(SITE.words.unpriced)}</span>` : show(p * l.qty)}</p></li>`;
    }).join('');
    $('#dlg-bag').innerHTML = `
      <header class="bag-head"><h2 id="bag-title">${esc(SITE.words.basket)}</h2><button type="button" class="x" data-close aria-label="Close">${ICON.close}</button></header>
      ${state.basket.length ? `<ul class="lines">${lines}</ul>
      <footer class="bag-foot"><p class="total"><span>${esc(SITE.words.total)}</span>${bagUnpriced() === state.basket.length ? `<span class="line-pending">${esc(SITE.words.unpriced)}</span>` : `<strong>${show(bagTotal())}</strong>`}</p>
        ${bagUnpriced() && bagUnpriced() < state.basket.length ? `<p class="bag-pending">${esc(SITE.words.toPrice.replace('{n}', bagUnpriced()))}</p>` : ''}
        <button type="button" class="btn btn-primary btn-wide" id="checkout">${esc(SITE.words.checkout)}</button>
        <p class="bag-note" id="bag-note" hidden>${esc(SITE.words.checkoutNote)}</p></footer>`
      : `<div class="bag-empty">${ICON.bag}<p>${esc(SITE.words.empty)}</p></div>`}`;
  }

  function addToBag(b, format, n) {
    const line = state.basket.find(l => l.id === b.id && l.format === format);
    if (line) line.qty = format === 'print' ? line.qty + n : 1;
    else state.basket.push({ id: b.id, format, qty: format === 'print' ? n : 1 });
    save('basket', state.basket);
    renderBagCount();
    toast(`${SITE.words.added} — ${b.title} · ${SITE.formats[format]}`);
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast'), host = document.querySelector('dialog[open]') || document.body;
    if (t.parentNode !== host) host.appendChild(t);
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2600);
  }

  // ---------- routing ----------
  let lastList = '#/';
  function route() {
    const h = location.hash || '#/';
    const m = h.match(/^#\/book\/([\w-]+)/);
    if (m) { openBook(m[1]); return; }
    closeBook();
    if (h === '#catalogue') return;
    const s = h.match(/^#\/shelf\/([\w-]+)/);
    const next = s && shelves.some(x => x.slug === s[1]) ? s[1] : 'all';
    const changed = next !== state.shelf || state.q;
    lastList = h;
    if (changed) {
      state.shelf = next;
      if (state.q) { state.q = ''; $('#q').value = ''; }
      renderCatalogue();
      if (s) scrollToCatalogue();
    }
  }
  function scrollToCatalogue() {
    const top = $('#catalogue').getBoundingClientRect().top + window.scrollY - stickyOffset();
    if (Math.abs(window.scrollY - top) > 4) window.scrollTo({ top, behavior: reduce() ? 'auto' : 'smooth' });
  }
  const stickyOffset = () => $('.bar').offsetHeight + $('.shelves').offsetHeight;
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- events ----------
  document.addEventListener('click', e => {
    const t = e.target;
    const fmtBtn = t.closest('.fmt button');
    if (fmtBtn) {
      state.format = fmtBtn.dataset.fmt; save('format', state.format);
      $$('.fmt button').forEach(b => b.setAttribute('aria-pressed', String(b === fmtBtn)));
      $$('#catalogue .card').forEach(a => {
        const b = byId.get(a.getAttribute('href').slice(7)), p = priceOf(b, state.format);
        a.querySelector('.card-price').innerHTML = priceCell(p);
      });
      return;
    }
    if (t.closest('.card, .step, [data-swap], [data-from-bag]')) {
      const a = t.closest('a');
      if (a && a.hash.startsWith('#/book/')) {
        e.preventDefault();
        if ($('#dlg-bag').open) $('#dlg-bag').close();
        if (location.hash.startsWith('#/book/')) location.replace(a.hash); else { openedInApp = true; location.hash = a.hash; }
      }
      return;
    }
    if (t.closest('[data-shelf]')) { e.preventDefault(); openedInApp = false; location.hash = t.closest('a').hash; return; }
    if (t.closest('[data-close]')) { const d = t.closest('dialog'); if (d.id === 'dlg-book') leaveBook(); else d.close(); return; }
    if (t.closest('#bag-open')) { renderBag(); $('#dlg-bag').showModal(); return; }
    const dq = t.closest('[data-qty]');
    if (dq) { qty = Math.max(1, Math.min(99, qty + Number(dq.dataset.qty))); syncAdd(); return; }
    if (t.closest('#add')) {
      addToBag(current, chosen, qty); qty = 1; syncAdd(); return;
    }
    const dl = t.closest('[data-line]');
    if (dl) {
      const l = state.basket[Number(dl.dataset.line)];
      l.qty = Math.max(1, Math.min(99, l.qty + Number(dl.dataset.d)));
      save('basket', state.basket); renderBag(); renderBagCount(); return;
    }
    const rm = t.closest('[data-remove]');
    if (rm) { state.basket.splice(Number(rm.dataset.remove), 1); save('basket', state.basket); renderBag(); renderBagCount(); return; }
    if (t.closest('#checkout')) { $('#bag-note').hidden = false; return; }
    // A click on the dialog's own backdrop closes it.
    if (t.matches('dialog.dlg')) { const r = t.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) { if (t.id === 'dlg-book') leaveBook(); else t.close(); } }
  });

  document.addEventListener('change', e => {
    if (e.target.name === 'fmt') { chosen = e.target.value; qty = 1; syncAdd(); }
  });

  function leaveBook() {
    if (openedInApp && history.length > 1) { openedInApp = false; history.back(); }
    else { location.hash = lastList; }
  }
  $('#dlg-book').addEventListener('cancel', e => { e.preventDefault(); leaveBook(); });

  let qTimer;
  $('#q').addEventListener('input', e => {
    const was = state.q;
    clearTimeout(qTimer);
    qTimer = setTimeout(() => {
      state.q = e.target.value;
      renderCatalogue();
      if (!was.trim() && state.q.trim()) scrollToCatalogue();
    }, 90);
  });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName) && !document.querySelector('dialog[open]')) { e.preventDefault(); $('#q').focus(); }
  });
  window.addEventListener('hashchange', route);

  // ---------- go ----------
  document.title = SITE.title;
  renderCatalogue();
  renderBagCount();
  route();
  requestAnimationFrame(() => document.documentElement.classList.add('ready'));
})();
