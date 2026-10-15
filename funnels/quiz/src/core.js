/* Scepter quiz engine: the pure part. No DOM, no network.
 *
 * A quiz is a config object (quizzes/*.js). Each answer option can:
 *   score: { stage: { growing: 2 }, need: { prayer: 3 } }   add points to a dimension
 *   value: { level: 3 }                                      push a number (averaged by derive())
 *   set:   { age: '25-34' }                                  set a profile field outright
 * computeProfile() turns answers into one profile: age band, stage, top needs, and the rest.
 * recommend() ranks catalog items (books, free booklets) against that profile and says why.
 * Runs in the browser (window.ScepterQuiz) and in Node for the tests (globalThis.ScepterQuiz).
 */
(function (root) {
  'use strict';
  var SQ = root.ScepterQuiz = root.ScepterQuiz || {};
  SQ.data = SQ.data || {};
  SQ.quizzes = SQ.quizzes || {};

  function asList(v) { return v == null ? [] : Array.isArray(v) ? v : [v]; }
  function ids(list) { return (list || []).map(function (x) { return x.id; }); }

  // ---- definition and validation -------------------------------------------------------------

  SQ.define = function (quiz) {
    var problems = SQ.validate(quiz);
    if (problems.length) throw new Error('ScepterQuiz "' + quiz.id + '": ' + problems.join('; '));
    SQ.quizzes[quiz.id] = quiz;
    return quiz;
  };

  // Catch config mistakes at load time, not in front of a reader.
  SQ.validate = function (quiz) {
    var out = [], seg = SQ.data.segments || {};
    var stages = ids(seg.stages), needs = ids(seg.needs), ages = ids(seg.ages);
    var lifes = ids(seg.lifeSeasons), langs = ids(seg.languages);
    var formats = Object.keys((seg.reasons || {}).format || {});
    if (!quiz || !quiz.id) return ['missing id'];
    if (!Array.isArray(quiz.questions) || !quiz.questions.length) out.push('no questions');
    var optionsOf = {};
    (quiz.questions || []).forEach(function (q) {
      if (!q.id) { out.push('a question has no id'); return; }
      if (optionsOf[q.id]) out.push('duplicate question id ' + q.id);
      optionsOf[q.id] = ids(q.options);
      if (q.type !== 'single' && q.type !== 'multi') out.push(q.id + ' type must be single or multi, not ' + q.type);
      if (q.max != null && !(q.max >= 1 && q.max === Math.floor(q.max))) out.push(q.id + ' max must be a whole number');
      if (!q.options || !q.options.length) out.push(q.id + ' has no options');
      var oids = {};
      (q.options || []).forEach(function (o) {
        if (oids[o.id]) out.push(q.id + ' duplicate option ' + o.id);
        oids[o.id] = true;
        var sc = o.score || {};
        Object.keys(sc.stage || {}).forEach(function (k) { if (stages.indexOf(k) < 0) out.push(q.id + '.' + o.id + ' unknown stage ' + k); });
        Object.keys(sc.need || {}).forEach(function (k) { if (needs.indexOf(k) < 0) out.push(q.id + '.' + o.id + ' unknown need ' + k); });
        var st = o.set || {};
        if (st.age && ages.indexOf(st.age) < 0) out.push(q.id + '.' + o.id + ' unknown age ' + st.age);
        if (st.stage && stages.indexOf(st.stage) < 0) out.push(q.id + '.' + o.id + ' unknown stage ' + st.stage);
        if (st.life && lifes.indexOf(st.life) < 0) out.push(q.id + '.' + o.id + ' unknown life season ' + st.life);
        if (st.lang && langs.indexOf(st.lang) < 0) out.push(q.id + '.' + o.id + ' unknown language ' + st.lang);
        if (st.format && formats.indexOf(st.format) < 0) out.push(q.id + '.' + o.id + ' unknown format ' + st.format);
        if (st.recipient && st.recipient !== 'self' && st.recipient !== 'gift') out.push(q.id + '.' + o.id + ' unknown recipient ' + st.recipient);
      });
      Object.keys(q.showIf || {}).forEach(function (dep) {
        if (!optionsOf[dep]) { out.push(q.id + ' showIf refers to ' + dep + ', which is not an earlier question'); return; }
        asList(q.showIf[dep]).forEach(function (o) { if (optionsOf[dep].indexOf(o) < 0) out.push(q.id + ' showIf lists ' + dep + '.' + o + ', which is not an option'); });
      });
    });
    return out;
  };

  // ---- answers -> profile ----------------------------------------------------------------------

  // showIf: { questionId: ['optionId', ...] } — shown when any listed option was chosen.
  function shown(q, answers) {
    if (!q.showIf) return true;
    return Object.keys(q.showIf).every(function (dep) {
      var picked = asList(answers[dep]);
      return asList(q.showIf[dep]).some(function (o) { return picked.indexOf(o) >= 0; });
    });
  }

  // Only answers to questions that are themselves visible count, so an answer left behind when
  // an earlier change hid its question can never show, score or send anything.
  function visibleQuestions(quiz, answers) {
    var eff = {}, out = [];
    quiz.questions.forEach(function (q) {
      if (!shown(q, eff)) return;
      out.push(q);
      if (answers && answers[q.id] !== undefined) eff[q.id] = answers[q.id];
    });
    return out;
  }

  // How many screens a reader may still see, assuming a question whose trigger has not been
  // answered yet could appear. The number only ever goes down as answers narrow the path, and
  // questions marked with the same `group` (alternatives of one another) count once.
  function estimateTotal(quiz, answers) {
    var groups = {}, n = 0;
    quiz.questions.forEach(function (q) {
      var possible = !q.showIf || Object.keys(q.showIf).every(function (dep) {
        var picked = asList(answers[dep]);
        if (!picked.length) return true;
        return asList(q.showIf[dep]).some(function (o) { return picked.indexOf(o) >= 0; });
      });
      if (!possible) return;
      if (q.group) { if (groups[q.group]) return; groups[q.group] = true; }
      n++;
    });
    return n;
  }

  function tally(quiz, answers) {
    var scores = {}, values = {}, sets = {};
    visibleQuestions(quiz, answers).forEach(function (q) {
      var w = q.weight == null ? 1 : q.weight;
      asList(answers[q.id]).forEach(function (oid) {
        var o = q.options.filter(function (x) { return x.id === oid; })[0];
        if (!o) return;
        Object.keys(o.score || {}).forEach(function (dim) {
          scores[dim] = scores[dim] || {};
          Object.keys(o.score[dim]).forEach(function (k) {
            scores[dim][k] = (scores[dim][k] || 0) + o.score[dim][k] * w;
          });
        });
        Object.keys(o.value || {}).forEach(function (dim) {
          (values[dim] = values[dim] || []).push(o.value[dim]);
        });
        Object.keys(o.set || {}).forEach(function (k) {
          if (q.type === 'multi') sets[k] = asList(sets[k]).concat(asList(o.set[k]));
          else sets[k] = o.set[k];
        });
      });
    });
    return { scores: scores, values: values, sets: sets };
  }

  // Keys by score, highest first; ties go to the earlier key in `order`.
  function rank(scores, order) {
    order = order || [];
    return Object.keys(scores || {}).sort(function (a, b) {
      var d = scores[b] - scores[a];
      if (d) return d;
      var ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    });
  }

  function mean(xs) {
    if (!xs || !xs.length) return null;
    return xs.reduce(function (s, x) { return s + x; }, 0) / xs.length;
  }

  function computeProfile(quiz, answers) {
    var seg = SQ.data.segments || {};
    var stageOrder = ids(seg.stages), needOrder = ids(seg.needs);
    var t = tally(quiz, answers || {});
    var stageScores = t.scores.stage || {};
    var needScores = t.scores.need || {};
    var p = {
      quiz: quiz.id,
      recipient: t.sets.recipient || 'self',
      age: t.sets.age || 'unknown',
      life: t.sets.life || null,
      stage: t.sets.stage || rank(stageScores, stageOrder)[0] || quiz.defaultStage || stageOrder[0] || null,
      needs: rank(needScores, needOrder).filter(function (k) { return needScores[k] > 0; }),
      format: t.sets.format || null,
      lang: t.sets.lang || 'en',
      extras: {},
      scores: t.scores,
      values: t.values,
      sets: t.sets
    };
    if (typeof quiz.derive === 'function') p = quiz.derive(p, answers || {}, t, SQ.core) || p;
    // Every profile leaves with at least one need, so every result has something to offer.
    if (!p.needs.length) {
      var st = (seg.stages || []).filter(function (s) { return s.id === p.stage; })[0];
      if (st && st.defaultNeed) p.needs = [st.defaultNeed];
    }
    p.needs = p.needs.slice(0, quiz.maxNeeds || 3);
    return p;
  }

  // ---- ranking catalog items -------------------------------------------------------------------

  var W = {
    stage: 6,        // written for exactly this stage
    stageNear: 2,    // written for the stage either side
    need: [8, 5, 3], // first, second, third need
    age: 3,
    ageMiss: -6,     // written for a different age group (e.g. a children's book for a retiree)
    format: 2,
    lang: 12,
    langMiss: -30,
    life: 3,
    audience: 8,     // a children's or teens' book for exactly that age group
    audienceLife: 4, // ...or for the parent of that age group
    priority: 1      // item.priority 0..3: flagship titles win ties
  };

  function stageIndex(id) { return ids((SQ.data.segments || {}).stages).indexOf(id); }

  function isMinor(age) {
    var a = ((SQ.data.segments || {}).ages || []).filter(function (x) { return x.id === age; })[0];
    return !!(a && a.minor);
  }

  // Who may be offered an item. Everything here fails closed: an unknown audience is refused.
  //   audience   children / teens: only that age, their parents (reader quiz), or a gift buyer
  //   catholic   presumes Catholic practice: never offered to a Seeking reader (or a gift for one)
  //   pointed    reads as "you need this": never given as a gift to someone away from the Church
  //   lifeOnly   written for couples or parents: not offered to minors, nor to a reader who has
  //              said they are in a different life season
  function eligible(item, p) {
    var gift = !!(p.recipient && p.recipient !== 'self');
    if (item.audience) {
      var who = (SQ.data.segments && SQ.data.segments.audiences || {})[item.audience];
      if (!who) return false;
      var byAge = asList(who.ages).indexOf(p.age) >= 0;
      var byParent = !gift && asList(who.life).indexOf(p.life) >= 0;
      if (!byAge && !byParent) return false;
    }
    // Spanish editions go only to readers who chose Spanish. A Spanish reader may still be offered
    // an English title where no Spanish one exists.
    if ((item.lang || 'en') !== 'en' && item.lang !== p.lang) return false;
    if (item.catholic && p.stage === 'exploring') return false;
    if (item.pointed && gift && (p.stage === 'exploring' || p.stage === 'returning')) return false;
    if (item.lifeOnly) {
      if (isMinor(p.age)) return false;
      if (!gift && p.life && asList(item.lifeOnly).indexOf(p.life) < 0) return false;
    }
    return true;
  }

  // Score one item and collect the reasons a reader would recognise.
  function scoreItem(item, p, weights) {
    var w = weights || W, s = 0, why = [];
    if (item.audience) {
      var who = (SQ.data.segments && SQ.data.segments.audiences || {})[item.audience];
      var isGift = p.recipient && p.recipient !== 'self';
      if (who && asList(who.ages).indexOf(p.age) >= 0) { s += w.audience; why.push({ kind: 'audience', id: item.audience }); }
      else if (who && !isGift && asList(who.life).indexOf(p.life) >= 0) { s += w.audienceLife; why.push({ kind: 'audience', id: item.audience }); }
    }
    var st = asList(item.stages), nd = asList(item.needs), ag = asList(item.ages);
    if (p.stage && st.indexOf(p.stage) >= 0) { s += w.stage; why.push({ kind: 'stage', id: p.stage }); }
    else if (p.stage && st.some(function (x) { return Math.abs(stageIndex(x) - stageIndex(p.stage)) === 1; })) s += w.stageNear;
    (p.needs || []).forEach(function (n, i) {
      if (nd.indexOf(n) >= 0) { s += w.need[Math.min(i, w.need.length - 1)]; why.push({ kind: 'need', id: n }); }
    });
    if (ag.length && ag.indexOf('all') < 0 && p.age && p.age !== 'unknown') {
      if (ag.indexOf(p.age) >= 0) { s += w.age; why.push({ kind: 'age', id: p.age }); }
      else s += w.ageMiss;
    }
    if (p.life && asList(item.life).indexOf(p.life) >= 0) { s += w.life; why.push({ kind: 'life', id: p.life }); }
    if (p.format && item.format === p.format) { s += w.format; why.push({ kind: 'format', id: p.format }); }
    var lang = item.lang || 'en';
    if (p.lang && p.lang !== 'en') s += lang === p.lang ? w.lang : 0;
    else if (lang !== 'en') s += w.langMiss;
    s += (item.priority || 0) * w.priority;
    return { item: item, score: s, reasons: why };
  }

  // Top `count` items, spread across authors and needs so three picks are not one book thrice.
  function recommend(items, p, opts) {
    opts = opts || {};
    var count = opts.count || 3, exclude = opts.exclude || [];
    var pool = (items || []).filter(function (it) {
      return exclude.indexOf(it.id) < 0 && eligible(it, p) && (!opts.filter || opts.filter(it, p));
    }).map(function (it, i) { var r = scoreItem(it, p, opts.weights); r.order = i; return r; });
    var picked = [];
    while (picked.length < count && pool.length) {
      pool.forEach(function (r) {
        var pen = 0;
        picked.forEach(function (q) {
          if (q.item.author && q.item.author === r.item.author) pen += 5;
          if (q.item.series && q.item.series === r.item.series) pen += 8;
          var qn = q.reasons.filter(function (x) { return x.kind === 'need'; }).map(function (x) { return x.id; });
          var rn = r.reasons.filter(function (x) { return x.kind === 'need'; }).map(function (x) { return x.id; });
          if (rn.length && rn.every(function (n) { return qn.indexOf(n) >= 0; })) pen += 2;
        });
        r.adj = r.score - pen;
      });
      pool.sort(function (a, b) { return (b.adj - a.adj) || (a.order - b.order); });
      picked.push(pool.shift());
    }
    return picked;
  }

  // ---- what leaves the page --------------------------------------------------------------------

  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  // Tags for systems that only take tags (Shopify customers, Mailchimp). Short and stable.
  // ctx.limited: the reader did not agree to marketing, or the address belongs to a parent or
  // guardian. Then nothing about faith, age or needs leaves the page: only which quiz it was.
  function tagsFor(p, extra, ctx) {
    ctx = ctx || {};
    var gift = !!(p.recipient && p.recipient !== 'self');
    var minorReader = !gift && isMinor(p.age);
    var pre = gift ? 'gift-' : '';
    var t = ['quiz-' + slug(p.quiz)];
    if (gift) t.push('gift-buyer');
    if (minorReader) t.push('guardian-signup');
    if (p.lang && p.lang !== 'en') t.push(pre + 'lang-' + slug(p.lang));
    if (ctx.limited || minorReader) return t.concat(asList(extra));
    if (p.age && p.age !== 'unknown') t.push(pre + 'age-' + slug(p.age));
    if (p.stage && !(gift && p.age === 'child')) t.push(pre + 'stage-' + slug(p.stage));
    (p.needs || []).forEach(function (n) { t.push(pre + 'need-' + slug(n)); });
    if (p.life) t.push(pre + 'life-' + slug(p.life));
    return t.concat(asList(extra));
  }

  // Profile properties for systems that take key/value data (Klaviyo, a webhook).
  // A gift buyer's record never shares a key with a reader's own, so buying for someone else
  // cannot overwrite what that person said about themselves.
  function propertiesFor(p, ctx) {
    ctx = ctx || {};
    var gift = !!(p.recipient && p.recipient !== 'self');
    var minorReader = !gift && isMinor(p.age);
    var limited = !!ctx.limited || minorReader;
    var pre = gift ? 'scepter_gift_' : 'scepter_';
    var props = {};
    props[pre + 'quiz'] = p.quiz;
    props[pre + 'quiz_completed_at'] = ctx.now || null;
    props[pre + 'free_ebook'] = ctx.magnet ? ctx.magnet.id : null;
    if (gift) props.scepter_gift_buyer = true;
    if (minorReader) props.scepter_guardian_signup = true;
    if (!limited) {
      props[pre + 'age_band'] = p.age;
      if (!(gift && p.age === 'child')) props[pre + 'stage'] = p.stage;
      props[pre + 'needs'] = p.needs || [];
      props[pre + 'life_season'] = p.life;
      props[pre + 'language'] = p.lang || 'en';
      props[pre + 'reading_format'] = p.format || null;
      props[pre + 'recommended'] = (ctx.recs || []).map(function (r) { return r.item.id; });
      if (!gift) Object.keys(p.extras || {}).forEach(function (k) { props['scepter_' + k] = p.extras[k]; });
    } else if (p.lang && p.lang !== 'en') {
      props[pre + 'language'] = p.lang;
    }
    Object.keys(props).forEach(function (k) { if (props[k] == null) delete props[k]; });
    return props;
  }

  SQ.core = {
    asList: asList,
    visibleQuestions: visibleQuestions,
    estimateTotal: estimateTotal,
    shown: shown,
    tally: tally,
    rank: rank,
    mean: mean,
    computeProfile: computeProfile,
    scoreItem: scoreItem,
    eligible: eligible,
    isMinor: isMinor,
    recommend: recommend,
    tagsFor: tagsFor,
    propertiesFor: propertiesFor,
    weights: W,
    slug: slug
  };
})(typeof window !== 'undefined' ? window : globalThis);
