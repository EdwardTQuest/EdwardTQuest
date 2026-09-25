/*!
 * Scepter Formation Quiz — three variants of one quiz ("Discover your mission!", "What adventure
 * is God calling you on?", "What hidden treasures has God laid in store for you this week?").
 * All three ask the same things in a different order and voice, gate the result behind an email,
 * and show a twelve-month reading plan built by ScepterEngine.
 *
 * Mount: any element with [data-sp-quiz] containing <script type="application/json" data-sp-config>.
 * Needs: scepter-engine.js, scepter-lead.js (loaded first).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else if (!root.ScepterQuiz) root.ScepterQuiz = factory(); // safe to include twice on one page
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------------------------------------
  // The questions. Answer keys are shared by every variant; the words are not.
  // ---------------------------------------------------------------------------------------------

  var AGE = [['u18', 'Under 18'], ['18-24', '18–24'], ['25-34', '25–34'], ['35-44', '35–44'], ['45-54', '45–54'], ['55-64', '55–64'], ['65+', '65 or older']];
  var RELIGION = [['catholic', 'Catholic'], ['orthodox', 'Orthodox Christian'], ['protestant', 'Protestant or Evangelical'],
    ['lds', 'Latter-day Saint (Mormon)'], ['muslim', 'Muslim'], ['jewish', 'Jewish'], ['other', 'Another faith'], ['none', 'No religion, or still searching']];
  // Gender: male or female; "Other" is offered unless the answer to religion was Catholic, Muslim or Latter-day Saint.
  var NO_OTHER_GENDER = ['catholic', 'muslim', 'lds'];
  function genderOptions(a) {
    var o = [['m', 'Male'], ['f', 'Female']];
    if (NO_OTHER_GENDER.indexOf(a.religion) < 0) o.push(['other', 'Other']);
    return o;
  }
  function stateOptions(a) {
    var o = [['single', 'Single'], ['engaged', 'Engaged'], ['married', 'Married'], ['widowed', 'Widowed']];
    if (a.religion === 'catholic' || a.religion === 'orthodox') {
      o.push(['religious', 'Religious', 'Sister, brother, monk or nun']);
      if (a.gender !== 'f') o.push(['priest', 'Priest']);
    } else if (a.religion && a.religion !== 'none') {
      o.push(['clergy', 'Clergy', 'Pastor, minister or religious leader']);
    }
    return o;
  }
  var YEARS = [['<1', 'Less than a year'], ['1-5', '1–5 years'], ['6-15', '6–15 years'], ['16-30', '16–30 years'], ['30+', 'Over 30 years']];
  var KIDS = [['0', 'None'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6+']];
  var PRIEST_TYPE = [['secular', 'Secular', 'Diocesan'], ['religious', 'Religious', 'A member of an order']];
  var PRIEST_ROLE = [['parochial', 'Parochial', 'In a parish'], ['non_parochial', 'Not parochial', 'Chaplaincy, teaching, curia or other']];
  var ORDERS = ['Augustinians', 'Benedictines', 'Carmelites', 'Carthusians', 'Cistercians', 'Daughters of St. Paul',
    'Dominicans', 'Franciscans', 'Jesuits', 'Legionaries of Christ', 'Marists', 'Missionaries of Charity', 'Norbertines',
    'Oblates of the Virgin Mary', 'Passionists', 'Poor Clares', 'Redemptorists', 'Salesians', 'Sisters of Life', 'Trappists', 'Vincentians'];
  var WORK = [['business', 'Business or entrepreneurship'], ['professional', 'Office or professional'], ['education', 'Education'],
    ['healthcare', 'Healthcare'], ['public', 'Law, government or military'], ['trades', 'Trades, farming, hands-on'],
    ['creative', 'Creative, media or tech'], ['ministry', 'Ministry or Church work'], ['home', 'Home and family'],
    ['student', 'Student'], ['retired', 'Retired'], ['seeking', 'Looking for work']];
  var WORK_FEEL = [['energized', 'Energized', 'I love what I do'], ['content', 'Content', 'Good, honest work'],
    ['stretched', 'Stretched thin', 'Too much, too fast'], ['burnedout', 'Burned out', 'Running on empty'],
    ['restless', 'Restless', 'I want it to mean more'], ['seeking', 'Searching', 'Between jobs or changing course']];
  var FAITH = [['onfire', 'On fire', 'I want to share it'], ['growing', 'Growing', 'Slowly but surely'],
    ['steady', 'Steady', 'Solid, if a little routine'], ['dry', 'Dry', 'I pray, but feel little'],
    ['doubting', 'Doubting', 'I have real questions'], ['distant', 'Distant', 'I have drifted away'],
    ['none', 'Not yet', 'I don’t have faith right now']];
  var FEEL_ROWS = [['god', 'God'], ['religion', 'Religion'], ['world', 'The world']];
  var SERVICE = ['Not at all', 'A little', 'Somewhat', 'Mostly', 'Completely'];

  var QUESTIONS = {
    age: { type: 'choice', layout: 'grid', options: AGE },
    religion: { type: 'choice', layout: 'list', options: RELIGION },
    gender: { type: 'choice', layout: 'row', options: genderOptions },
    state: { type: 'choice', layout: 'list', options: stateOptions },
    marriedDetails: { type: 'compound', when: function (a) { return a.state === 'married'; },
      fields: [{ key: 'marriedYears', options: YEARS, layout: 'years' }, { key: 'kids', options: KIDS, layout: 'count' }] },
    priestDetails: { type: 'compound', when: function (a) { return a.state === 'priest'; },
      fields: [{ key: 'priestType', options: PRIEST_TYPE, layout: 'grid2' }, { key: 'priestRole', options: PRIEST_ROLE, layout: 'grid2' }] },
    order: { type: 'text', key: 'order', suggestions: ORDERS, optional: true,
      when: function (a) { return a.state === 'religious' || (a.state === 'priest' && a.priestType === 'religious'); } },
    work: { type: 'choice', layout: 'grid', options: WORK },
    workFeel: { type: 'choice', layout: 'list', options: WORK_FEEL },
    workService: { type: 'scale', points: 5, labels: SERVICE },
    feel: { type: 'triple', rows: FEEL_ROWS, points: 5 },
    faith: { type: 'choice', layout: 'list', options: FAITH },
    home: { type: 'scale', points: 10, ends: true },
    desire: { type: 'choice', layout: 'cards', options: [['grow', 'Grow'], ['learn', 'Learn'], ['discover', 'Discover']] },
    email: { type: 'email' }
  };

  var FLOW = {
    mission:   ['age', 'religion', 'gender', 'state', 'marriedDetails', 'priestDetails', 'order', 'work', 'workFeel', 'workService', 'feel', 'faith', 'home', 'desire', 'email'],
    adventure: ['desire', 'feel', 'faith', 'religion', 'gender', 'age', 'state', 'marriedDetails', 'priestDetails', 'order', 'home', 'work', 'workFeel', 'workService', 'email'],
    treasures: ['feel', 'faith', 'home', 'age', 'religion', 'gender', 'state', 'marriedDetails', 'priestDetails', 'order', 'work', 'workFeel', 'workService', 'desire', 'email']
  };

  // ---------------------------------------------------------------------------------------------
  // The three voices.
  // ---------------------------------------------------------------------------------------------

  var COPY = {
    mission: {
      name: 'Discover Your Mission',
      kicker: 'A two-minute formation quiz',
      title: 'Discover your mission.',
      lead: 'God never wastes a life. Answer twelve honest questions and we’ll build your mission plan: twelve months, twelve books, chosen for exactly where you are.',
      cta: 'Begin your briefing',
      meta: ['12 questions', '2 minutes', 'Free'],
      progress: 'Briefing {n} of {total}',
      steps: {
        age: { title: 'First, your dossier. How old are you?', sub: 'We choose books written for your season of life.' },
        religion: { title: 'What is your faith?', sub: 'Everyone is welcome here. We’ll meet you where you are.' },
        gender: { title: 'Are you…' },
        state: { title: 'What is your state in life?', sub: 'Your vocation shapes your mission.' },
        marriedDetails: { title: 'Tell us about your marriage.', fields: { marriedYears: 'How long have you been married?', kids: 'How many children?' } },
        priestDetails: { title: 'Tell us about your priesthood.', fields: { priestType: 'Secular or religious?', priestRole: 'Are you in parish ministry?' } },
        order: { title: 'Which order or community?', sub: 'Type it in, or skip.', placeholder: 'e.g. Dominicans, Poor Clares' },
        work: { title: 'Where is your mission field?', sub: 'What do you do for work?' },
        workFeel: { title: 'How do you feel about your work right now?', sub: 'Whatever your work is: a job, your studies, your home.' },
        workService: { title: 'How much does your work feel like serving God and others?' },
        feel: { title: 'Right now, how do you feel about…', sub: 'Be honest. There are no wrong answers.', scale: ['Pretty poor', 'Not great', 'Mixed', 'Good', 'Wonderful'] },
        faith: { title: 'How would you describe your faith these days?' },
        home: { title: 'How is life at home, from 1 to 10?', sub: 'Family, home, the people you live with.', ends: ['Hard', 'Wonderful'] },
        desire: { title: 'Choose your mission style.', sub: 'What do you want most from the year ahead?',
          options: { grow: ['Grow', 'Become a better person and draw closer to God'], learn: ['Learn', 'Understand the faith more deeply'], discover: ['Discover', 'Surprise me: I’m curious where this leads'] } }
      },
      email: { title: 'Your mission plan is ready.', sub: 'Where should we send it? We’ll show it to you here, too.', button: 'Reveal my mission' },
      loading: 'Assembling your mission plan…',
      results: { kicker: 'Your mission', lead: '{name}your mission:', planTitle: 'Your twelve-month mission plan', firstLabel: 'Your first assignment',
        practiceLabel: 'Your first order this week', start: 'Start here' },
      archetypes: {
        peacemaker: ['The Peacemaker', 'Blessed are the peacemakers. Your mission begins in your own heart: peace received first, then peace given.'],
        contemplative: ['The Contemplative in the World', 'You are called to find God in the middle of ordinary life: at your desk, in your kitchen, on your commute.'],
        builder: ['The Builder', 'You are called to build, with your work, your character and your hands. Every task done well can be offered to God.'],
        leader: ['The Leader', 'You are called to lead by serving. Magnanimity and humility will be your two wings.'],
        hearth: ['The Keeper of the Hearth', 'Your mission starts at home. A family on fire with love changes a whole neighborhood.'],
        scholar: ['The Scholar', 'You are called to understand, so that you can explain and defend the truth with charity.'],
        explorer: ['The Explorer', 'You are called to discover saints, stories and ideas that stretch the heart.'],
        apostle: ['The Apostle of Friendship', 'Your faith is ready to be shared, one friendship at a time.'],
        shepherd: ['The Shepherd', 'You are called to lay down your life for your flock, and to be fed yourself.'],
        consecrated: ['The Consecrated Heart', 'You have given everything. Your mission is to love without measure: hidden, and fruitful.'],
        pilgrim: ['The Pilgrim', 'You are searching, and searching is holy. Your mission begins with one honest step.']
      }
    },
    adventure: {
      name: 'The Adventure Quiz',
      kicker: 'The Adventure Quiz',
      title: 'What adventure is God calling you on?',
      lead: 'Every life with God is an adventure: summits, valleys, surprises. Pack light and answer honestly, and we’ll map your road for the next twelve months, with a book at every waypoint.',
      cta: 'Set out',
      meta: ['12 stops', '2 minutes', 'Free'],
      progress: 'Waypoint {n} of {total}',
      steps: {
        desire: { title: 'What kind of traveler are you?', sub: 'Pick the one that sounds most like you.',
          options: { grow: ['The Climber', 'I want to reach higher'], learn: ['The Cartographer', 'I want to understand the terrain'], discover: ['The Explorer', 'I want to see what’s over the next hill'] } },
        feel: { title: 'Check the weather. How do you feel right now about…', sub: 'Honest forecasts make the best maps.', scale: ['Stormy', 'Cloudy', 'Mixed', 'Bright', 'Clear skies'] },
        faith: { title: 'How’s your compass?', sub: 'How would you describe your faith these days?',
          options: { onfire: ['True north', 'On fire: I want to share it'], growing: ['Steadier every day', 'Growing, slowly but surely'], steady: ['Steady', 'Solid, if a little routine'],
            dry: ['Spinning', 'Dry: I pray, but feel little'], doubting: ['Wobbling', 'I have real questions'], distant: ['Lost in the woods', 'I’ve drifted away'], none: ['No compass yet', 'I don’t have faith right now'] } },
        religion: { title: 'Which road have you traveled so far?', sub: 'Your faith tradition. Every traveler is welcome.' },
        gender: { title: 'Traveling as a…' },
        age: { title: 'How long have you been on the road?', sub: 'Your age, roughly.' },
        state: { title: 'Who’s traveling with you?', sub: 'Your state in life.',
          options: { single: ['Single', 'Traveling solo'], engaged: ['Engaged', 'With my future spouse'], married: ['Married', 'With my spouse'], widowed: ['Widowed', 'Carrying someone in my heart'] } },
        marriedDetails: { title: 'Tell us about your traveling party.', fields: { marriedYears: 'How long have you traveled together?', kids: 'How many little travelers?' } },
        priestDetails: { title: 'What kind of shepherd are you?', fields: { priestType: 'Secular or religious?', priestRole: 'Do you shepherd a parish?' } },
        order: { title: 'Which community do you travel with?', sub: 'Your order or congregation. Type it in, or skip.', placeholder: 'e.g. Benedictines, Missionaries of Charity' },
        home: { title: 'How’s base camp?', sub: 'Rate life at home from 1 to 10.', ends: ['Rough', 'Wonderful'] },
        work: { title: 'What’s your trade on the road?', sub: 'What do you do for work?' },
        workFeel: { title: 'How heavy is your pack?', sub: 'How do you feel about your work right now?' },
        workService: { title: 'Is your work part of the adventure?', sub: 'How much does it feel like serving God and others?' }
      },
      email: { title: 'Your map is drawn.', sub: 'Where should we send your twelve-month trail map?', button: 'Show me my adventure' },
      loading: 'Drawing your trail map…',
      results: { kicker: 'Your adventure', lead: '{name}your adventure is', planTitle: 'Your trail map: twelve waypoints', firstLabel: 'Your first waypoint',
        practiceLabel: 'Your first step this week', start: 'You are here' },
      archetypes: {
        peacemaker: ['The Road to Still Waters', '“He leads me beside still waters; he restores my soul.” Your road runs through peace: first found, then shared.'],
        contemplative: ['The Mountain of Prayer', 'Your adventure climbs toward God in prayer, one quiet morning at a time.'],
        builder: ['The Workshop at Nazareth', 'Your adventure happens where you work. Ordinary days, offered well, become a road to holiness.'],
        leader: ['The Summit Road', 'You are called higher, and to bring others with you. Magnanimity for the climb, humility for the rope team.'],
        hearth: ['The Road Home', 'Your greatest adventure starts at your own front door.'],
        scholar: ['The Cartographer’s Journey', 'You want to understand the terrain. This year, you’ll map the faith with the best guides there are.'],
        explorer: ['The Uncharted Map', 'Saints, stories and ideas you have never met are waiting over the next hill.'],
        apostle: ['The Road to Emmaus', 'Your faith burns best when you walk with friends. This road is made for company.'],
        shepherd: ['The Shepherd’s Path', 'You walk ahead of your flock. This year, let the Good Shepherd walk ahead of you.'],
        consecrated: ['The Hidden Garden', 'Your adventure is hidden and fruitful: a garden enclosed, kept for God.'],
        pilgrim: ['The Pilgrim’s Way', 'You are searching, and every pilgrimage begins with one honest step.']
      }
    },
    treasures: {
      name: 'The Treasure Hunt',
      kicker: 'This week’s treasure hunt',
      title: 'What hidden treasures has God laid in store for you this week?',
      lead: '“Where your treasure is, there your heart will be also.” Answer a few gentle questions and we’ll uncover a treasure for this week, and a treasure map for the year ahead.',
      cta: 'Start the hunt',
      meta: ['12 clues', '2 minutes', 'Free'],
      progress: 'Clue {n} of {total}',
      steps: {
        feel: { title: 'How is your heart this week? How do you feel about…', sub: 'There are no wrong answers.', scale: ['Heavy', 'Cloudy', 'Mixed', 'Hopeful', 'Radiant'] },
        faith: { title: 'And your faith, these days?' },
        home: { title: 'How is home this week, from 1 to 10?', ends: ['Hard', 'Wonderful'] },
        age: { title: 'A few things about you. How old are you?' },
        religion: { title: 'What is your faith?', sub: 'Everyone is welcome at this table.' },
        gender: { title: 'Are you…' },
        state: { title: 'What is your state in life?' },
        marriedDetails: { title: 'Tell us about your family.', fields: { marriedYears: 'How long have you been married?', kids: 'How many children?' } },
        priestDetails: { title: 'Tell us about your priesthood.', fields: { priestType: 'Secular or religious?', priestRole: 'Are you in parish ministry?' } },
        order: { title: 'Which order or community?', sub: 'Type it in, or skip.', placeholder: 'e.g. Carmelites, Sisters of Life' },
        work: { title: 'Where do you spend your working hours?' },
        workFeel: { title: 'How do you feel about your work this week?' },
        workService: { title: 'Does your work feel like a way of serving God and others?' },
        desire: { title: 'What kind of treasure are you hoping to find?', sub: 'Choose the one your heart leans toward.',
          options: { grow: ['Strength', 'To grow stronger in faith and virtue'], learn: ['Wisdom', 'To understand more deeply'], discover: ['Wonder', 'Something new and unexpected'] } }
      },
      email: { title: 'Your treasure is waiting.', sub: 'Enter your email and we’ll send you this week’s treasure and your treasure map for the year.', button: 'Uncover my treasure' },
      loading: 'Unearthing your treasure…',
      results: { kicker: 'Your treasure this week', lead: '{name}your treasure:', planTitle: 'Your treasure map for the year', firstLabel: 'This week’s treasure',
        practiceLabel: 'A treasure to try this week', start: 'This week' },
      archetypes: {
        peacemaker: ['The Peace That Passes Understanding', 'This week, God wants to give you peace: not as the world gives, but the kind that stays.'],
        contemplative: ['The Hidden Spring', 'A spring runs deep beneath your ordinary days. This week, go down to it in prayer.'],
        builder: ['The Talents', 'God has placed real gifts in your hands. This week, put them to work for Him.'],
        leader: ['The Lamp on the Lampstand', 'Your light is not meant for a basket. This week, let it shine for the people you lead.'],
        hearth: ['The House Built on Rock', 'The treasure God is laying up for you is at home: the people you love, and a house built on rock.'],
        scholar: ['Treasures Old and New', '“Every scribe trained for the kingdom brings out of his treasure what is new and what is old.”'],
        explorer: ['The Treasure Hidden in a Field', 'Something wonderful is buried just where you’re walking. This week, dig.'],
        apostle: ['The Faithful Friend', '“A faithful friend is a sturdy shelter: whoever finds one has found a treasure.”'],
        shepherd: ['Treasure in Earthen Vessels', '“We have this treasure in earthen vessels.” Your priesthood is His, and so is its strength.'],
        consecrated: ['The Pearl of Great Price', 'You sold everything for one pearl. This week, He wants to show you again what it is worth.'],
        pilgrim: ['The Mustard Seed', 'The smallest seed becomes the greatest tree. This week, plant one.']
      }
    }
  };

  // ---------------------------------------------------------------------------------------------
  // Flow logic (pure, testable)
  // ---------------------------------------------------------------------------------------------

  function optionsFor(q, a) { return typeof q.options === 'function' ? q.options(a) : q.options; }

  function visibleSteps(variant, a) {
    return (FLOW[variant] || FLOW.mission).filter(function (id) {
      var q = QUESTIONS[id];
      return !q.when || q.when(a);
    });
  }

  // Drop answers that the current answers make impossible (e.g. "Other" after choosing Catholic,
  // "Priest" after choosing Female, marriage details after changing to Single).
  function sanitize(a) {
    var out = Object.assign({}, a);
    ['gender', 'state'].forEach(function (id) {
      if (out[id] === undefined) return;
      var ok = optionsFor(QUESTIONS[id], out).some(function (o) { return o[0] === out[id]; });
      if (!ok) delete out[id];
    });
    if (!QUESTIONS.marriedDetails.when(out)) { delete out.marriedYears; delete out.kids; }
    if (!QUESTIONS.priestDetails.when(out)) { delete out.priestType; delete out.priestRole; }
    if (!QUESTIONS.order.when(out)) delete out.order;
    return out;
  }

  // Follow-up steps (marriage details, priesthood details, order) share their parent's number.
  var FOLLOW_UPS = ['marriedDetails', 'priestDetails', 'order'];
  function stepNumber(list, id) {
    var n = 0;
    for (var i = 0; i < list.length; i++) { if (FOLLOW_UPS.indexOf(list[i]) < 0) n++; if (list[i] === id) break; }
    return n;
  }
  function stepTotal(list) { return list.filter(function (id) { return FOLLOW_UPS.indexOf(id) < 0; }).length; }

  function isAnswered(id, a) {
    var q = QUESTIONS[id];
    if (!q) return true;
    switch (q.type) {
      case 'choice': case 'scale': return a[id] !== undefined && a[id] !== null;
      case 'compound': return q.fields.every(function (f) { return a[f.key] !== undefined && a[f.key] !== null; });
      case 'triple': return !!a.feel && q.rows.every(function (r) { return a.feel[r[0]]; });
      case 'text': return true;
      case 'email': return false;
    }
    return true;
  }

  // ---------------------------------------------------------------------------------------------
  // DOM helpers
  // ---------------------------------------------------------------------------------------------

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
  function fmt(s, vars) { return String(s || '').replace(/\{(\w+)\}/g, function (_, k) { return vars[k] !== undefined ? vars[k] : ''; }); }
  function money(n, currency) {
    if (!(n > 0)) return '';
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(n); }
    catch (e) { return '$' + Number(n).toFixed(2); }
  }
  function store(kind) {
    try { return kind === 'local' ? window.localStorage : window.sessionStorage; } catch (e) { return null; }
  }
  function emit(name, detail) {
    try {
      window.dispatchEvent(new CustomEvent('scepter:' + name, { detail: detail }));
      if (window.dataLayer && window.dataLayer.push) window.dataLayer.push(Object.assign({ event: 'scepter_' + name.replace(/:/g, '_') }, detail));
    } catch (e) { /* analytics are best-effort */ }
  }
  var reduceMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Line-art emblems, one per variant; currentColor so each theme tints them.
  var EMBLEMS = {
    mission: '<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="60" cy="60" r="43" fill="none" stroke="currentColor" stroke-width=".75" stroke-dasharray="2 4"/><path d="M60 14 L68 60 L60 106 L52 60 Z" fill="currentColor" opacity=".9"/><path d="M14 60 L60 52 L106 60 L60 68 Z" fill="currentColor" opacity=".45"/><circle cx="60" cy="60" r="5" fill="var(--sp-accent)"/></svg>',
    adventure: '<svg viewBox="0 0 160 110" aria-hidden="true"><circle cx="118" cy="30" r="12" fill="var(--sp-accent)" opacity=".9"/><path d="M4 100 L52 34 L74 62 L98 26 L156 100 Z" fill="currentColor" opacity=".9"/><path d="M52 34 L60 45 L52 50 L46 44 Z M98 26 L108 40 L98 46 L90 40 Z" fill="var(--sp-paper)" opacity=".85"/><path d="M20 100 C 50 84, 70 96, 92 80 S 132 70, 146 58" fill="none" stroke="var(--sp-accent)" stroke-width="2.5" stroke-dasharray="1 7" stroke-linecap="round"/></svg>',
    treasures: '<svg viewBox="0 0 140 120" aria-hidden="true"><path d="M24 60 h92 v40 a7 7 0 0 1 -7 7 h-78 a7 7 0 0 1 -7 -7 z" fill="var(--sp-burgundy)" stroke="var(--sp-cream)" stroke-width="2.5" stroke-linejoin="round"/><path d="M24 60 c0 -30 92 -30 92 0 z" fill="var(--sp-burgundy-hover)" stroke="var(--sp-cream)" stroke-width="2.5" stroke-linejoin="round"/><path d="M44 36 v71 M96 36 v71" stroke="var(--sp-sage-strong)" stroke-width="5"/><rect x="61" y="54" width="18" height="22" rx="3" fill="var(--sp-cream)"/><path d="M70 61 a3 3 0 1 1 0.01 0 M70 64 v6" stroke="var(--sp-burgundy)" stroke-width="2.4" stroke-linecap="round" fill="none"/><path d="M30 22 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z M108 10 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4 z M122 38 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6 z" fill="var(--sp-cream)"/></svg>'
  };

  // A drawn cover when a product has no image: title in the house serif on a house colour.
  var COVER_TONES = ['#1f3a2c', '#6e1a2a', '#2f5a45', '#3b4a3f', '#57222e', '#264c3a'];
  function cover(item, cls) {
    if (item.image) return h('img', { class: 'sp-cover ' + (cls || ''), src: item.image, alt: '', loading: 'lazy', decoding: 'async' });
    var tone = COVER_TONES[Math.abs(hashCode(item.title || '')) % COVER_TONES.length];
    return h('div', { class: 'sp-cover sp-cover--drawn ' + (cls || ''), style: '--sp-tone:' + tone, 'aria-hidden': 'true' }, [
      h('span', { class: 'sp-cover__rule' }),
      h('span', { class: 'sp-cover__title', text: String(item.title || '').split(':')[0] }),
      item.author ? h('span', { class: 'sp-cover__author', text: item.author }) : null
    ]);
  }
  function hashCode(s) { var x = 0; for (var i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return x; }

  // ---------------------------------------------------------------------------------------------
  // The quiz
  // ---------------------------------------------------------------------------------------------

  function readConfig(el) {
    var node = el.querySelector('script[data-sp-config]');
    var cfg = {};
    try { cfg = node ? JSON.parse(node.textContent) : {}; } catch (e) { cfg = {}; }
    if (el.dataset.variant && !cfg.variant) cfg.variant = el.dataset.variant;
    return cfg;
  }

  function mount(el, cfgIn) {
    if (!el || el.__spMounted) return null;
    el.__spMounted = true;
    var E = window.ScepterEngine, L = window.ScepterLead;
    var cfg = cfgIn || readConfig(el);
    var variant = COPY[cfg.variant] ? cfg.variant : 'mission';
    var copy = deepMerge(COPY[variant], cfg.copy || {});
    var rootUrl = cfg.rootUrl || '/';
    var key = 'sp-quiz:' + variant;
    var ss = store('session');
    var state = { answers: {}, step: null, started: false };
    try { var saved = ss && JSON.parse(ss.getItem(key) || 'null'); if (saved && saved.answers) state = saved; } catch (e) { /* ignore */ }

    // Start fetching the catalogue now; the visitor needs a minute or two to answer.
    var catalogPromise = cfg.fetchCatalog === false || !E ? Promise.resolve([])
      : E.loadCatalog({ rootUrl: rootUrl, version: cfg.catalogVersion || 1 });

    el.classList.add('sp', 'sp-quiz', 'sp-v-' + variant);
    el.innerHTML = '';
    var live = h('div', { class: 'sp-visually-hidden', 'aria-live': 'polite' });
    var shell = h('div', { class: 'sp-shell' });
    el.appendChild(shell); el.appendChild(live);

    function save() { try { if (ss) ss.setItem(key, JSON.stringify(state)); } catch (e) { /* ignore */ } }
    function steps() { return visibleSteps(variant, state.answers); }

    function go(id, dir) {
      state.step = id; state.started = true; save();
      render(dir || 'forward');
    }
    function next() {
      var list = steps(), i = list.indexOf(state.step);
      go(list[Math.min(i + 1, list.length - 1)], 'forward');
    }
    function back() {
      var list = steps(), i = list.indexOf(state.step);
      if (i <= 0) { state.started = false; state.step = null; save(); render('back'); return; }
      go(list[i - 1], 'back');
    }
    var advancing = null;
    function answer(patch, advance) {
      var prevVisible = steps().join();
      var from = state.step;
      state.answers = sanitize(Object.assign({}, state.answers, patch));
      save();
      emit('quiz:answer', { variant: variant, step: from });
      if (advance) {
        if (advancing === from) return; // a double tap: the first one already moves us on
        advancing = from;
        setTimeout(function () { advancing = null; if (state.step === from) next(); }, reduceMotion ? 0 : 220);
      } else if (prevVisible !== steps().join()) render('none');
    }

    function render(dir) {
      shell.innerHTML = '';
      if (state.result) { renderResults(); return; }
      if (!state.started || !state.step) { renderIntro(); return; }
      var list = steps();
      if (list.indexOf(state.step) < 0) state.step = list.filter(function (id) { return !isAnswered(id, state.answers); })[0] || list[0];
      var n = stepNumber(list, state.step), total = stepTotal(list);
      var pct = Math.round((list.indexOf(state.step) / (list.length - 1 || 1)) * 100);
      shell.appendChild(h('div', { class: 'sp-topbar' }, [
        h('button', { type: 'button', class: 'sp-back', 'aria-label': 'Back', onclick: back, html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
        h('div', { class: 'sp-progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct), 'aria-label': 'Progress' },
          [h('span', { style: 'width:' + pct + '%' })]),
        h('div', { class: 'sp-count', text: fmt(copy.progress, { n: n, total: total }) })
      ]));
      var step = renderStep(state.step);
      step.classList.add('sp-enter-' + (dir || 'forward'));
      shell.appendChild(step);
      live.textContent = fmt(copy.progress, { n: n, total: total });
      var title = step.querySelector('.sp-title');
      if (title && dir !== 'none') { try { title.focus({ preventScroll: true }); } catch (e) { title.focus(); } }
      emit('quiz:step', { variant: variant, step: state.step, n: n, total: total });
    }

    function renderIntro() {
      shell.appendChild(h('section', { class: 'sp-intro sp-enter-forward' }, [
        h('div', { class: 'sp-emblem', html: EMBLEMS[variant] }),
        h('p', { class: 'sp-kicker', text: copy.kicker }),
        h('h2', { class: 'sp-display', text: copy.title }),
        h('p', { class: 'sp-lead', text: copy.lead }),
        h('button', { type: 'button', class: 'sp-btn sp-btn--primary sp-btn--lg', onclick: function () {
          emit('quiz:start', { variant: variant });
          go(steps().filter(function (id) { return !isAnswered(id, state.answers); })[0] || steps()[0]);
        } }, [copy.cta, h('span', { class: 'sp-btn__arrow', 'aria-hidden': 'true', text: '→' })]),
        h('ul', { class: 'sp-meta' }, copy.meta.map(function (m) { return h('li', { text: m }); }))
      ]));
    }

    function stepCopy(id) { return (copy.steps && copy.steps[id]) || {}; }

    function optionButton(value, label, desc, selected, onPick, extra) {
      return h('button', Object.assign({ type: 'button', class: 'sp-opt' + (selected ? ' is-selected' : ''), 'aria-pressed': selected ? 'true' : 'false',
        'data-value': value, onclick: function () { onPick(value); } }, extra || {}), [
        h('span', { class: 'sp-opt__label', text: label }),
        desc ? h('span', { class: 'sp-opt__desc', text: desc }) : null
      ]);
    }

    function header(id, q) {
      var c = stepCopy(id);
      return [
        h('h2', { class: 'sp-title', tabindex: '-1', text: c.title || id }),
        c.sub ? h('p', { class: 'sp-sub', text: c.sub }) : null
      ];
    }

    function renderStep(id) {
      var q = QUESTIONS[id], c = stepCopy(id), a = state.answers;
      var sec = h('section', { class: 'sp-step sp-step--' + q.type, 'data-step': id });
      header(id, q).forEach(function (n) { if (n) sec.appendChild(n); });

      if (q.type === 'choice') {
        var opts = optionsFor(q, a);
        var list = h('div', { class: 'sp-options sp-options--' + (q.layout || 'list') + ' sp-options--n' + opts.length, role: 'group', 'aria-label': c.title || id });
        opts.forEach(function (o, i) {
          var over = c.options && c.options[o[0]];
          var btn = optionButton(o[0], over ? over[0] : o[1], over ? over[1] : o[2], a[id] === o[0], function (v) {
            markSelected(list, btn);
            var p = {}; p[id] = v; answer(p, true);
          }, { 'data-key': String(i + 1) });
          list.appendChild(btn);
        });
        sec.appendChild(list);
      }

      if (q.type === 'scale') {
        var pts = q.points, labels = q.labels || [];
        var row = h('div', { class: 'sp-scale sp-scale--' + pts, role: 'group', 'aria-label': c.title || id });
        for (var i = 1; i <= pts; i++) {
          (function (v) {
            row.appendChild(h('button', { type: 'button', class: 'sp-dot' + (Number(a[id]) === v ? ' is-selected' : ''), 'aria-pressed': Number(a[id]) === v ? 'true' : 'false',
              'aria-label': String(v) + (labels[v - 1] ? ': ' + labels[v - 1] : ''), onclick: function (ev) { markSelected(row, ev.currentTarget); var p = {}; p[id] = v; answer(p, true); } }, [
              h('span', { class: 'sp-dot__n', text: String(v) }),
              labels[v - 1] ? h('span', { class: 'sp-dot__label', text: labels[v - 1] }) : null
            ]));
          })(i);
        }
        sec.appendChild(row);
        var ends = c.ends || (q.ends ? ['Low', 'High'] : null);
        if (ends) sec.appendChild(h('div', { class: 'sp-scale__ends' }, [h('span', { text: ends[0] }), h('span', { text: ends[1] })]));
      }

      if (q.type === 'triple') {
        var feel = Object.assign({}, a.feel || {});
        var scale = c.scale || ['1', '2', '3', '4', '5'];
        var cont = h('button', { type: 'button', class: 'sp-btn sp-btn--primary', disabled: !isAnswered('feel', a), onclick: next }, 'Continue');
        var grid = h('div', { class: 'sp-triple' });
        q.rows.forEach(function (r) {
          var rowEl = h('div', { class: 'sp-triple__row', role: 'group', 'aria-label': r[1] }, [h('span', { class: 'sp-triple__label', text: r[1] })]);
          var dots = h('div', { class: 'sp-triple__dots' });
          for (var v = 1; v <= q.points; v++) {
            (function (v) {
              dots.appendChild(h('button', { type: 'button', class: 'sp-chip' + (feel[r[0]] === v ? ' is-selected' : ''), 'aria-pressed': feel[r[0]] === v ? 'true' : 'false',
                'aria-label': r[1] + ': ' + scale[v - 1], onclick: function (ev) {
                  feel[r[0]] = v;
                  state.answers = sanitize(Object.assign({}, state.answers, { feel: Object.assign({}, feel) })); save();
                  Array.prototype.forEach.call(ev.currentTarget.parentNode.children, function (b) { b.classList.remove('is-selected'); b.setAttribute('aria-pressed', 'false'); });
                  ev.currentTarget.classList.add('is-selected'); ev.currentTarget.setAttribute('aria-pressed', 'true');
                  cont.disabled = !isAnswered('feel', state.answers);
                  if (!cont.disabled && q.rows.every(function (rr) { return feel[rr[0]]; }) && r[0] === q.rows[q.rows.length - 1][0]) cont.focus();
                } }, scale[v - 1]));
            })(v);
          }
          rowEl.appendChild(dots);
          grid.appendChild(rowEl);
        });
        sec.appendChild(grid);
        sec.appendChild(h('div', { class: 'sp-actions' }, [cont]));
      }

      if (q.type === 'compound') {
        var vals = {};
        q.fields.forEach(function (f) { vals[f.key] = a[f.key]; });
        var go2 = h('button', { type: 'button', class: 'sp-btn sp-btn--primary', disabled: !isAnswered(id, a), onclick: next }, 'Continue');
        q.fields.forEach(function (f) {
          var fs = h('fieldset', { class: 'sp-fieldset' }, [h('legend', { class: 'sp-legend', text: (c.fields && c.fields[f.key]) || f.key })]);
          var group = h('div', { class: 'sp-options sp-options--' + (f.layout || 'row') });
          f.options.forEach(function (o) {
            group.appendChild(optionButton(o[0], o[1], o[2], String(vals[f.key]) === o[0], function (v) {
              vals[f.key] = v;
              var p = {}; p[f.key] = f.key === 'kids' ? Number(v) : v;
              state.answers = sanitize(Object.assign({}, state.answers, p)); save();
              Array.prototype.forEach.call(group.children, function (b) { var on = b.getAttribute('data-value') === v; b.classList.toggle('is-selected', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
              go2.disabled = !isAnswered(id, state.answers);
            }));
          });
          fs.appendChild(group);
          sec.appendChild(fs);
        });
        sec.appendChild(h('div', { class: 'sp-actions' }, [go2]));
      }

      if (q.type === 'text') {
        var listId = 'sp-dl-' + Math.random().toString(36).slice(2, 8);
        var input = h('input', { class: 'sp-input', type: 'text', list: listId, value: a[q.key] || '', placeholder: c.placeholder || '', 'aria-label': c.title || id, autocomplete: 'off' });
        var dl = h('datalist', { id: listId }, (q.suggestions || []).map(function (s) { return h('option', { value: s }); }));
        var commit = function () { var p = {}; p[q.key] = input.value.trim().slice(0, 80) || undefined; answer(p, false); next(); };
        input.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); commit(); } });
        sec.appendChild(h('div', { class: 'sp-field' }, [input, dl]));
        sec.appendChild(h('div', { class: 'sp-actions' }, [
          h('button', { type: 'button', class: 'sp-btn sp-btn--primary', onclick: commit }, 'Continue'),
          h('button', { type: 'button', class: 'sp-btn sp-btn--quiet', onclick: function () { input.value = ''; commit(); } }, 'Skip')
        ]));
      }

      if (q.type === 'email') renderEmail(sec);
      return sec;
    }

    function renderEmail(sec) {
      var ec = copy.email, a = state.answers;
      sec.innerHTML = '';
      sec.classList.add('sp-step--email');
      sec.appendChild(h('div', { class: 'sp-emblem sp-emblem--sm', html: EMBLEMS[variant] }));
      sec.appendChild(h('h2', { class: 'sp-title', tabindex: '-1', text: ec.title }));
      sec.appendChild(h('p', { class: 'sp-sub', text: ec.sub }));
      var err = h('p', { class: 'sp-error', role: 'alert' });
      var name = h('input', { class: 'sp-input', type: 'text', name: 'first_name', autocomplete: 'given-name', placeholder: 'First name', 'aria-label': 'First name', value: a.firstName || '' });
      var email = h('input', { class: 'sp-input', type: 'email', name: 'email', autocomplete: 'email', inputmode: 'email', placeholder: 'Email address', 'aria-label': 'Email address', required: true, value: a.email || '' });
      var lcfg = cfg.lead || {};
      var consentText = lcfg.consentText || 'Also send me occasional emails from Scepter: new books, reading ideas, offers. Unsubscribe anytime.';
      var consent = h('input', { type: 'checkbox', class: 'sp-check__box', checked: lcfg.consentChecked === true });
      var minor = a.age === 'u18' ? h('input', { type: 'checkbox', class: 'sp-check__box' }) : null;
      var submit = h('button', { type: 'submit', class: 'sp-btn sp-btn--primary sp-btn--lg sp-btn--block' }, [ec.button, h('span', { class: 'sp-btn__arrow', 'aria-hidden': 'true', text: '→' })]);
      var form = h('form', { class: 'sp-form', novalidate: true, onsubmit: function (ev) {
        ev.preventDefault();
        err.textContent = '';
        if (!L.validEmail(email.value)) { err.textContent = 'Please enter a valid email address.'; email.focus(); return; }
        if (lcfg.consentRequired && !consent.checked) { err.textContent = 'Please tick the box so we can email your plan.'; return; }
        if (minor && !minor.checked) { err.textContent = 'Please confirm you have a parent’s permission.'; return; }
        state.answers = Object.assign({}, state.answers, { firstName: name.value.trim().slice(0, 60), email: email.value.trim(), marketing: consent.checked });
        save();
        finish();
      } }, [
        h('div', { class: 'sp-form__row' }, [name, email]),
        h('label', { class: 'sp-check' }, [consent, h('span', { text: consentText })]),
        minor ? h('label', { class: 'sp-check' }, [minor, h('span', { text: 'I am 13 or older and have a parent’s permission.' })]) : null,
        err, submit,
        cfg.privacyUrl ? h('p', { class: 'sp-fine' }, ['We use your answers only to choose your books. ', h('a', { href: cfg.privacyUrl, text: 'Privacy policy' })]) : null
      ]);
      sec.appendChild(form);
    }

    function finish() {
      shell.innerHTML = '';
      shell.appendChild(h('section', { class: 'sp-loading', 'aria-busy': 'true' }, [
        h('div', { class: 'sp-emblem sp-emblem--spin', html: EMBLEMS[variant] }),
        h('p', { class: 'sp-lead', text: copy.loading })
      ]));
      var a = state.answers;
      var minWait = new Promise(function (r) { setTimeout(r, reduceMotion ? 200 : 1400); });
      var cat = Promise.race([catalogPromise, new Promise(function (r) { setTimeout(function () { r([]); }, 7000); })]);
      Promise.all([cat, minWait]).then(function (res) {
        var fetched = res[0] || [];
        var products = (cfg.products || []).concat(fetched);
        var catalog = E.prepareCatalog({ products: products, lists: cfg.lists, topicMap: cfg.topicMap, library: cfg.library,
          settings: Object.assign({ rootUrl: rootUrl }, cfg.settings || {}) });
        var profile = E.profileFromAnswers(a);
        var plan = E.buildPlan(profile, catalog, {
          seed: (a.email || '').toLowerCase() + '|' + variant, variant: variant, rules: cfg.rules, featured: cfg.featured,
          bestsellerShare: cfg.settings && cfg.settings.bestsellerShare, maxPerAuthor: cfg.settings && cfg.settings.maxPerAuthor
        });
        runtime.catalog = catalog; runtime.profile = profile;
        state.result = { plan: plan, sent: null, swapped: {} };
        save();
        sendLead(plan, profile);
        emit('quiz:complete', { variant: variant, archetype: plan.archetype, months: plan.months.length });
        render();
      }).catch(function (e) {
        shell.innerHTML = '';
        shell.appendChild(h('section', { class: 'sp-step' }, [h('h2', { class: 'sp-title', text: 'Something went wrong.' }),
          h('p', { class: 'sp-sub', text: 'Please refresh the page and try again. Your answers are saved.' })]));
        if (window.console) console.error('[scepter-quiz]', e);
      });
    }

    function planUrl(plan) {
      var base = cfg.planPageUrl || (rootUrl + 'pages/reading-plan');
      return base + (base.indexOf('?') >= 0 ? '&' : '?') + 'plan=' + encodeURIComponent(E.encodePlan(plan));
    }
    function absolute(u) { try { return new URL(u, window.location.origin).href; } catch (e) { return u; } }

    function sendLead(plan, profile) {
      var a = state.answers, lc = cfg.lead || {};
      var arche = copy.archetypes[plan.archetype] || copy.archetypes.pilgrim;
      var url = absolute(planUrl(plan));
      var months = plan.months.map(function (m) {
        return { month: m.label, title: m.item.title, author: m.item.author || '', url: absolute(m.item.url), image: m.item.image || '', why: m.because, hidden_gem: m.tier === 'backlist' };
      });
      // A vocation (priest, religious, clergy, an order) reveals religion and sex, so it is sent only
      // when the admin allows sensitive answers, like religion and gender themselves.
      var vocation = ['priest', 'religious', 'clergy'].indexOf(a.state) >= 0;
      var hideVocation = vocation && !lc.sensitive;
      var props = {
        quiz_variant: variant, formation_archetype: arche[0], formation_plan_url: url,
        formation_first_book: months[0] ? months[0].title : '', formation_first_book_url: months[0] ? months[0].url : '',
        quiz_age: a.age, quiz_state: hideVocation ? undefined : a.state, quiz_work: a.work, quiz_desire: a.desire, quiz_faith: a.faith,
        quiz_married_years: a.marriedYears, quiz_kids: a.kids, quiz_order: hideVocation ? undefined : a.order,
        quiz_priest: a.state === 'priest' && !hideVocation ? [a.priestType, a.priestRole].filter(Boolean).join(', ') : undefined,
        religion: a.religion, gender: a.gender
      };
      var lead = {
        email: a.email, firstName: a.firstName, source: 'Scepter quiz: ' + copy.name,
        tags: [lc.tag || 'scepter-quiz', 'quiz-' + variant, !hideVocation && 'persona-' + plan.archetype, a.desire && 'desire-' + a.desire,
          a.state && !hideVocation && 'state-' + a.state, a.age && 'age-' + a.age],
        properties: props,
        eventName: lc.eventName || 'Completed Formation Quiz',
        eventProperties: Object.assign({}, props, { archetype_text: arche[1], practice: plan.practice.text, plan: months })
      };
      lead.marketing = a.marketing !== false;
      L.submit({ klaviyo: lc.klaviyo, webhook: lc.webhook, shopify: lc.shopify, rootUrl: rootUrl, sensitive: !!lc.sensitive }, lead)
        .then(function (r) {
          if (!state.result) return;
          state.result.sent = r.ok; save();
          var note = shell.querySelector('.sp-sent');
          if (note) note.replaceWith(sentNote());
        });
    }

    function sentNote() {
      var a = state.answers, lc = cfg.lead || {};
      var emails = !!((lc.klaviyo && lc.klaviyo.publicKey) || lc.webhook || lc.sendsPlanEmail);
      var ok = state.result && state.result.sent;
      var pending = state.result && state.result.sent === null;
      var text = ok && emails ? 'Your plan is on its way to ' + a.email + '.'
        : ok ? 'You’re on the list, ' + (a.firstName || 'friend') + '. Save the link below to keep your plan.'
        : state.result && state.result.sent === false ? 'We couldn’t send the email just now, so copy the link below to keep your plan.'
        : pending && runtime.restored ? 'Here is your plan. Copy the link below to keep it.'
        : 'Sending your plan to ' + a.email + '…';
      return h('p', { class: 'sp-sent', role: 'status', text: text });
    }

    // ---- results -------------------------------------------------------------------------------

    function renderResults() {
      var plan = state.result.plan, a = state.answers, rc = copy.results;
      var arche = copy.archetypes[plan.archetype] || copy.archetypes.pilgrim;
      var first = plan.months[0];
      var nameLead = a.firstName ? a.firstName + ', ' : '';
      var res = h('section', { class: 'sp-results sp-enter-forward' });
      res.appendChild(h('header', { class: 'sp-results__head' }, [
        h('div', { class: 'sp-emblem sp-emblem--sm', html: EMBLEMS[variant] }),
        h('p', { class: 'sp-kicker', text: capitalize(fmt(rc.lead, { name: nameLead })) }),
        h('h2', { class: 'sp-display', tabindex: '-1', text: arche[0] }),
        h('p', { class: 'sp-lead', text: arche[1] }),
        sentNote()
      ]));

      if (first) {
        res.appendChild(h('article', { class: 'sp-first' }, [
          h('div', { class: 'sp-first__cover' }, [cover(first.item, 'sp-cover--lg')]),
          h('div', { class: 'sp-first__head' }, [
            h('p', { class: 'sp-eyebrow', text: rc.firstLabel + ' · ' + first.label }),
            h('h3', { class: 'sp-first__title' }, [h('a', { href: first.item.url, text: first.item.title })]),
            first.item.author ? h('p', { class: 'sp-author', text: first.item.author }) : null
          ]),
          h('div', { class: 'sp-first__body' }, [
            h('p', { class: 'sp-because', text: first.because }),
            first.blurb ? h('p', { class: 'sp-blurb', text: first.blurb }) : null,
            h('div', { class: 'sp-first__actions' }, [
              cartButton([first], 'Add to cart' + (first.item.price ? ' · ' + money(first.item.price, cfg.currency) : ''), 'sp-btn--primary'),
              h('a', { class: 'sp-btn sp-btn--ghost', href: first.item.url }, 'See the book'),
              h('button', { type: 'button', class: 'sp-link', onclick: function () { swap(0); } }, 'Read it already? Swap')
            ])
          ])
        ]));
      }

      res.appendChild(h('aside', { class: 'sp-practice' }, [
        h('p', { class: 'sp-eyebrow', text: rc.practiceLabel }),
        h('p', { class: 'sp-practice__text', text: plan.practice.text })
      ]));

      res.appendChild(h('div', { class: 'sp-plan__head' }, [
        h('h3', { class: 'sp-h3', text: rc.planTitle }),
        h('p', { class: 'sp-plan__meta', text: plan.stats.bestsellers + ' reader favorites · ' + plan.stats.backlist + ' hidden gems · one book a month' })
      ]));
      res.appendChild(renderPlanList(plan, true));

      res.appendChild(h('div', { class: 'sp-results__actions' }, [
        cartButton(plan.months.slice(0, 3), 'Start with the first three books', 'sp-btn--primary'),
        h('button', { type: 'button', class: 'sp-btn sp-btn--ghost', onclick: function (ev) { copyLink(ev.currentTarget, absolute(planUrl(state.result.plan))); } }, 'Copy the link to my plan'),
        h('button', { type: 'button', class: 'sp-btn sp-btn--quiet', onclick: function () {
          try { if (ss) ss.removeItem(key); } catch (e) { /* ignore */ }
          state = { answers: {}, step: null, started: false }; render();
        } }, 'Retake the quiz')
      ]));
      shell.appendChild(res);
      var d = res.querySelector('.sp-display');
      if (d) { try { d.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
      if (el.getBoundingClientRect && el.getBoundingClientRect().top < 0 && !reduceMotion) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function renderPlanList(plan, interactive) {
      var rc = copy.results;
      var ol = h('ol', { class: 'sp-plan' });
      plan.months.forEach(function (m, i) {
        ol.appendChild(planItem(m, i, interactive, rc));
      });
      return ol;
    }

    function planItem(m, i, interactive, rc) {
      var li = h('li', { class: 'sp-plan__item' + (m.tier === 'backlist' ? ' is-gem' : '') + (i === 0 ? ' is-first' : ''), 'data-index': String(i) }, [
        h('div', { class: 'sp-plan__when' }, [
          h('span', { class: 'sp-plan__n', text: String(i + 1) }),
          h('span', { class: 'sp-plan__month', text: i === 0 ? rc.start : m.monthName }),
          h('span', { class: 'sp-plan__year', text: i === 0 ? m.monthName : String(m.year) })
        ]),
        h('a', { class: 'sp-plan__cover', href: m.item.url, tabindex: '-1', 'aria-hidden': 'true' }, [cover(m.item, 'sp-cover--sm')]),
        h('div', { class: 'sp-plan__body' }, [
          h('p', { class: 'sp-tags' }, m.tags.map(function (t) { return h('span', { class: 'sp-tag' + (t === 'Hidden gem' ? ' sp-tag--gem' : ''), text: t }); })),
          h('h4', { class: 'sp-plan__title' }, [h('a', { href: m.item.url, text: m.item.title })]),
          m.item.author ? h('p', { class: 'sp-author', text: m.item.author }) : null,
          h('p', { class: 'sp-because', text: m.because }),
          interactive ? h('div', { class: 'sp-plan__actions' }, [
            cartButton([m], 'Add to cart', 'sp-btn--small'),
            h('button', { type: 'button', class: 'sp-link', onclick: function () { swap(i); } }, 'Read it already? Swap')
          ]) : h('div', { class: 'sp-plan__actions' }, [cartButton([m], 'Add to cart', 'sp-btn--small')])
        ])
      ]);
      return li;
    }

    function ensureCatalog() {
      if (runtime.catalog) return Promise.resolve();
      return catalogPromise.then(function (fetched) { // after a reload, rebuild what finish() built
        runtime.catalog = E.prepareCatalog({ products: (cfg.products || []).concat(fetched || []), lists: cfg.lists, topicMap: cfg.topicMap,
          library: cfg.library, settings: Object.assign({ rootUrl: rootUrl }, cfg.settings || {}) });
        runtime.profile = E.profileFromAnswers(state.answers);
      });
    }
    var swapping = false, lastSwap = {};
    function swap(i) {
      // One swap per intent: a double-click (or a click on the freshly redrawn link) is ignored.
      if (swapping || Date.now() - (lastSwap[i] || 0) < 700) return;
      swapping = true;
      lastSwap[i] = Date.now();
      ensureCatalog().then(function () { doSwap(i); }).then(function () { swapping = false; }, function () { swapping = false; });
    }
    function doSwap(i) {
      var r = state.result, E2 = window.ScepterEngine;
      r.swapped[i] = (r.swapped[i] || []).concat([r.plan.months[i].item.handle]);
      var gone = Object.keys(r.swapped).reduce(function (all, k) { return all.concat(r.swapped[k]); }, []);
      var nextPlan = E2.swapMonth(r.plan, i, runtime.profile, runtime.catalog, { exclude: gone, bestsellerShare: cfg.settings && cfg.settings.bestsellerShare });
      if (nextPlan === r.plan) return;
      r.plan = nextPlan; save();
      emit('quiz:swap', { variant: variant, index: i });
      var ol = shell.querySelector('.sp-plan');
      var old = ol && ol.children[i];
      if (old) {
        var fresh = planItem(r.plan.months[i], i, true, copy.results);
        fresh.classList.add('is-fresh');
        old.replaceWith(fresh);
        var btn = fresh.querySelector('.sp-link');
        if (btn) btn.focus();
      }
      if (i === 0) render();
    }

    function cartButton(months, label, cls) {
      var ids = months.map(function (m) { return m && m.item.variantId; }).filter(Boolean);
      if (!ids.length || cfg.cart === false) return null;
      return h('button', { type: 'button', class: 'sp-btn ' + (cls || ''), onclick: function (ev) {
        var btn = ev.currentTarget;
        btn.disabled = true;
        var was = btn.innerHTML;
        btn.textContent = 'Adding…';
        fetch(rootUrl + 'cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ items: ids.map(function (id) { return { id: id, quantity: 1 }; }) }), credentials: 'same-origin' })
          .then(function (r) { if (!r.ok) throw new Error('cart'); return r.json(); })
          .then(function () {
            btn.textContent = 'Added ✓';
            btn.classList.add('is-done');
            emit('cart:add', { variant: variant, count: ids.length });
            try { document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true })); } catch (e) { /* theme-specific */ }
            var link = h('a', { class: 'sp-link sp-link--cart', href: rootUrl + 'cart', text: 'View cart' });
            if (!btn.nextElementSibling || !btn.nextElementSibling.classList.contains('sp-link--cart')) btn.after(link);
          })
          .catch(function () {
            btn.disabled = false; btn.innerHTML = was;
            var note = btn.parentNode.querySelector('.sp-cart-error') || h('p', { class: 'sp-cart-error', role: 'status' });
            note.textContent = months.length > 1 ? 'Couldn’t add them all: one may be sold out. Try the books one by one.' : 'Couldn’t add it: it may be sold out.';
            btn.after(note);
          });
      } }, label);
    }

    function copyLink(btn, url) {
      var done = function () { btn.textContent = 'Link copied ✓'; setTimeout(function () { btn.textContent = 'Copy the link to my plan'; }, 2500); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { window.prompt('Copy this link:', url); });
      else window.prompt('Copy this link:', url);
    }

    // Keyboard: number keys pick the nth option on single-choice steps.
    el.addEventListener('keydown', function (ev) {
      if (ev.target && /input|textarea|select/i.test(ev.target.tagName)) return;
      if (!/^[1-9]$/.test(ev.key)) return;
      var opts = shell.querySelectorAll('.sp-step--choice .sp-opt, .sp-step--scale .sp-dot');
      var b = opts[Number(ev.key) - 1];
      if (b) { ev.preventDefault(); b.click(); }
    });

    var runtime = { catalog: null, profile: null, restored: !!(state.result && state.result.plan) };
    render('none');
    return { el: el, state: function () { return state; }, reset: function () { state = { answers: {}, step: null, started: false }; save(); render(); } };
  }

  // Show the tap before the quiz moves on: mark the chosen button in its group at once.
  function markSelected(group, chosen) {
    Array.prototype.forEach.call(group.children, function (b) {
      var on = b === chosen;
      b.classList.toggle('is-selected', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function deepMerge(a, b) {
    var out = Array.isArray(a) ? a.slice() : Object.assign({}, a);
    Object.keys(b || {}).forEach(function (k) {
      var v = b[k];
      if (v === '' || v === null || v === undefined) return;
      out[k] = v && typeof v === 'object' && !Array.isArray(v) && a && typeof a[k] === 'object' ? deepMerge(a[k], v) : v;
    });
    return out;
  }

  // ---------------------------------------------------------------------------------------------
  // The plan page: /pages/reading-plan?plan=…  (the link we email and the visitor can keep)
  // ---------------------------------------------------------------------------------------------

  function mountPlanPage(el, cfgIn) {
    if (!el || el.__spMounted) return;
    el.__spMounted = true;
    var E = window.ScepterEngine;
    var cfg = cfgIn || readConfig(el);
    var rootUrl = cfg.rootUrl || '/';
    var code = new URLSearchParams(window.location.search).get('plan');
    var d = E.decodePlan(code);
    var variant = d && COPY[d.variant] ? d.variant : 'mission';
    var copy = deepMerge(COPY[variant], cfg.copy || {});
    el.classList.add('sp', 'sp-quiz', 'sp-planpage', 'sp-v-' + variant);
    var shell = h('div', { class: 'sp-shell' });
    el.innerHTML = ''; el.appendChild(shell);
    if (!d || !d.handles.length) {
      shell.appendChild(h('section', { class: 'sp-intro' }, [
        h('div', { class: 'sp-emblem', html: EMBLEMS[variant] }),
        h('h2', { class: 'sp-display', text: 'Find your formation plan' }),
        h('p', { class: 'sp-lead', text: 'Take one of our two-minute quizzes and we’ll build you a twelve-month reading plan.' }),
        cfg.quizUrl ? h('a', { class: 'sp-btn sp-btn--primary sp-btn--lg', href: cfg.quizUrl, text: 'Take the quiz' }) : null
      ]));
      return;
    }
    var arche = copy.archetypes[d.archetype] || copy.archetypes.pilgrim;
    shell.appendChild(h('header', { class: 'sp-results__head' }, [
      h('div', { class: 'sp-emblem sp-emblem--sm', html: EMBLEMS[variant] }),
      h('p', { class: 'sp-kicker', text: copy.results.kicker }),
      h('h2', { class: 'sp-display', text: arche[0] }),
      h('p', { class: 'sp-lead', text: arche[1] })
    ]));
    var list = h('ol', { class: 'sp-plan' });
    shell.appendChild(h('div', { class: 'sp-plan__head' }, [h('h3', { class: 'sp-h3', text: copy.results.planTitle })]));
    shell.appendChild(list);
    Promise.all(d.handles.map(function (hd) {
      return fetch(rootUrl + 'products/' + hd + '.js', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    })).then(function (ps) {
      ps.forEach(function (p, i) {
        if (!p) return;
        var m = d.start.month + i, y = d.start.year + Math.floor(m / 12); m = m % 12;
        var img = p.featured_image ? (String(p.featured_image).indexOf('//') === 0 ? 'https:' + p.featured_image : p.featured_image) : '';
        if (img && img.indexOf('width=') < 0) img += (img.indexOf('?') >= 0 ? '&' : '?') + 'width=360';
        var v = (p.variants || []).filter(function (x) { return x.available; })[0] || (p.variants || [])[0] || {};
        var month = E.MONTH_NAMES[m];
        var tags = Array.isArray(p.tags) ? p.tags : String(p.tags || '').split(',');
        var author = p.vendor && !/scepter/i.test(p.vendor) ? p.vendor : (tags.filter(E._internal.looksLikePerson)[0] || '');
        var item = { title: p.title, url: p.url || (rootUrl + 'products/' + p.handle), image: img, author: author, variantId: v.id, price: (v.price || p.price || 0) / 100 };
        list.appendChild(h('li', { class: 'sp-plan__item' + (i === 0 ? ' is-first' : '') }, [
          h('div', { class: 'sp-plan__when' }, [h('span', { class: 'sp-plan__n', text: String(i + 1) }), h('span', { class: 'sp-plan__month', text: month }), h('span', { class: 'sp-plan__year', text: String(y) })]),
          h('a', { class: 'sp-plan__cover', href: item.url, tabindex: '-1', 'aria-hidden': 'true' }, [cover(item, 'sp-cover--sm')]),
          h('div', { class: 'sp-plan__body' }, [
            h('h4', { class: 'sp-plan__title' }, [h('a', { href: item.url, text: item.title })]),
            item.author ? h('p', { class: 'sp-author', text: item.author }) : null,
            h('div', { class: 'sp-plan__actions' }, [h('a', { class: 'sp-btn sp-btn--small', href: item.url, text: 'See the book' })])
          ])
        ]));
      });
      if (cfg.quizUrl) shell.appendChild(h('div', { class: 'sp-results__actions' }, [h('a', { class: 'sp-btn sp-btn--ghost', href: cfg.quizUrl, text: 'Retake the quiz' })]));
    });
  }

  function autoMount() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-sp-quiz]'), function (el) { mount(el); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-sp-plan-page]'), function (el) { mountPlanPage(el); });
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoMount);
    else autoMount();
    document.addEventListener('shopify:section:load', autoMount); // theme editor re-renders
  }

  return {
    QUESTIONS: QUESTIONS, FLOW: FLOW, COPY: COPY, NO_OTHER_GENDER: NO_OTHER_GENDER,
    genderOptions: genderOptions, stateOptions: stateOptions, visibleSteps: visibleSteps, sanitize: sanitize,
    stepNumber: stepNumber, stepTotal: stepTotal,
    isAnswered: isAnswered, optionsFor: optionsFor, mount: mount, mountPlanPage: mountPlanPage
  };
});
