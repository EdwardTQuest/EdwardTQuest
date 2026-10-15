/* Scepter quiz engine: the page. Renders a quiz config into an element, one question per screen,
 * then the result: who we think you are (and why), next steps, three books, the free ebook.
 *
 *   ScepterQuiz.mount(document.getElementById('scepter-quiz'), 'next-read')
 *
 * Results are shown before any sign-up; the email is only for the free ebook. Every string a
 * reader sees comes from the quiz config or data/segments.js, never from here, except the
 * handful of interface words in UI_TEXT below.
 */
(function (root) {
  'use strict';
  var SQ = root.ScepterQuiz = root.ScepterQuiz || {};
  var core = SQ.core, doc = root.document;

  var UI_TEXT = {
    start: 'Start',
    next: 'Next',
    back: 'Back',
    skip: 'Skip this one',
    seeResults: 'See my results',
    of: 'of',
    question: 'Question',
    chooseUpTo: function (n) { return 'Choose up to ' + n; },
    tooMany: function (n) { return 'You can pick up to ' + n + '. Unselect one to choose another.'; },
    pickOne: 'Choose an answer to continue.',
    basedOn: 'Based on what you told us',
    changeAnswers: 'Change my answers',
    retake: 'Start over',
    retakeSure: 'Erase my result and start over?',
    seeBook: 'See this book',
    addToCart: 'Add to cart',
    added: 'Added to your cart',
    viewCart: 'View cart',
    firstName: 'First name',
    optional: '(optional)',
    email: 'Email address',
    guardianEmail: 'Parent or guardian’s email',
    guardianFirst: 'Parent or guardian’s first name',
    emailInvalid: 'Please enter an email address like name@example.com.',
    consentRequired: 'Please tick the box so we can email you.',
    sending: 'Sending…',
    sendError: 'That didn’t go through. Please check your connection and try again.',
    download: 'Download now',
    copyLink: 'Copy link to this quiz',
    copied: 'Link copied',
    demoNote: 'Preview mode: nothing was sent. This is what the email system would receive:',
    challenge: 'One last step: please complete the check below so we can add you.',
    notAdded: 'We haven’t added you to our email list, as you asked.',
    englishOnly: 'Our free booklets are in English for now.'
  };

  // ---- tiny DOM helper: text is always set as text, never parsed as HTML ------------------------

  function h(tag, attrs, kids) {
    var el = doc.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    });
    (function add(list) {
      core.asList(list).forEach(function (c) {
        if (c == null || c === false) return;
        if (Array.isArray(c)) return add(c);
        el.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c);
      });
    })(kids);
    return el;
  }

  function paras(text, cls) {
    return core.asList(text).map(function (t) { return h('p', { class: cls, text: t }); });
  }

  // A string may be written per reader: { self: 'your', gift: 'their' }.
  function pick(v, p) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      var who = p && p.recipient === 'gift' ? 'gift' : 'self';
      return v[who] != null ? v[who] : v.self;
    }
    return v;
  }

  function byId(list, id) { return (list || []).filter(function (x) { return x.id === id; })[0] || null; }

  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(root.sessionStorage.getItem(key) || 'null');
      if (val === null) root.sessionStorage.removeItem(key);
      else root.sessionStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }

  function prefersReducedMotion() {
    try { return root.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  // ---- mount ---------------------------------------------------------------------------------

  SQ.mount = function (el, quizId, opts) {
    opts = opts || {};
    var quiz = typeof quizId === 'string' ? SQ.quizzes[quizId] : quizId;
    if (!el) throw new Error('ScepterQuiz.mount: no element');
    if (!quiz) throw new Error('ScepterQuiz.mount: unknown quiz ' + quizId);
    var seg = SQ.data.segments;
    var key = 'sq:' + quiz.id + ':v' + (quiz.version || 1);
    var saved = opts.fresh ? null : store(key);
    var okSaved = saved && typeof saved === 'object' && saved.answers && typeof saved.answers === 'object' && !Array.isArray(saved.answers) &&
      (saved.step === 'intro' || saved.step === 'q' || saved.step === 'result') &&
      typeof saved.index === 'number' && saved.index >= 0 && saved.index === Math.floor(saved.index) && saved.index < quiz.questions.length + 1;
    var state = okSaved ? { step: saved.step, index: saved.index, answers: saved.answers } : { step: 'intro', index: 0, answers: {} };
    var live = h('div', { class: 'sq-live', 'aria-live': 'polite', role: 'status' });
    var shell = h('div', { class: 'sq-shell' });
    var box = h('section', { class: 'sq', 'data-quiz': quiz.id, 'aria-label': quiz.meta.title }, [shell, live]);
    el.innerHTML = '';
    el.appendChild(box);
    // Any interaction counts: after a reload the first press still moves focus to the new screen.
    box.addEventListener('pointerdown', function () { state.touched = true; });
    box.addEventListener('keydown', function () { state.touched = true; });

    function save() { store(key, { step: state.step, index: state.index, answers: state.answers }); }
    function questions() { return core.visibleQuestions(quiz, state.answers); }
    function profileNow() { return core.computeProfile(quiz, state.answers); }
    function announce(t) { live.textContent = ''; setTimeout(function () { live.textContent = t; }, 30); }

    function show(node, focusSel) {
      shell.innerHTML = '';
      shell.appendChild(node);
      var f = shell.querySelector(focusSel || '[data-focus]');
      if (f && opts.autofocus !== false && state.touched) {
        f.setAttribute('tabindex', '-1');
        f.focus({ preventScroll: true });
        var top = box.getBoundingClientRect().top;
        if (top < 0 || top > root.innerHeight * 0.6) box.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      }
    }

    // ---- intro -------------------------------------------------------------------------------

    function renderIntro() {
      var m = quiz.meta;
      show(h('div', { class: 'sq-screen sq-intro' }, [
        m.eyebrow ? h('p', { class: 'sq-eyebrow', text: m.eyebrow }) : null,
        h('h2', { class: 'sq-title', 'data-focus': true, text: m.title }),
        h('div', { class: 'sq-lede' }, paras(m.lede)),
        m.facts ? h('ul', { class: 'sq-facts' }, m.facts.map(function (f) { return h('li', { text: f }); })) : null,
        h('div', { class: 'sq-actions' }, [
          h('button', { type: 'button', class: 'sq-btn sq-btn-primary', text: m.startLabel || UI_TEXT.start, onclick: function () {
            state.touched = true; state.step = 'q'; state.index = 0; save();
            SQ.track('start', { quiz: quiz.id }, box);
            render();
          } })
        ]),
        m.reassurance ? h('p', { class: 'sq-fine', text: m.reassurance }) : null
      ]));
    }

    // An answer can end the quiz without saving or sending anything: the under-13 screen.
    function renderStop(stop) {
      store(key, null);
      state.answers = {};
      show(h('div', { class: 'sq-screen sq-stop' }, [
        h('h2', { class: 'sq-title', 'data-focus': true, text: stop.title }),
        h('div', { class: 'sq-lede' }, paras(stop.text)),
        h('div', { class: 'sq-actions' }, [
          h('button', { type: 'button', class: 'sq-btn', text: stop.back || 'Go back', onclick: function () { state = { step: 'q', index: 0, answers: {}, touched: true }; render(); } })
        ])
      ]));
      announce(stop.title);
    }

    // ---- one question ------------------------------------------------------------------------

    function renderQuestion() {
      var qs = questions();
      if (state.index >= qs.length) { state.step = 'result'; save(); return render(); }
      var q = qs[state.index], p = profileNow();
      var multi = q.type === 'multi', max = q.max || (multi ? q.options.length : 1);
      var chosen = core.asList(state.answers[q.id]).slice();
      var n = state.index + 1, isLast = n === qs.length;
      var total = isLast ? qs.length : Math.max(core.estimateTotal(quiz, state.answers), qs.length);
      var errId = 'sq-' + quiz.id + '-err-' + q.id;
      var err = h('p', { class: 'sq-error', id: errId, role: 'alert', hidden: true });
      var nextBtn, viaPointer = false, leaving = false, gone = false;

      function commit() {
        if (chosen.length) state.answers[q.id] = multi ? chosen.slice() : chosen[0];
        else delete state.answers[q.id];
        save();
      }
      function go(delta) {
        if (gone) return;
        gone = true;
        var stopper = delta > 0 && chosen.length ? q.options.filter(function (o) { return o.id === chosen[0] && o.stop; })[0] : null;
        if (stopper) { delete state.answers[q.id]; save(); return renderStop(stopper.stop); }
        commit();
        state.index = Math.max(0, state.index + delta);
        var len = questions().length;
        if (state.index >= len) {
          state.step = 'result';
          SQ.track('complete', { quiz: quiz.id }, box);
        }
        save();
        render();
      }
      function next() {
        if (!chosen.length && q.required !== false) {
          err.textContent = UI_TEXT.pickOne; err.hidden = false;
          var first = form.querySelector('.sq-input'); if (first) first.focus();
          return;
        }
        go(1);
      }

      var inputs = q.options.map(function (o, i) {
        var id = 'sq-' + quiz.id + '-' + q.id + '-' + o.id;
        var input = h('input', {
          type: multi ? 'checkbox' : 'radio', name: 'sq-' + quiz.id + '-' + q.id, id: id, value: o.id,
          class: 'sq-input', 'aria-describedby': o.sub ? id + '-sub' : null
        });
        input.checked = chosen.indexOf(o.id) >= 0;
        input.addEventListener('change', function () {
          err.hidden = true;
          if (multi) {
            if (input.checked && chosen.length >= max) {
              input.checked = false;
              err.textContent = UI_TEXT.tooMany(max); err.hidden = false;
              return;
            }
            if (input.checked) chosen.push(o.id);
            else chosen = chosen.filter(function (x) { return x !== o.id; });
          } else {
            chosen = [o.id];
          }
          commit();
          if (nextBtn) nextBtn.classList.toggle('sq-ready', chosen.length > 0);
          // A mouse or touch pick on a single-choice question moves on; arrow keys do not, so a
          // keyboard reader can look through the choices and press Next.
          if (!multi && viaPointer && !leaving) {
            leaving = true;
            setTimeout(function () { go(1); }, prefersReducedMotion() ? 0 : 220);
          }
        });
        return h('li', { class: 'sq-option' }, [
          input,
          h('label', { for: id, class: 'sq-option-label', lang: o.lang }, [
            h('span', { class: 'sq-option-text', text: pick(o.label, p) }),
            o.sub ? h('span', { class: 'sq-option-sub', id: id + '-sub', text: pick(o.sub, p) }) : null
          ])
        ]);
      });

      nextBtn = h('button', {
        type: 'submit', class: 'sq-btn sq-btn-primary' + (chosen.length ? ' sq-ready' : ''),
        text: isLast ? UI_TEXT.seeResults : UI_TEXT.next
      });
      var form = h('form', { class: 'sq-screen sq-question', novalidate: true, onsubmit: function (e) { e.preventDefault(); next(); } }, [
        h('div', { class: 'sq-progress' }, [
          h('span', { class: 'sq-progress-text', text: UI_TEXT.question + ' ' + n + ' ' + UI_TEXT.of + ' ' + total }),
          h('span', { class: 'sq-bar', role: 'progressbar', 'aria-label': 'Progress', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(n - 1) }, [
            h('span', { class: 'sq-bar-fill', style: 'width:' + Math.round((n - 1) / total * 100) + '%' })
          ])
        ]),
        h('fieldset', { class: 'sq-fieldset', 'aria-describedby': errId }, [
          h('legend', { class: 'sq-prompt', 'data-focus': true, lang: q.lang, text: pick(q.prompt, p) }),
          q.help ? h('p', { class: 'sq-help', text: pick(q.help, p) }) : null,
          multi && max < q.options.length ? h('p', { class: 'sq-help sq-limit', text: UI_TEXT.chooseUpTo(max) }) : null,
          h('ul', { class: 'sq-options' + (q.columns ? ' sq-cols-' + q.columns : ''), role: 'list' }, inputs)
        ]),
        err,
        h('div', { class: 'sq-actions sq-nav' }, [
          state.index > 0 ? h('button', { type: 'button', class: 'sq-btn sq-btn-quiet', text: UI_TEXT.back, onclick: function () { go(-1); } }) : null,
          h('span', { class: 'sq-spacer' }),
          q.required === false ? h('button', { type: 'button', class: 'sq-btn sq-btn-link', text: UI_TEXT.skip, onclick: function () { chosen = []; go(1); } }) : null,
          nextBtn
        ])
      ]);
      form.addEventListener('pointerdown', function () { viaPointer = true; });
      form.addEventListener('keydown', function () { viaPointer = false; });
      show(form);
      announce(UI_TEXT.question + ' ' + n + ' ' + UI_TEXT.of + ' ' + total);
    }

    // ---- result ------------------------------------------------------------------------------

    function reasonText(r, p) {
      var R = seg.reasons || {};
      if (r.kind === 'need') { var nd = byId(seg.needs, r.id); return nd ? (nd.reason || nd.name) : null; }
      if (r.kind === 'stage') { var st = byId(seg.stages, r.id); return st ? pick(R.stage, p).replace('{stage}', st.name) : null; }
      if (r.kind === 'age') { var ag = byId(seg.ages, r.id); return ag && R.age ? pick(R.age, p).replace('{age}', ag.label) : null; }
      if (r.kind === 'format') { return (R.format || {})[r.id] || null; }
      if (r.kind === 'life') { var lf = byId(seg.lifeSeasons, r.id); return lf && lf.reason ? lf.reason : null; }
      if (r.kind === 'audience') { var au = (seg.audiences || {})[r.id]; return au ? au.label : null; }
      return null;
    }

    function bookCard(r, p) {
      var it = r.item;
      var reasons = r.reasons.map(function (x) { return reasonText(x, p); }).filter(Boolean).slice(0, 2);
      var card = h('li', { class: 'sq-book' }, [
        h('div', { class: 'sq-book-cover', 'aria-hidden': 'true' }, [h('span', { text: it.title.split(/[:(]/)[0].trim() })]),
        h('div', { class: 'sq-book-body' }, [
          h('h4', { class: 'sq-book-title', lang: it.lang, text: it.title }),
          it.author ? h('p', { class: 'sq-book-author', text: it.author }) : null,
          reasons.length ? h('ul', { class: 'sq-why', 'aria-label': 'Why this book' }, reasons.map(function (t) { return h('li', { text: t }); })) : null,
          it.blurb ? h('p', { class: 'sq-book-blurb', lang: it.lang, text: it.blurb }) : null,
          h('div', { class: 'sq-book-actions' }, [
            it.url ? h('a', { class: 'sq-btn sq-btn-small', href: it.url, target: opts.linkTarget || '_top', text: UI_TEXT.seeBook,
              onclick: function () { SQ.track('book_click', { quiz: quiz.id, book: it.id }, box); } }) : null
          ])
        ])
      ]);
      enrichFromShop(card, it);
      return card;
    }

    // On the Shopify store itself, fill in the cover, price and an add-to-cart button.
    function enrichFromShop(card, it) {
      var shop = (root.SCEPTER_QUIZ_SETTINGS || {}).shop || {};
      if (!shop.productCards || !it.url) return;
      var m = /\/products\/([^/?#]+)/.exec(it.url);
      if (!m) return;
      fetch((shop.root || '') + '/products/' + m[1] + '.js', { headers: { Accept: 'application/json' } })
        .then(function (res) { if (!res.ok) throw new Error(res.status); return res.json(); })
        .then(function (prod) {
          var img = prod.featured_image;
          if (img) {
            var cov = card.querySelector('.sq-book-cover');
            cov.innerHTML = '';
            cov.classList.add('sq-has-image');
            cov.appendChild(h('img', { src: img.replace(/^\/\//, 'https://') + (img.indexOf('?') < 0 ? '?' : '&') + 'width=240', alt: '', loading: 'lazy' }));
          }
          var v = (prod.variants || []).filter(function (x) { return x.available; })[0];
          var actions = card.querySelector('.sq-book-actions');
          var cents = v && typeof v.price === 'number' ? v.price : prod.price;
          if (typeof cents === 'number') {
            var money = (cents / 100).toLocaleString(undefined, { style: 'currency', currency: shop.currency || 'USD' });
            card.querySelector('.sq-book-body').insertBefore(h('p', { class: 'sq-price', text: money }), actions);
          }
          if (v && shop.addToCart) {
            var btn = h('button', { type: 'button', class: 'sq-btn sq-btn-small sq-btn-primary', text: UI_TEXT.addToCart });
            btn.addEventListener('click', function () {
              btn.disabled = true;
              fetch((shop.root || '') + '/cart/add.js', {
                method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ items: [{ id: v.id, quantity: 1 }] })
              }).then(function (res) {
                if (!res.ok) throw new Error(res.status);
                btn.replaceWith(h('a', { class: 'sq-btn sq-btn-small', href: (shop.root || '') + '/cart', target: '_top', text: UI_TEXT.added + ' · ' + UI_TEXT.viewCart }));
                SQ.track('add_to_cart', { quiz: quiz.id, book: it.id }, box);
                try { doc.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true })); } catch (e) {}
              }).catch(function () { btn.disabled = false; });
            });
            actions.insertBefore(btn, actions.firstChild);
          }
        })
        .catch(function () { /* not on the shop, or the handle moved: the plain card stands */ });
    }

    function captureCard(p, magnet, recs) {
      var cap = SQ.capture.settings().capture;
      var consentCfg = Object.assign({}, seg.consent || {}, cap.consent || {});
      var guardian = p.recipient !== 'gift' && core.isMinor(p.age);
      // Only an explicit 'notice' skips the box. Anything else, including a typo, asks for a ticked
      // box, and so does a parent or guardian's address.
      var boxMode = guardian || consentCfg.mode !== 'notice';
      var M = quiz.result.magnet || {};
      var fid = 'sq-' + quiz.id;
      var firstName = h('input', { id: fid + '-first', name: 'first_name', type: 'text', autocomplete: 'given-name', class: 'sq-field' });
      var email = h('input', { id: fid + '-email', name: 'email', type: 'email', autocomplete: 'email', inputmode: 'email', required: true, class: 'sq-field', 'aria-describedby': fid + '-email-err' });
      var emailErr = h('p', { class: 'sq-error', id: fid + '-email-err', hidden: true });
      var consentBox = boxMode ? h('input', { id: fid + '-consent', type: 'checkbox', class: 'sq-check' }) : null;
      var consentText = guardian
        ? ((boxMode && consentCfg.guardianCheckboxText) || consentCfg.guardianText || consentCfg.text)
        : ((boxMode && consentCfg.checkboxText) || consentCfg.text);
      var sendErr = h('p', { class: 'sq-error', role: 'alert', hidden: true });
      var submit = h('button', { type: 'submit', class: 'sq-btn sq-btn-primary sq-btn-wide', text: pick(M.button, p) || 'Send me the free ebook' });
      var frameHost = h('div', { class: 'sq-frame-host' });   // lives outside the form so a captcha survives
      var privacy = consentCfg.privacyUrl ? h('a', { href: consentCfg.privacyUrl, target: '_blank', rel: 'noopener', text: consentCfg.privacyLabel || 'Privacy policy' }) : null;

      var form = h('form', { class: 'sq-capture-form', novalidate: true }, [
        guardian && M.guardianNote ? h('p', { class: 'sq-guardian', text: M.guardianNote }) : null,
        h('div', { class: 'sq-fields' }, [
          h('div', { class: 'sq-field-row' }, [
            h('label', { for: fid + '-first' }, [guardian ? UI_TEXT.guardianFirst : UI_TEXT.firstName, ' ', h('span', { class: 'sq-optional', text: UI_TEXT.optional })]),
            firstName
          ]),
          h('div', { class: 'sq-field-row' }, [
            h('label', { for: fid + '-email', text: guardian ? UI_TEXT.guardianEmail : UI_TEXT.email }),
            email,
            emailErr
          ])
        ]),
        consentBox ? h('div', { class: 'sq-consent sq-consent-box' }, [consentBox, h('label', { for: fid + '-consent', text: consentText })]) : null,
        submit,
        !consentBox ? h('p', { class: 'sq-consent sq-fine' }, [consentText + ' ', privacy]) : (privacy ? h('p', { class: 'sq-fine' }, [privacy]) : null),
        sendErr
      ]);

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = email.value.trim();
        emailErr.hidden = true; sendErr.hidden = true;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
          emailErr.textContent = UI_TEXT.emailInvalid; emailErr.hidden = false;
          email.setAttribute('aria-invalid', 'true'); email.focus(); return;
        }
        email.removeAttribute('aria-invalid');
        var consent = consentBox ? consentBox.checked : true;
        var guardianFirst = guardian ? '' : firstName.value;
        var payload = SQ.capture.buildPayload(quiz, state.answers, p, {
          email: v, firstName: guardianFirst, consent: consent, consentText: consentText, guardian: guardian
        }, { magnet: magnet, recs: recs });
        submit.disabled = true; submit.textContent = UI_TEXT.sending;
        SQ.capture.send(payload, {
          frameHost: frameHost,
          onChallenge: function () { if (!frameHost.querySelector('.sq-challenge-note')) frameHost.insertBefore(h('p', { class: 'sq-help sq-challenge-note', role: 'status', text: UI_TEXT.challenge }), frameHost.firstChild); }
        }).then(function (res) {
          state.captured = { first: guardian ? '' : firstName.value.trim(), skipped: !!(res && res.skipped), challenge: !!(res && res.challenge) };
          SQ.track('lead', { quiz: quiz.id, magnet: magnet && magnet.id }, box);
          form.replaceWith(captureDone(p, magnet, payload, state.captured));
        }).catch(function (err) {
          try { root.console && root.console.error('[ScepterQuiz]', err); } catch (x) {}
          submit.disabled = false; submit.textContent = pick(M.button, p) || 'Send me the free ebook';
          sendErr.textContent = UI_TEXT.sendError; sendErr.hidden = false;
        });
      });

      return h('section', { class: 'sq-capture', 'aria-labelledby': fid + '-magnet-title' }, [
        h('div', { class: 'sq-capture-head' }, [
          h('p', { class: 'sq-eyebrow', text: pick(M.eyebrow, p) || 'Free ebook' }),
          h('h3', { class: 'sq-capture-title', id: fid + '-magnet-title', text: magnet.title }),
          magnet.author ? h('p', { class: 'sq-book-author', text: magnet.author }) : null,
          h('div', { class: 'sq-capture-blurb' }, paras(magnet.blurb)),
          M.promise ? h('p', { class: 'sq-promise', text: pick(M.promise, p) }) : null,
          p.lang === 'es' && magnet.lang !== 'es' ? h('p', { class: 'sq-promise', text: UI_TEXT.englishOnly }) : null
        ]),
        h('div', { class: 'sq-capture-body' }, [form, frameHost])
      ]);
    }

    function captureDone(p, magnet, payload, res) {
      var M = quiz.result.magnet || {};
      res = res || state.captured || {};
      var name = res.first;
      var provider = SQ.capture.settings().capture.provider || 'demo';
      var byEmail = !magnet.url && !res.skipped;
      var title = (byEmail ? (pick(M.doneTitleEmail, p) || pick(M.doneTitle, p)) : pick(M.doneTitle, p)) || 'Your ebook is ready.';
      var text = res.skipped
        ? UI_TEXT.notAdded + ' ' + (magnet.url ? 'Your ebook is below.' : 'You can read it free in the Scepter app.')
        : ((magnet.url ? pick(M.doneTextLink, p) : pick(M.doneText, p)) || 'Your free ebook is on its way to your inbox.');
      var kids = [
        h('h4', { class: 'sq-done-title', 'data-focus': true, text: (name ? 'Thank you, ' + name + '. ' : 'Thank you. ') + title }),
        h('p', { text: text })
      ];
      if (magnet.url) kids.push(h('a', { class: 'sq-btn sq-btn-primary', href: magnet.url, target: '_blank', rel: 'noopener', text: UI_TEXT.download,
        onclick: function () { SQ.track('download', { quiz: quiz.id, magnet: magnet.id }, box); } }));
      if (magnet.alt && magnet.alt.url) kids.push(h('a', { class: 'sq-btn sq-btn-quiet', href: magnet.alt.url, target: '_blank', rel: 'noopener', text: magnet.alt.label }));
      if (provider === 'demo' && payload) {
        kids.push(h('details', { class: 'sq-demo' }, [
          h('summary', { text: UI_TEXT.demoNote }),
          h('pre', { text: JSON.stringify(payload, null, 2) })
        ]));
      }
      var el = h('div', { class: 'sq-done', role: 'status' }, kids);
      setTimeout(function () { var f = el.querySelector('[data-focus]'); if (f) { f.setAttribute('tabindex', '-1'); f.focus({ preventScroll: true }); } }, 20);
      return el;
    }

    function chips(p) {
      var out = [];
      var ag = byId(seg.ages, p.age); if (ag && p.age !== 'unknown') out.push(ag.chip || ag.label);
      var lf = byId(seg.lifeSeasons, p.life); if (lf) out.push(lf.chip || lf.label);
      (p.needs || []).forEach(function (n) { var nd = byId(seg.needs, n); if (nd) out.push(nd.name); });
      if (p.lang && p.lang !== 'en') { var lg = byId(seg.languages, p.lang); if (lg) out.push(lg.label); }
      return out;
    }

    function renderResult() {
      var p = profileNow();
      var st = byId(seg.stages, p.stage) || seg.stages[0];
      var R = quiz.result || {};
      var catalog = SQ.data.catalog || [];
      var recs = core.recommend(catalog, p, { count: R.count || 3, filter: R.filter });
      var magnets = SQ.data.magnets || [];
      var magnet = magnets.length ? core.recommend(magnets, p, { count: 1, filter: R.magnetFilter })[0].item : null;
      var plan = typeof quiz.plan === 'function' ? quiz.plan(p, SQ.data, core) : null;
      var gift = p.recipient === 'gift';
      var portrait = pick(R.portrait ? R.portrait(p, st) : (gift ? st.giftPortrait || st.portrait : st.portrait), p);

      if (!state.resultTracked) {
        state.resultTracked = true;
        SQ.track('result', { quiz: quiz.id }, box);
      }

      var tagline = R.tagline === undefined ? pick(st.tagline, p) : (typeof R.tagline === 'function' ? R.tagline(p, st) : R.tagline);
      var notes = typeof R.notes === 'function' ? R.notes(p, st) : (R.notes || []);
      var head = h('header', { class: 'sq-result-head' }, [
        h('p', { class: 'sq-eyebrow', text: pick(R.eyebrow, p) || 'Your result' }),
        h('h2', { class: 'sq-title', 'data-focus': true, text: pick(R.title ? R.title(p, st) : st.name, p) }),
        tagline ? h('p', { class: 'sq-tagline', text: tagline }) : null,
        h('div', { class: 'sq-portrait' }, paras(portrait)),
        notes.length ? h('div', { class: 'sq-notes' }, notes.map(function (n) { return h('p', { class: 'sq-note', text: n }); })) : null,
        h('div', { class: 'sq-basis' }, [
          h('span', { class: 'sq-basis-label', text: UI_TEXT.basedOn + ':' }),
          h('ul', { class: 'sq-chips' }, chips(p).map(function (c) { return h('li', { text: c }); })),
          h('button', { type: 'button', class: 'sq-btn sq-btn-link', text: UI_TEXT.changeAnswers, onclick: function () {
            state.touched = true; state.step = 'q'; state.index = 0; state.resultTracked = false; state.captured = null; save(); render();
          } })
        ])
      ]);

      var steps = plan && plan.steps && plan.steps.length ? h('section', { class: 'sq-plan' }, [
        h('h3', { class: 'sq-h3', text: plan.title }),
        plan.intro ? h('p', { class: 'sq-help', text: plan.intro }) : null,
        h('ul', { class: 'sq-steps', role: 'list' }, plan.steps.map(function (s) {
          return h('li', null, [h('strong', { text: s.title }), s.text ? h('span', { text: ' ' + s.text }) : null]);
        }))
      ]) : null;

      var books = recs.length ? h('section', { class: 'sq-books' }, [
        h('h3', { class: 'sq-h3', text: pick(R.booksTitle, p) || 'Books picked for you' }),
        R.booksIntro ? h('p', { class: 'sq-help', text: pick(R.booksIntro, p) }) : null,
        h('ul', { class: 'sq-book-list', role: 'list' }, recs.map(function (r) { return bookCard(r, p); }))
      ]) : null;

      var capture = magnet ? (state.captured ? captureDone(p, magnet, null, null) : captureCard(p, magnet, recs)) : null;

      var urls = (root.SCEPTER_QUIZ_SETTINGS || {}).quizUrls || {};
      var others = (R.crossLinks || []).map(function (c) { return { label: c.label, url: c.url || urls[c.quiz] }; }).filter(function (c) { return c.url; });
      var foot = h('footer', { class: 'sq-result-foot' }, [
        h('button', { type: 'button', class: 'sq-btn sq-btn-quiet', text: UI_TEXT.retake, onclick: function (e) {
          if (!e.currentTarget.getAttribute('data-sure')) { e.currentTarget.setAttribute('data-sure', '1'); e.currentTarget.textContent = UI_TEXT.retakeSure; return; }
          state = { step: 'intro', index: 0, answers: {}, touched: true }; store(key, null); render();
        } }),
        others.map(function (c) { return h('a', { class: 'sq-btn sq-btn-quiet', href: c.url, target: '_top', text: c.label }); }),
        h('button', { type: 'button', class: 'sq-btn sq-btn-link', text: UI_TEXT.copyLink, onclick: function (e) {
          var b = e.currentTarget, loc = root.location || {};
          var url = loc.origin && loc.origin !== 'null' ? loc.origin + loc.pathname : (loc.href || '').split(/[?#]/)[0];
          var ok = function () { b.textContent = UI_TEXT.copied; };
          try { root.navigator.clipboard.writeText(url).then(ok, function () { b.textContent = url; }); } catch (x) { b.textContent = url; }
        } })
      ]);

      // Order: who you are, the books (the result), then the free ebook, then the steps. A quiz may
      // reorder with result.order.
      var parts = { head: head, capture: capture, plan: steps, books: books };
      var order = R.order || ['head', 'books', 'capture', 'plan'];
      show(h('div', { class: 'sq-screen sq-result' + (gift ? ' sq-gift' : '') }, order.map(function (k) { return parts[k]; }).concat([foot])));
      announce('Your results are ready: ' + (st ? st.name : ''));
    }

    function render() {
      box.setAttribute('data-step', state.step);
      if (state.step === 'intro') renderIntro();
      else if (state.step === 'q') renderQuestion();
      else renderResult();
    }

    render();
    return {
      get state() { return state; },
      profile: profileNow,
      reset: function () { state = { step: 'intro', index: 0, answers: {} }; store(key, null); render(); }
    };
  };

  // Auto-mount: <div data-scepter-quiz="next-read"></div>
  SQ.autoMount = function () {
    var els = doc.querySelectorAll('[data-scepter-quiz]');
    Array.prototype.forEach.call(els, function (el) {
      if (el.__sqMounted) return;
      el.__sqMounted = true;
      try { SQ.mount(el, el.getAttribute('data-scepter-quiz')); }
      catch (e) { try { root.console.error('[ScepterQuiz]', e); } catch (x) {} }
    });
  };
  if (doc) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', SQ.autoMount);
    else setTimeout(SQ.autoMount, 0);
  }
  SQ.UI_TEXT = UI_TEXT;
})(typeof window !== 'undefined' ? window : globalThis);
