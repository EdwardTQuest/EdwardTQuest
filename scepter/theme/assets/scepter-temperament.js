/*!
 * Scepter temperament test: the method, and the kit's stand-in questions.
 *
 * Two question sets:
 *  - Alexandre Havard's Temperament Test (twoStage below). His statements and result words are in
 *    a separate data file, scepter-temperament-havard.js, imported from virtuousleadership.com by
 *    tools/import-havard-test.mjs. They are HVLI's copyright, so that file is kept out of this
 *    public repository; the theme ships a placeholder of the same name. twoStage is his method,
 *    step for step, as his test page runs it.
 *  - A stand-in (QUESTIONS below): twenty-two forced-choice questions written for this kit in the
 *    same four-temperament framework, used until his data file is installed. Never present them as
 *    his test. The theme editor can replace them (one block per question).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else if (!root.ScepterTemperament) {
    root.ScepterTemperament = factory(); // safe to include twice on one page
    if (root.ScepterPopups && root.ScepterPopups.autoMount) root.ScepterPopups.autoMount(); // loaded after the pop-ups
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var KEYS = ['choleric', 'melancholic', 'sanguine', 'phlegmatic'];
  var LETTER = { c: 'choleric', m: 'melancholic', s: 'sanguine', p: 'phlegmatic' };

  // Result words, in the kit's own voice. Editable per temperament from the theme editor.
  var TEMPERAMENTS = {
    choleric: {
      name: 'Choleric', tagline: 'Action-oriented',
      summary: 'You react quickly and strongly, and your impressions last. You see what needs doing and you do it; people follow your energy and your decisiveness.',
      strengths: 'Decisive, driven, courageous, practical: a natural initiator who does not give up.',
      watch: 'Impatience, anger, pride, and running over people on the way to the goal.',
      virtue: 'Humility', virtueText: 'Humility turns your drive into service: greatness that lifts others up instead of leaving them behind.'
    },
    melancholic: {
      name: 'Melancholic', tagline: 'Idea-oriented',
      summary: 'You are slower to react, but your impressions run deep and last. You notice what others miss, and you long for what is true, beautiful and well done.',
      strengths: 'Deep, reflective, faithful, idealistic and attentive to detail.',
      watch: 'Discouragement, perfectionism, indecision, and brooding over hurts.',
      virtue: 'Boldness', virtueText: 'Your ideals are meant to be lived, not only contemplated. Boldness is the courage to act before everything is perfect.'
    },
    sanguine: {
      name: 'Sanguine', tagline: 'People-oriented',
      summary: 'You react quickly and brightly, and you move on just as quickly. You bring joy, warmth and energy into every room you enter.',
      strengths: 'Warm, enthusiastic, optimistic, generous: a natural connector.',
      watch: 'Superficiality, distraction, and starting much while finishing little.',
      virtue: 'Perseverance', virtueText: 'Constancy turns enthusiasm into lasting fruit: finish what you begin, and your joy will run deep.'
    },
    phlegmatic: {
      name: 'Phlegmatic', tagline: 'Peace-oriented',
      summary: 'You react slowly and mildly, and you keep an even keel. You are steady, patient, and a peacemaker by nature.',
      strengths: 'Calm, reliable, patient, diplomatic, and a wonderful listener.',
      watch: 'Passivity, comfort, avoiding conflict, and putting things off.',
      virtue: 'Magnanimity', virtueText: 'Your peace is a gift. Magnanimity gives it a direction: dream big, and turn the dream into a mission.'
    }
  };

  // Stand-in bank: twenty-two first-reaction questions, one answer per temperament, in varied order.
  // [prompt, [answer, temperament letter], …]. Question 21 is the classical definition and counts double.
  var QUESTIONS = [
    ['Someone contradicts you in front of others. Your first reaction:', ['I push back right away. I won’t let it stand.', 'c'], ['I go quiet, but I’ll turn it over for days.', 'm'], ['I laugh it off. By dinner it’s forgotten.', 's'], ['I stay calm and let it go. Not worth a fight.', 'p']],
    ['A free Saturday with nothing planned:', ['I call friends and see what happens.', 's'], ['Wonderful: a slow, quiet day at home.', 'p'], ['I tackle the project I’ve been meaning to finish.', 'c'], ['A long walk, a good book, time to think.', 'm']],
    ['A new project lands on your desk. You:', ['Take charge and set the goal.', 'c'], ['Think it through and plan every detail.', 'm'], ['Get excited and share ideas with everyone.', 's'], ['Wait to see what’s needed, then do your part steadily.', 'p']],
    ['At a party where you know almost no one:', ['By the end of the night I know half the room.', 's'], ['I find the people worth talking to and get to it.', 'c'], ['I find one person and have a pleasant chat.', 'p'], ['I’d rather be home; I stay near the edge.', 'm']],
    ['When you make a mistake:', ['It stays with me for a long time.', 'm'], ['I apologize, laugh, and move on.', 's'], ['I fix it fast and make sure it never happens again.', 'c'], ['I accept it calmly. These things happen.', 'p']],
    ['Your friends would say you are:', ['Determined and direct.', 'c'], ['Fun and full of life.', 's'], ['Easygoing and dependable.', 'p'], ['Thoughtful and deep.', 'm']],
    ['Plans change at the last minute:', ['Great, something new!', 's'], ['It unsettles me; I had it all worked out.', 'm'], ['Annoying. I make a new plan on the spot.', 'c'], ['Fine by me. I adapt without fuss.', 'p']],
    ['In a disagreement, you tend to:', ['Argue until it’s settled.', 'c'], ['Look for a compromise so everyone is at peace.', 'p'], ['Weigh every side, and often keep my view to myself.', 'm'], ['Say what I think in the moment, then forget it.', 's']],
    ['What drains you most?', ['Routine, and being alone too long.', 's'], ['Slowness and indecision in others.', 'c'], ['Noise, disorder and superficial talk.', 'm'], ['Conflict and pressure.', 'p']],
    ['When someone hurts you:', ['I feel it deeply, and it takes a long time to heal.', 'm'], ['I get angry quickly, and I don’t forget easily.', 'c'], ['I flare up, and then it’s over.', 's'], ['I hardly show it; it doesn’t shake me much.', 'p']],
    ['Deadlines:', ['I set them, for myself and for others.', 'c'], ['I meet them at my own steady pace.', 'p'], ['I usually make them at the last minute.', 's'], ['I start early because I want it done perfectly.', 'm']],
    ['When you walk into a room, people notice:', ['My energy and my laugh.', 's'], ['My confidence.', 'c'], ['Not much at first; I like to observe.', 'm'], ['My calm.', 'p']],
    ['Your workspace is usually:', ['Organized, with everything in its place.', 'm'], ['Cheerful chaos.', 's'], ['Set up for maximum efficiency.', 'c'], ['Comfortable, a little cluttered, and that’s fine.', 'p']],
    ['Faced with a big decision:', ['I decide quickly and don’t look back.', 'c'], ['I deliberate for a long time; I want to get it right.', 'm'], ['I go with my gut in the moment.', 's'], ['I take my time and ask what others think.', 'p']],
    ['In a group project, you are the one who:', ['Leads and drives it forward.', 'c'], ['Keeps spirits up and throws out ideas.', 's'], ['Catches every detail and every flaw.', 'm'], ['Keeps the peace and does the steady work.', 'p']],
    ['Good news arrives. You:', ['Tell everyone right away!', 's'], ['Smile and enjoy it quietly.', 'p'], ['Think about what it makes possible next.', 'c'], ['Savor it, and wonder whether it will last.', 'm']],
    ['Your most familiar struggle:', ['Pride and impatience.', 'c'], ['Discouragement and self-criticism.', 'm'], ['Being scattered; not following through.', 's'], ['Comfort; putting things off.', 'p']],
    ['Stuck in a long line:', ['Unbearable. I look for a faster way.', 'c'], ['I start chatting with the person next to me.', 's'], ['No problem. I’m patient.', 'p'], ['I think, and notice everything around me.', 'm']],
    ['When you take up a hobby:', ['I start many and finish few.', 's'], ['I go deep and want to master it.', 'm'], ['I want to excel, even to win.', 'c'], ['I keep one or two, the same ones for years.', 'p']],
    ['People sometimes tell you that you are:', ['Too blunt.', 'c'], ['Too serious.', 'm'], ['Too talkative.', 's'], ['Too laid-back.', 'p']],
    ['Your emotions are usually:', ['Quick to rise and quick to pass.', 's'], ['Strong, and they last.', 'c'], ['Deep, and slow to fade.', 'm'], ['Mild and even.', 'p'], 2],
    ['Your ideal vacation:', ['An ambitious trip with a packed itinerary.', 'c'], ['Somewhere lively, with friends and new faces.', 's'], ['A quiet place full of beauty and history.', 'm'], ['A hammock, a book, and nowhere to be.', 'p']]
  ];

  // "c", "C2", "choleric", "c1 s1", "none" -> { choleric: 1 } etc.
  function parseScore(v) {
    var out = {};
    String(v || '').toLowerCase().split(/[\s,+;]+/).filter(Boolean).forEach(function (tok) {
      var m = tok.match(/^([a-z]+?)(\d+(?:\.\d+)?)?$/);
      if (!m) return;
      var key = LETTER[m[1]] || (KEYS.indexOf(m[1]) >= 0 ? m[1] : null);
      if (key) out[key] = (out[key] || 0) + (m[2] ? Number(m[2]) : 1);
    });
    return out;
  }

  // Questions from the default bank, from theme-editor blocks ({prompt, answers:[{text, score}], weight}),
  // or from the array form above.
  function normaliseQuestions(list) {
    return (list || QUESTIONS).map(function (q) {
      if (Array.isArray(q)) {
        var weight = typeof q[q.length - 1] === 'number' ? q[q.length - 1] : 1;
        return { prompt: q[0], weight: weight, answers: q.slice(1).filter(Array.isArray).map(function (a) { return { text: a[0], score: parseScore(a[1]) }; }) };
      }
      return {
        prompt: q.prompt || q.q || '', weight: Number(q.weight) || 1,
        answers: (q.answers || q.a || []).filter(function (a) { return a && (a.text || a[0]); }).map(function (a) {
          return Array.isArray(a) ? { text: a[0], score: parseScore(a[1]) } : { text: a.text, score: typeof a.score === 'object' ? a.score : parseScore(a.score) };
        })
      };
    }).filter(function (q) { return q.prompt && q.answers.length >= 2; });
  }

  /**
   * score(questions, picks) -> { totals, percent, ranking, dominant, secondary, answered }
   *   picks: array of answer indexes (null for unanswered).
   * Ties for first place go to the temperament favoured by the heavier (more decisive)
   * questions, then by the later answers (people settle into honesty as they go).
   */
  function score(questions, picks) {
    var qs = normaliseQuestions(questions);
    var totals = {}, heavy = {}, late = {};
    KEYS.forEach(function (k) { totals[k] = 0; heavy[k] = 0; late[k] = 0; });
    var answered = 0;
    qs.forEach(function (q, i) {
      var pick = picks[i];
      if (pick === null || pick === undefined || !q.answers[pick]) return;
      answered++;
      var sc = q.answers[pick].score;
      Object.keys(sc).forEach(function (k) {
        totals[k] += sc[k] * q.weight;
        if (q.weight > 1) heavy[k] += sc[k];
        late[k] += sc[k] * (i + 1);
      });
    });
    var sum = KEYS.reduce(function (acc, k) { return acc + totals[k]; }, 0) || 1;
    var ranking = KEYS.slice().sort(function (a, b) {
      return (totals[b] - totals[a]) || (heavy[b] - heavy[a]) || (late[b] - late[a]) || (KEYS.indexOf(a) - KEYS.indexOf(b));
    });
    var percent = {};
    KEYS.forEach(function (k) { percent[k] = Math.round((totals[k] / sum) * 100); });
    // Rounding can leave the four at 99 or 101; give the difference to the dominant one.
    var drift = 100 - KEYS.reduce(function (acc, k) { return acc + percent[k]; }, 0);
    if (answered) percent[ranking[0]] += drift;
    return {
      totals: totals, percent: percent, ranking: ranking, answered: answered,
      dominant: ranking[0], secondary: totals[ranking[1]] > 0 ? ranking[1] : null,
      close: totals[ranking[1]] > 0 && totals[ranking[0]] - totals[ranking[1]] <= 1
    };
  }

  // -------------------------------------------------------------------------------------------
  // Alexandre Havard's two-stage test, as his page runs it (virtuousleadership.com, 2026-09-26).
  // The set (statements, structure, profiles) comes from scepter-temperament-havard.js.
  //
  //  Stage 1  Sixteen statements, four per temperament, in four rounds of one each (a new order
  //           every round, never the same temperament twice in a row). TRUE gives its temperament
  //           1 point; FALSE gives the opposite temperament half a point (choleric <-> phlegmatic,
  //           sanguine <-> melancholic).
  //  Ties     If two or more temperaments share first place, each asks its two tie-breakers,
  //           scored the same way. A tie that remains goes to the temperament with more TRUE
  //           answers in stage 1, and among equals to the first of choleric, sanguine,
  //           melancholic, phlegmatic.
  //  Stage 2  Six statements for the dominant temperament: three point to one neighbour (A),
  //           three to the other (B). Each TRUE counts +1 for A or -1 for B.
  //  Profile  Pure when stage 1 led by 2 or more and stage 2 stayed within ±1. Otherwise the
  //           secondary is A (score > 0), B (< 0), or on 0 whichever had more stage-1 points
  //           (A on a draw). The secondary is "marked" at ±3, "light" below.
  // So a reader answers 22 statements, 26, 28 or 30 with a tie.
  // -------------------------------------------------------------------------------------------
  var TYPES = ['COL', 'SAN', 'MEL', 'FLE'];
  var TYPE_KEY = { COL: 'choleric', MEL: 'melancholic', SAN: 'sanguine', FLE: 'phlegmatic' };

  function shuffle(list, rand) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function zero() { return { COL: 0, SAN: 0, MEL: 0, FLE: 0 }; }

  // Problems that make a set unusable ([] when it is fine).
  function validateSet(set) {
    var out = [];
    if (!set || typeof set !== 'object') return ['no question set'];
    var items = set.items || {};
    function text(id, where) { if (typeof items[id] !== 'string' || !items[id].trim()) out.push(where + ': no text for ' + id); }
    TYPES.forEach(function (k) {
      var s1 = (set.stage1 || {})[k], tb = (set.tiebreak || {})[k], s2 = (set.stage2 || {})[k];
      if (!Array.isArray(s1) || !s1.length) out.push('stage1: none for ' + k); else s1.forEach(function (id) { text(id, 'stage1'); });
      if (!Array.isArray(tb) || !tb.length) out.push('tiebreak: none for ' + k); else tb.forEach(function (id) { text(id, 'tiebreak'); });
      if (TYPES.indexOf((set.opposite || {})[k]) < 0) out.push('opposite: none for ' + k);
      if (!s2 || TYPES.indexOf(s2.A) < 0 || TYPES.indexOf(s2.B) < 0 || !Array.isArray(s2.items) || !s2.items.length) { out.push('stage2: incomplete for ' + k); return; }
      s2.items.forEach(function (x) { text(x && x.id, 'stage2'); if (!x || (x.adj !== 'A' && x.adj !== 'B')) out.push('stage2: bad neighbour in ' + k); });
      [k, k + '-' + s2.A, k + '-' + s2.B].forEach(function (key) { if (!((set.profiles || {})[key] || {}).name) out.push('profiles: none for ' + key); });
    });
    return out;
  }

  function stage1Order(set, rand) {
    var perm = {}, rounds = 0;
    TYPES.forEach(function (k) {
      perm[k] = shuffle(set.stage1[k].map(function (id, i) { return i; }), rand);
      rounds = Math.max(rounds, set.stage1[k].length);
    });
    var out = [];
    for (var r = 0; r < rounds; r++) {
      var order = shuffle(TYPES.filter(function (k) { return r < set.stage1[k].length; }), rand);
      if (out.length && order.length > 1 && order[0] === out[out.length - 1].type) {
        var o = 1 + Math.floor(rand() * (order.length - 1));
        var t = order[0]; order[0] = order[o]; order[o] = t;
      }
      order.forEach(function (k) { out.push({ id: set.stage1[k][perm[k][r]], type: k }); });
    }
    return out;
  }

  // answers[i]: true, false, or nothing yet.
  function tally(set, items, answers) {
    var n = zero();
    items.forEach(function (it, i) {
      if (answers[i] === true) n[it.type] += 1;
      else if (answers[i] === false) n[set.opposite[it.type]] += 0.5;
    });
    return n;
  }
  function add(a, b) { var n = zero(); TYPES.forEach(function (k) { n[k] = a[k] + b[k]; }); return n; }
  function rank(scores) {
    var sorted = TYPES.slice().sort(function (a, b) { return (scores[b] - scores[a]) || (TYPES.indexOf(a) - TYPES.indexOf(b)); });
    return {
      sorted: sorted, top: sorted[0], second: sorted[1], margin: scores[sorted[0]] - scores[sorted[1]],
      tied: sorted.filter(function (k) { return scores[k] === scores[sorted[0]]; })
    };
  }
  function tieItems(set, tied, rand) {
    var list = [];
    tied.forEach(function (k) { set.tiebreak[k].forEach(function (id) { list.push({ id: id, type: k }); }); });
    return shuffle(list, rand);
  }
  // The dominant temperament after stage 1 and any tie-breakers.
  function settle(set, s1, a1, tie, at) {
    var scores = tally(set, s1, a1);
    if (tie && tie.length) scores = add(scores, tally(set, tie, at || []));
    var r = rank(scores), dominant = r.top;
    if (tie && tie.length && r.tied.length >= 2) {
      var trues = zero();
      s1.forEach(function (it, i) { if (a1[i] === true) trues[it.type] += 1; });
      dominant = r.tied.reduce(function (best, k) { return trues[k] > trues[best] ? k : best; }, r.tied[0]);
    }
    return { dominant: dominant, scores: scores };
  }
  function stage2Order(set, dominant, rand) {
    return shuffle(set.stage2[dominant].items.map(function (x) { return { id: x.id, adj: x.adj, type: dominant }; }), rand);
  }
  function stage2Score(items, answers) {
    var n = 0;
    items.forEach(function (it, i) { if (answers[i] === true) n += it.adj === 'A' ? 1 : -1; });
    return n;
  }
  function decide(set, dominant, scores, s2) {
    var margin = rank(scores).margin, pair = set.stage2[dominant];
    var out = { dominant: dominant, margin: margin, s2: s2, scores: scores, key: dominant, pure: true, secondary: null, intensity: null };
    if (margin >= 2 && Math.abs(s2) <= 1) return out;
    var sec = s2 > 0 ? pair.A : s2 < 0 ? pair.B : (scores[pair.A] >= scores[pair.B] ? pair.A : pair.B);
    out.key = dominant + '-' + sec; out.pure = false; out.secondary = sec;
    out.intensity = Math.abs(s2) >= 3 ? 'marked' : 'light';
    return out;
  }

  // A reader's way through the test, one statement at a time. The pop-up keeps one of these.
  function start(set, rand) {
    return { phase: 'stage1', s1: stage1Order(set, rand || Math.random), a1: [], tie: [], at: [], s2: [], a2: [], index: 0, dominant: null, scores: null, result: null };
  }
  function lists(st) { return st.phase === 'tie' ? [st.tie, st.at] : st.phase === 'stage2' ? [st.s2, st.a2] : [st.s1, st.a1]; }
  function current(st) {
    if (st.phase !== 'stage1' && st.phase !== 'tie' && st.phase !== 'stage2') return null;
    return lists(st)[0][st.index] || null;
  }
  function progress(set, st) {
    var s2len = st.s2.length || set.stage2[TYPES[0]].items.length;
    var before = st.phase === 'tie' ? st.s1.length : st.phase === 'stage2' ? st.s1.length + st.tie.length : 0;
    return { n: before + st.index + 1, total: st.s1.length + st.tie.length + s2len };
  }
  // Records an answer (true / false) and moves on: to the next statement, the tie-breakers, the
  // stage-2 page ("transition"), or the result ("done"). Returns the state.
  function answer(set, st, value, rand) {
    rand = rand || Math.random;
    var l = lists(st), items = l[0], answers = l[1];
    if (!items[st.index]) return st;
    answers[st.index] = value === true;
    if (st.index + 1 < items.length) { st.index++; return st; }
    if (st.phase === 'stage1') {
      var r = rank(tally(set, st.s1, st.a1));
      if (r.tied.length >= 2) { st.tie = tieItems(set, r.tied, rand); st.at = []; st.index = 0; st.phase = 'tie'; return st; }
      st.tie = []; st.at = [];
    }
    if (st.phase === 'stage1' || st.phase === 'tie') {
      var d = settle(set, st.s1, st.a1, st.tie, st.at);
      st.dominant = d.dominant; st.scores = d.scores;
      st.s2 = stage2Order(set, d.dominant, rand); st.a2 = []; st.index = 0; st.phase = 'transition';
      return st;
    }
    st.result = decide(set, st.dominant, st.scores, stage2Score(st.s2, st.a2));
    st.phase = 'done';
    return st;
  }
  function proceed(st) { if (st.phase === 'transition') { st.phase = 'stage2'; st.index = 0; } return st; }
  // Back goes one statement at a time within a stage, as on his page.
  function canBack(st) { return (st.phase === 'stage1' || st.phase === 'tie' || st.phase === 'stage2') && st.index > 0; }
  function back(st) { if (canBack(st)) st.index--; return st; }
  // The answer already given to the current statement (after going back), if any.
  function given(st) { return current(st) ? lists(st)[1][st.index] : undefined; }

  var twoStage = {
    TYPES: TYPES, TYPE_KEY: TYPE_KEY, validateSet: validateSet, stage1Order: stage1Order, tally: tally, rank: rank,
    tieItems: tieItems, settle: settle, stage2Order: stage2Order, stage2Score: stage2Score, decide: decide,
    start: start, current: current, progress: progress, answer: answer, proceed: proceed, canBack: canBack, back: back, given: given
  };

  return { KEYS: KEYS, TEMPERAMENTS: TEMPERAMENTS, QUESTIONS: QUESTIONS, SOURCE: 'stand-in', parseScore: parseScore, normaliseQuestions: normaliseQuestions, score: score, twoStage: twoStage };
});
