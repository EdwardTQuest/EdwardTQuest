/*!
 * Scepter Formation Engine
 * Turns quiz answers into a twelve-month reading plan (one book a month) drawn mostly from
 * the bestsellers and partly from the backlist. Pure logic: no DOM. Runs in the browser as
 * window.ScepterEngine and in Node (tests) via require().
 *
 * How it thinks, in one breath: answers -> a profile of needs (peace, prayer, work, marriage…);
 * every product -> a profile of themes (from the curated library, Scepter's own topic
 * collections, its tags, and its words); each calendar month -> a liturgical season and a target
 * depth; then a greedy planner fills twelve slots, month 1 first, trading relevance against
 * popularity, season, depth, variety and a bestseller/backlist quota. See ALGORITHM.md.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else if (!root.ScepterEngine) root.ScepterEngine = factory(); // safe to include twice on one page
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------------------------------------
  // Vocabulary. Theme keys are internal; labels are what the admin sees in the metaobject.
  // ---------------------------------------------------------------------------------------------

  // A leading ^ marks a word counted only in titles and tags: it is too common in blurbs and
  // author bios ("this classic work", "a priest of the prelature") to mean anything there.
  var THEMES = {
    peace:      { label: 'Peace & trust',          words: ['peace', 'peaceful', 'anxiety', 'anxious', 'worry', 'worries', 'trust in god', 'abandonment', 'serenity', 'calm', 'interior freedom', '^freedom', 'mercy', 'consolation'] },
    prayer:     { label: 'Prayer & interior life', words: ['prayer', 'prayers', 'pray', 'praying', 'meditation', 'meditations', 'contemplation', 'contemplative', 'mental prayer', 'holy spirit', 'adoration', 'eucharist', 'silence', 'interior life', 'conversation with god', 'retreat', 'spiritual life', 'intimacy with god', '^soul'] },
    hope:       { label: 'Hope in suffering',      words: ['suffering', 'hope', 'grief', 'death', 'illness', 'trials', 'sorrow', 'darkness', 'heaven', '^passion', 'loss'] },
    virtue:     { label: 'Virtue & character',     words: ['virtue', 'virtues', 'virtuous', 'character', 'temperament', 'habits', 'excellence', 'moral', 'magnanimity', 'humility', 'fortitude', 'prudence', 'temperance', 'integrity', 'self-mastery'] },
    work:       { label: 'Work & ordinary life',   words: ['^work', 'ordinary work', 'ordinary life', 'your work', 'professional work', 'profession', 'professional', 'career', '^job', 'workplace', 'workshop', 'sanctify', 'sanctifying', 'sanctification', 'daily life', 'everyday life', 'labor'] },
    leadership: { label: 'Leadership',             words: ['leader', 'leaders', 'leadership', 'magnanimity', 'greatness', 'management', 'business', 'executive', '^mission'] },
    marriage:   { label: 'Marriage',               words: ['marriage', 'married', 'spouse', 'spouses', 'husband', 'wife', 'wedding', 'engaged', '^couple', 'couples', 'conjugal'] },
    family:     { label: 'Family & parenting',     words: ['family', 'families', 'parent', 'parents', 'parenting', '^children', 'your children', 'raising children', '^child', '^father', '^fathers', 'fatherhood', '^mother', '^mothers', 'motherhood', '^home', 'household', 'upbringing', 'teen', 'teens', 'teenagers', 'adolescence', '^kids', 'sons', 'daughters'] },
    doctrine:   { label: 'Doctrine & apologetics', words: ['faith explained', 'catechism', 'doctrine', 'teachings', 'apologetics', 'theology', 'theological', 'creed', 'sacraments', 'ecclesiology', 'explained', 'truths', 'philosophy', 'defend the faith', '^teaching'] },
    scripture:  { label: 'Scripture',              words: ['bible', 'gospel', 'gospels', 'scripture', 'scriptures', 'testament', 'navarre', 'psalm', 'psalms', 'letters of st. paul', 'acts of the apostles', 'pentateuch', 'commentary'] },
    saints:     { label: 'Saints & biography',     words: ['saint', 'saints', 'blessed', '^founder', 'biography', '^life of', 'memoir', 'collected letters', 'martyr', 'martyrs', 'newman'] },
    mary:       { label: 'Our Lady',               words: ['mary', 'marian', 'our lady', 'rosary', 'mother of god', 'blessed virgin', 'magnificat', 'guadalupe', 'fatima', 'lourdes'] },
    priesthood: { label: 'Priesthood',             words: ['^priest', '^priests', 'priesthood', 'priestly', 'seminary', 'seminarian', 'seminarians', 'clergy', 'ordination', 'homily', 'homilies', 'confessor'] },
    religious:  { label: 'Religious life',         words: ['religious life', 'consecrated', 'vows', 'nuns', 'monks', 'monastic', 'convent', 'novitiate'] },
    friendship: { label: 'Friendship & apostolate', words: ['friend', 'friends', 'friendship', 'apostolate', 'evangelization', 'evangelize', 'outreach', 'companions'] },
    story:      { label: 'Fiction & story',        words: ['novel', 'fiction', '^story', '^stories', '^tale', '^tales', 'historical novel'] },
    classic:    { label: 'Spiritual classic',      words: ['classic', 'classics', 'timeless', 'all-time', 'millions', 'centuries', 'doctor of the church', 'imitation of christ'] },
    seeker:     { label: 'For newcomers & seekers', words: ['introduction', 'beginners', 'newcomer', 'newcomers', 'rcia', 'ocia', 'non-catholics', 'seekers', 'basics', 'refresher', '^questions'] },
    culture:    { label: 'Faith & culture',        words: ['culture', 'society', 'modern world', 'crisis', 'philosophies', 'politics', 'secular', 'ideology', 'culture war'] }
  };
  var THEME_KEYS = Object.keys(THEMES);

  // Who a book is for. "Restrictive" audiences demote a book for everyone else.
  var AUDIENCES = {
    everyone: 'Everyone', young: 'Young adults', single: 'Singles', engaged: 'Engaged & newlyweds',
    married: 'Married', parents: 'Parents', priests: 'Priests', seminarians: 'Seminarians',
    religious: 'Religious', professionals: 'Professionals', leaders: 'Leaders', students: 'Students',
    retired: 'Retired', seekers: 'Newcomers & seekers', christians: 'Other Christians',
    men: 'Men', women: 'Women'
  };
  // Restrictive audiences come in dimensions; a book for fathers must match both parenthood and
  // sex, so a mother of three is not sent "Successful Fathers".
  var DIMENSIONS = { clergy: ['priests', 'seminarians'], consecrated: ['religious'], marital: ['married', 'engaged'],
    parental: ['parents'], age: ['young'], sex: ['men', 'women'] };
  var RESTRICTIVE = [].concat.apply([], Object.keys(DIMENSIONS).map(function (d) { return DIMENSIONS[d]; }));

  // Liturgical and devotional seasons a month can carry, and what they lean toward.
  var SEASONS = {
    advent:         { label: 'Advent',                    tag: 'For Advent',          themes: { prayer: 0.6, mary: 0.5, hope: 0.4 } },
    christmas:      { label: 'Christmas',                 tag: 'For Christmas',       themes: { family: 0.5, mary: 0.4, peace: 0.3 } },
    lent:           { label: 'Lent',                      tag: 'For Lent',            themes: { prayer: 0.5, hope: 0.4, virtue: 0.4, classic: 0.3 } },
    easter:         { label: 'the Easter season',         tag: 'For Easter',          themes: { hope: 0.6, friendship: 0.3, peace: 0.3 } },
    pentecost:      { label: 'Pentecost',                 tag: 'For Pentecost',       themes: { prayer: 0.5, friendship: 0.4 } },
    mary:           { label: 'Our Lady’s month',          tag: 'For Our Lady’s month', themes: { mary: 1.0, prayer: 0.3 } },
    'sacred-heart': { label: 'the month of the Sacred Heart', tag: 'For the Sacred Heart', themes: { prayer: 0.5, priesthood: 0.3, peace: 0.3 } },
    'last-things':  { label: 'November, month of the saints and souls', tag: 'For November', themes: { hope: 0.7, saints: 0.5 } },
    summer:         { label: 'summer',                    tag: 'Summer read',         themes: { story: 0.6, saints: 0.5, friendship: 0.3 } },
    'new-year':     { label: 'the new year',              tag: 'New-year read',       themes: { virtue: 0.6, work: 0.4, leadership: 0.4 } },
    'back-to-work': { label: 'back-to-work season',       tag: 'Back-to-work read',   themes: { work: 0.7, leadership: 0.3, virtue: 0.3 } }
  };
  var LITURGICAL = ['advent', 'christmas', 'lent', 'easter', 'pentecost'];
  // Without an explicit season, a book earns a month's tag only through that month's key theme.
  var SEASON_TAG_IF = { mary: 'mary', summer: 'story', 'new-year': 'virtue', 'back-to-work': 'work' };
  var SEASON_WORDS = {
    advent: ['advent'], christmas: ['christmas', 'christmastide', 'nativity'],
    lent: ['lent', 'lenten', 'passion', 'way of the cross', 'stations of the cross', 'holy week'],
    easter: ['easter', 'eastertide', 'resurrection'], pentecost: ['pentecost', 'holy spirit'],
    mary: ['rosary', 'our lady', 'marian']
  };

  var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'];

  // Rule conditions an admin can pick in the theme editor (value -> test on the profile).
  var CONDITIONS = {
    everyone: function () { return true; },
    catholic: function (p) { return p.a.religion === 'catholic'; },
    not_catholic: function (p) { return p.a.religion !== 'catholic'; },
    struggling: function (p) { return p.flags.struggling; },
    faith_distant: function (p) { return p.flags.distant; },
    faith_dry: function (p) { return p.a.faith === 'dry'; },
    faith_on_fire: function (p) { return p.a.faith === 'onfire'; },
    single: function (p) { return p.a.state === 'single'; },
    engaged: function (p) { return p.a.state === 'engaged'; },
    married: function (p) { return p.a.state === 'married'; },
    newlywed: function (p) { return p.a.state === 'engaged' || (p.a.state === 'married' && (p.a.marriedYears === '<1' || p.a.marriedYears === '1-5')); },
    long_married: function (p) { return p.a.state === 'married' && (p.a.marriedYears === '16-30' || p.a.marriedYears === '30+'); },
    parents: function (p) { return p.kids > 0; },
    big_family: function (p) { return p.kids >= 4; },
    widowed: function (p) { return p.a.state === 'widowed'; },
    priest: function (p) { return p.a.state === 'priest'; },
    priest_parish: function (p) { return p.a.state === 'priest' && p.a.priestRole === 'parochial'; },
    priest_religious: function (p) { return p.a.state === 'priest' && p.a.priestType === 'religious'; },
    religious: function (p) { return p.a.state === 'religious'; },
    leader: function (p) { return p.flags.leader; },
    professional: function (p) { return ['business', 'professional', 'healthcare', 'education', 'public', 'creative'].indexOf(p.a.work) >= 0; },
    student: function (p) { return p.a.work === 'student'; },
    homemaker: function (p) { return p.a.work === 'home'; },
    retired: function (p) { return p.a.work === 'retired'; },
    work_not_service: function (p) { return p.flags.workNotService; },
    work_burnout: function (p) { return p.a.workFeel === 'burnedout' || p.a.workFeel === 'stretched'; },
    work_restless: function (p) { return p.a.workFeel === 'restless' || p.a.workFeel === 'seeking'; },
    home_hard: function (p) { return p.flags.homeHard; },
    home_good: function (p) { return num(p.a.home, 6) >= 8; },
    wants_grow: function (p) { return p.a.desire === 'grow'; },
    wants_learn: function (p) { return p.a.desire === 'learn'; },
    wants_discover: function (p) { return p.a.desire === 'discover'; },
    young: function (p) { return p.a.age === 'u18' || p.a.age === '18-24'; },
    senior: function (p) { return p.a.age === '65+'; },
    man: function (p) { return p.a.gender === 'm'; },
    woman: function (p) { return p.a.gender === 'f'; }
  };

  // ---------------------------------------------------------------------------------------------
  // Small utilities
  // ---------------------------------------------------------------------------------------------

  function num(v, d) { var n = Number(v); return isFinite(n) && v !== '' && v !== null && v !== undefined ? n : d; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function stripAccents(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function norm(s) { return stripAccents(s).toLowerCase().replace(/[’']/g, '').replace(/\s+/g, ' ').trim(); }
  function stripHtml(s) { return String(s || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&[a-z#0-9]+;/gi, ' '); }
  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function uniq(arr) { var seen = {}; return arr.filter(function (x) { if (seen[x]) return false; seen[x] = 1; return true; }); }
  function toArray(v) {
    if (v === null || v === undefined || v === '') return [];
    if (Array.isArray(v)) return v;
    return String(v).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  // FNV-1a and mulberry32: a seeded, repeatable random stream. Same person, same answers,
  // same plan; two similar people still get slightly different backlist discoveries.
  function hashString(s) {
    var h = 0x811c9dc5;
    s = String(s);
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }
  function rng(seed) {
    var a = hashString(seed);
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Word-boundary phrase counting over normalised text. Cached regexes: this runs over the whole
  // catalogue once per visit.
  var reCache = {};
  function countPhrase(text, phrase) {
    var re = reCache[phrase];
    if (!re) {
      re = reCache[phrase] = new RegExp('(^|[^a-z0-9])' + escapeRe(norm(phrase)) + '(?=$|[^a-z0-9])', 'g');
    }
    var m = text.match(re);
    return m ? m.length : 0;
  }

  function cosine(a, b) {
    var dot = 0, na = 0, nb = 0, k;
    for (k in a) { na += a[k] * a[k]; if (b[k]) dot += a[k] * b[k]; }
    for (k in b) nb += b[k] * b[k];
    return na && nb ? dot / Math.sqrt(na * nb) : 0;
  }

  // ---------------------------------------------------------------------------------------------
  // The calendar: Easter by the Gregorian computus, then Lent, Pentecost, Advent and Christmas.
  // ---------------------------------------------------------------------------------------------

  function easterSunday(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return Date.UTC(y, month - 1, day);
  }
  var DAY = 86400000;
  function firstSundayOfAdvent(y) {
    // The Sunday between 27 November and 3 December.
    for (var d = 27; d <= 33; d++) {
      var t = Date.UTC(y, 10, d);
      if (new Date(t).getUTCDay() === 0) return t;
    }
    return Date.UTC(y, 10, 27);
  }
  function overlapDays(a0, a1, b0, b1) { // inclusive day ranges in ms
    var s = Math.max(a0, b0), e = Math.min(a1, b1);
    return e < s ? 0 : Math.round((e - s) / DAY) + 1;
  }

  // Seasons a calendar month carries, most important first.
  function seasonsFor(year, month) {
    var m0 = Date.UTC(year, month, 1), m1 = Date.UTC(year, month + 1, 0);
    var easter = easterSunday(year);
    var spans = {
      lent: [easter - 46 * DAY, easter - DAY],
      easter: [easter, easter + 49 * DAY],
      advent: [firstSundayOfAdvent(year), Date.UTC(year, 11, 24)],
      christmas: month === 0 ? [Date.UTC(year, 0, 1), Date.UTC(year, 0, 12)] : [Date.UTC(year, 11, 25), Date.UTC(year, 11, 31)]
    };
    var found = [];
    Object.keys(spans).forEach(function (k) {
      var days = overlapDays(m0, m1, spans[k][0], spans[k][1]);
      if (days >= 7) found.push({ key: k, days: days });
    });
    var pentecost = easter + 49 * DAY;
    if (pentecost >= m0 && pentecost <= m1) found.push({ key: 'pentecost', days: 6 });
    var fixed = { 0: 'new-year', 4: 'mary', 5: 'sacred-heart', 6: 'summer', 7: 'summer', 8: 'back-to-work', 9: 'mary', 10: 'last-things' }[month];
    if (fixed) found.push({ key: fixed, days: 5 });
    found.sort(function (a, b) { return b.days - a.days; });
    return uniq(found.map(function (f) { return f.key; }));
  }

  // ---------------------------------------------------------------------------------------------
  // Answers -> profile
  // ---------------------------------------------------------------------------------------------

  function add(needs, k, v) { needs[k] = (needs[k] || 0) + v; }

  function profileFromAnswers(a) {
    a = a || {};
    var needs = {}, audience = ['everyone'], flags = {};
    var feel = a.feel || {};
    var god = num(feel.god, 3), rel = num(feel.religion, 3), world = num(feel.world, 3);
    var avgFeel = (god + rel + world) / 3;
    var kids = parseInt(a.kids, 10) || 0;
    var home = num(a.home, 6), service = num(a.workService, 3);

    // "If pretty poor, that's a Jacques Philippe": a low average, or rock bottom on any one.
    flags.struggling = avgFeel <= 2.34 || Math.min(god, rel, world) <= 1;
    flags.distant = ['doubting', 'distant', 'none'].indexOf(a.faith) >= 0;
    flags.leader = a.work === 'business' || a.work === 'public' || a.workRole === 'lead';
    flags.workNotService = service <= 2;
    flags.homeHard = home <= 4;

    // How they feel about God, religion and the world.
    if (god <= 2) { add(needs, 'peace', 1.0); add(needs, 'prayer', 0.4); add(needs, 'hope', 0.5); }
    if (rel <= 2) { add(needs, 'seeker', 0.4); add(needs, 'doctrine', 0.3); add(needs, 'saints', 0.3); add(needs, 'culture', 0.2); }
    if (world <= 2) { add(needs, 'peace', 0.6); add(needs, 'hope', 0.6); add(needs, 'culture', 0.4); }
    if (avgFeel >= 4) { add(needs, 'friendship', 0.4); add(needs, 'prayer', 0.3); add(needs, 'leadership', 0.2); }

    // How they feel about their faith.
    var faithNeeds = {
      onfire:   { prayer: 0.5, friendship: 0.6, classic: 0.4, saints: 0.3 },
      growing:  { prayer: 0.6, virtue: 0.3, classic: 0.3 },
      steady:   { prayer: 0.4, doctrine: 0.3, virtue: 0.3 },
      dry:      { prayer: 0.8, peace: 0.5, hope: 0.3 },
      doubting: { doctrine: 0.7, seeker: 0.6, peace: 0.3 },
      distant:  { seeker: 0.8, peace: 0.6, hope: 0.3 },
      none:     { seeker: 1.0, virtue: 0.5, culture: 0.3 }
    }[a.faith] || {};
    Object.keys(faithNeeds).forEach(function (k) { add(needs, k, faithNeeds[k]); });

    // State in life.
    switch (a.state) {
      case 'single': add(needs, 'friendship', 0.4); add(needs, 'virtue', 0.3); add(needs, 'work', 0.2); audience.push('single'); break;
      case 'engaged': add(needs, 'marriage', 1.0); audience.push('engaged', 'married'); break;
      case 'married':
        add(needs, 'marriage', a.marriedYears === '<1' || a.marriedYears === '1-5' ? 0.9 : 0.6);
        add(needs, 'family', 0.3); audience.push('married');
        if (a.marriedYears === '<1' || a.marriedYears === '1-5') audience.push('engaged');
        break;
      case 'widowed': add(needs, 'hope', 0.8); add(needs, 'peace', 0.4); add(needs, 'prayer', 0.3); break;
      case 'religious': add(needs, 'religious', 1.4); add(needs, 'prayer', 0.6); add(needs, 'classic', 0.3); audience.push('religious'); break;
      case 'priest':
        add(needs, 'priesthood', 1.5); add(needs, 'prayer', 0.5); add(needs, 'scripture', 0.3); add(needs, 'doctrine', 0.2);
        audience.push('priests');
        if (a.priestType === 'religious') { audience.push('religious'); add(needs, 'religious', 0.3); }
        if (a.priestRole === 'parochial') { add(needs, 'leadership', 0.25); add(needs, 'family', 0.1); }
        else { add(needs, 'doctrine', 0.2); add(needs, 'scripture', 0.2); }
        break;
      case 'clergy': add(needs, 'prayer', 0.4); add(needs, 'scripture', 0.4); add(needs, 'leadership', 0.3); break;
    }
    if (kids > 0) { add(needs, 'family', 0.6 + 0.1 * Math.min(kids, 4)); audience.push('parents'); }

    // Home life, 1–10.
    if (home <= 4) {
      add(needs, 'peace', 0.4); add(needs, 'hope', 0.3);
      if (a.state === 'married' || kids > 0) { add(needs, 'family', 0.5); }
      if (a.state === 'married') add(needs, 'marriage', 0.5);
    } else if (home >= 8) { add(needs, 'family', 0.2); add(needs, 'friendship', 0.2); }

    // Work.
    var workNeeds = {
      student:      { doctrine: 0.3, virtue: 0.4, friendship: 0.3 },
      business:     { work: 0.5, leadership: 0.6, virtue: 0.3 },
      professional: { work: 0.5, leadership: 0.3, virtue: 0.3 },
      education:    { work: 0.4, virtue: 0.3, family: 0.2 },
      healthcare:   { work: 0.4, hope: 0.3, peace: 0.2 },
      public:       { virtue: 0.4, leadership: 0.5 },
      trades:       { work: 0.6, virtue: 0.2 },
      creative:     { story: 0.4, culture: 0.4, work: 0.3 },
      home:         { family: 0.6, work: 0.4, peace: 0.2 },
      ministry:     { prayer: 0.4, friendship: 0.4 },
      retired:      { prayer: 0.3, saints: 0.3, hope: 0.2 },
      seeking:      { hope: 0.4, peace: 0.4, work: 0.3 }
    }[a.work] || {};
    Object.keys(workNeeds).forEach(function (k) { add(needs, k, workNeeds[k]); });
    if (['business', 'professional', 'healthcare', 'education', 'public', 'creative', 'trades'].indexOf(a.work) >= 0) audience.push('professionals');
    if (flags.leader) audience.push('leaders');
    if (a.work === 'student') audience.push('students');
    if (a.work === 'retired') audience.push('retired');

    var feelWork = {
      energized: { leadership: 0.3 }, content: {},
      stretched: { peace: 0.5, work: 0.3 }, burnedout: { peace: 0.8, hope: 0.4, work: 0.4 },
      restless: { work: 0.5, virtue: 0.3, leadership: 0.2 }, seeking: { hope: 0.3, work: 0.4 }
    }[a.workFeel] || {};
    Object.keys(feelWork).forEach(function (k) { add(needs, k, feelWork[k]); });

    // Work as service of God and others, 1–5. Low is the heart of Scepter's message.
    if (service <= 2) { add(needs, 'work', 0.9); add(needs, 'virtue', 0.2); }
    else if (service === 3) add(needs, 'work', 0.5);
    else { add(needs, 'work', 0.2); add(needs, 'leadership', 0.3); add(needs, 'friendship', 0.3); }

    // Grow, learn, or discover.
    if (a.desire === 'grow') { add(needs, 'prayer', 0.6); add(needs, 'virtue', 0.35); add(needs, 'classic', 0.3); }
    if (a.desire === 'learn') { add(needs, 'doctrine', 0.8); add(needs, 'scripture', 0.6); add(needs, 'culture', 0.3); }
    if (a.desire === 'discover') { add(needs, 'saints', 0.7); add(needs, 'story', 0.7); add(needs, 'culture', 0.4); add(needs, 'classic', 0.2); }

    // Age.
    if (a.age === 'u18' || a.age === '18-24') { add(needs, 'friendship', 0.2); add(needs, 'story', 0.2); audience.push('young'); }
    if (a.age === '65+') { add(needs, 'hope', 0.2); add(needs, 'prayer', 0.2); add(needs, 'saints', 0.2); }

    // Religion: newcomers get bridges before insider books.
    var faithGroup = a.religion === 'catholic' ? 'catholic'
      : (a.religion === 'orthodox' || a.religion === 'protestant') ? 'christian'
      : a.religion === 'none' ? 'none' : a.religion ? 'other' : 'catholic';
    if (faithGroup === 'christian') { add(needs, 'seeker', 0.2); add(needs, 'scripture', 0.3); add(needs, 'doctrine', 0.2); audience.push('christians', 'seekers'); }
    if (faithGroup === 'other') { add(needs, 'seeker', 0.6); add(needs, 'virtue', 0.4); add(needs, 'peace', 0.2); audience.push('seekers'); }
    if (faithGroup === 'none') { add(needs, 'seeker', 0.8); add(needs, 'virtue', 0.5); audience.push('seekers'); }
    if (a.gender === 'm') audience.push('men');
    if (a.gender === 'f') audience.push('women');

    // Normalise so the strongest need is 1.
    var max = 0;
    Object.keys(needs).forEach(function (k) { if (needs[k] > max) max = needs[k]; });
    if (!max) { needs = { prayer: 1, virtue: 0.6, peace: 0.5 }; max = 1; }
    Object.keys(needs).forEach(function (k) { needs[k] = Math.round((needs[k] / max) * 1000) / 1000; });

    // How deep to start and finish.
    var d0 = 1.5;
    if (a.desire === 'learn') d0 += 0.3;
    if (a.desire === 'grow') d0 += 0.1;
    if (a.faith === 'onfire') d0 += 0.3;
    if (flags.distant) d0 -= 0.3;
    if (a.state === 'priest' || a.state === 'religious') d0 += 0.5;
    if (a.age === 'u18' || a.age === '18-24') d0 -= 0.2;
    d0 = clamp(d0, 1, 2.4);

    var profile = {
      a: a, needs: needs, audience: uniq(audience), faithGroup: faithGroup, flags: flags, kids: kids,
      depth: { start: d0, end: clamp(d0 + 1.0, 2, 3) },
      top: topNeeds(needs, 5)
    };
    profile.archetype = archetypeFor(profile);
    return profile;
  }

  function topNeeds(needs, n) {
    return Object.keys(needs).sort(function (x, y) { return needs[y] - needs[x]; }).slice(0, n);
  }

  // The name of the road someone is on: their strongest need, with the tie going to what they
  // said they wanted (grow, learn, discover).
  function archetypeFor(p) {
    var map = {
      peace: 'peacemaker', hope: 'peacemaker', prayer: 'contemplative', classic: 'contemplative',
      work: 'builder', leadership: 'leader', virtue: 'leader', marriage: 'hearth', family: 'hearth',
      doctrine: 'scholar', scripture: 'scholar', culture: 'scholar', saints: 'explorer', story: 'explorer',
      friendship: 'apostle', priesthood: 'shepherd', religious: 'consecrated', seeker: 'pilgrim', mary: 'contemplative'
    };
    if (p.a.state === 'priest') return 'shepherd';
    if (p.a.state === 'religious') return 'consecrated';
    var top = p.top[0], second = p.top[1];
    if (p.a.desire === 'discover' && p.needs[top] - (p.needs[second] || 0) < 0.15 &&
      (p.needs.saints || 0) + (p.needs.story || 0) > 0.8) return 'explorer';
    if (top === 'virtue' && !p.flags.leader) return 'builder';
    return map[top] || 'pilgrim';
  }

  // ---------------------------------------------------------------------------------------------
  // Catalogue -> items
  // ---------------------------------------------------------------------------------------------

  var DEFAULTS = {
    publisherNames: ['scepter', 'scepter publishers', 'scepter publishers inc', 'scepter publishers, inc.'],
    excludeFree: true,
    requireAvailable: true,
    excludeBundles: true,
    excludeSpanish: true,
    excludeHandles: ['order'],
    excludeTags: ['no-quiz', 'quiz-exclude'],
    excludeTypes: /gift|card|apparel|merch|medal|jewel|accessor|shipping|donation|subscription/i,
    maxPerAuthor: 2,
    bestsellerShare: 0.7,
    months: 12,
    rootUrl: '/',
    imageWidth: 360
  };

  var SPANISH = ['la', 'el', 'los', 'las', 'del', 'de', 'y', 'una', 'un', 'para', 'con', 'por', 'en', 'hoy', 'oracion', 'biblia', 'fe', 'camino', 'iglesia', 'amor', 'vida', 'santo', 'dios'];
  var ENGLISH = ['the', 'of', 'and', 'for', 'to', 'in', 'a', 'an', 'with', 'on', 'my', 'your', 'god', 'life', 'way', 'love', 'faith'];
  function looksSpanish(title, tags) {
    if (tags.some(function (t) { return /^(spanish|espanol|español|en espanol|en español)$/i.test(t); })) return true;
    var main = norm(String(title).replace(/\([^)]*\)/g, ' ')).split(/[^a-z]+/).filter(Boolean);
    var es = 0, en = 0;
    main.forEach(function (w) { if (SPANISH.indexOf(w) >= 0) es++; if (ENGLISH.indexOf(w) >= 0) en++; });
    return es >= 1 && en === 0 && main.length >= 2;
  }

  var TITLE_PREFIX = /^(large print\s*[-–:]\s*|copy of\s+|pre-?order\s*[:\-–]?\s*)/i;
  var EDITION = /\((?:[^)]*\b(?:mini|large print|hardcover|paperback|pocket|edition|ebook|e-book|kindle|audiobook|leather|deluxe)\b[^)]*)\)/gi;

  function mainTitle(title) {
    var t = String(title || '').replace(TITLE_PREFIX, '').replace(EDITION, ' ');
    var vol = t.match(/\b(?:volume|vol\.?)\s*(\d+|[ivx]+)\b/i);
    var main = norm(t.split(':')[0].replace(/[–—]/g, '-'));
    main = main.replace(/\s*-\s*(mini edition|large print|second edition|2nd edition)$/, '').trim();
    return { main: main, vol: vol ? vol[1].toLowerCase() : '' };
  }

  // A combined volume ("The Way, Furrow, The Forge") conflicts with each of its parts.
  function workKeysFor(title) {
    var mt = mainTitle(title);
    var keys = [mt.main + (mt.vol ? ' #' + mt.vol : '')];
    if (!mt.vol && /,/.test(mt.main)) {
      mt.main.split(/\s*,\s*|\s+and\s+/).forEach(function (part) { if (part.length > 3) keys.push(part.trim()); });
    }
    return uniq(keys);
  }

  var HONORIFIC = /^(fr\.?|father|st\.?|saint|rev\.?|reverend|msgr\.?|monsignor|cardinal|pope|dr\.?|sr\.?|sister|br\.?|brother|bl\.?|blessed|bishop|abbot|mother|dom|don)\s+/i;
  function authorKey(name) {
    if (!name) return '';
    var n = norm(name).replace(/[^a-z\s-]/g, ' ').trim();
    while (HONORIFIC.test(n)) n = n.replace(HONORIFIC, '');
    var parts = n.split(/[\s-]+/).filter(function (w) {
      return w.length > 1 && ['jr', 'sr', 'ii', 'iii', 'cardinal', 'pope', 'saint', 'father', 'bishop'].indexOf(w) < 0;
    });
    return parts.length ? parts[parts.length - 1] : '';
  }
  // Capitalised merchandising tags that are not people ("Best Seller", "Gift Ideas", "Opus Dei").
  var MERCH_WORDS = ['best', 'seller', 'sellers', 'bestseller', 'new', 'release', 'releases', 'gift', 'gifts', 'ideas',
    'sale', 'featured', 'hidden', 'collection', 'books', 'book', 'catholic', 'christian', 'spiritual', 'reading',
    'edition', 'set', 'pack', 'bundle', 'ebook', 'ebooks', 'paperback', 'hardcover', 'audio', 'dvd', 'kids',
    'youth', 'men', 'women', 'opus', 'dei', 'holy', 'spirit', 'church', 'vatican', 'staff', 'pick', 'picks',
    'top', 'popular', 'free', 'preorder', 'pre-order', 'coming', 'soon', 'large', 'print', 'ordinary', 'time', 'scepter'];
  function looksLikePerson(tag) {
    var t = String(tag).trim();
    if (!/^[A-Z]/.test(t) || t.length > 40) return false;
    if (/^(fr|st|rev|msgr|cardinal|pope|dr|sr|br|bl|bishop|saint|father)\.?\s/i.test(t)) return true;
    var words = t.split(/\s+/);
    if (words.length < 2 || words.length > 5) return false;
    if (!words.every(function (w) { return /^[A-ZÁÉÍÓÚÑ][\wáéíóúñ.'’-]*$/.test(w) || /^(de|del|la|van|von|da|y)$/.test(w); })) return false;
    var lower = norm(t);
    if (lower.split(' ').some(function (w) { return MERCH_WORDS.indexOf(w) >= 0; })) return false;
    return !THEME_KEYS.some(function (k) { return THEMES[k].words.some(function (w) { return (' ' + lower + ' ').indexOf(' ' + w.replace('^', '') + ' ') >= 0; }); }) &&
      !/(testament|bible|edition|paperback|hardcover|lent|advent|easter|christmas|collection|series)/i.test(t);
  }

  function priceOf(p) {
    if (p.price_cents !== undefined && p.price_cents !== null) return Number(p.price_cents) / 100;
    if (p.price !== undefined && p.price !== null && p.price !== '') return Number(p.price);
    var v = (p.variants || [])[0];
    return v ? Number(v.price) : 0;
  }

  function imageOf(p, width) {
    var src = p.image || (p.featured_image && (p.featured_image.src || p.featured_image)) || (p.images && p.images[0] && (p.images[0].src || p.images[0]));
    if (!src || typeof src !== 'string') return '';
    if (/cdn\.shopify\.com|\/cdn\/shop\//.test(src) && !/[?&]width=/.test(src)) src += (src.indexOf('?') >= 0 ? '&' : '?') + 'width=' + width;
    return src;
  }

  // Keyword inference: title counts three times, tags twice, description once; saturating so a
  // long blurb that mentions "prayer" nine times is not nine times more about prayer.
  function inferThemes(title, tags, body) {
    var tt = norm(title), tg = norm(tags.join(' · ')), bd = norm(body).slice(0, 2500);
    var out = {};
    THEME_KEYS.forEach(function (k) {
      var hits = 0;
      THEMES[k].words.forEach(function (w) {
        var titleOnly = w.charAt(0) === '^';
        if (titleOnly) w = w.slice(1);
        hits += 3 * countPhrase(tt, w) + 2 * countPhrase(tg, w) + (titleOnly ? 0 : Math.min(2, countPhrase(bd, w)));
      });
      if (hits) out[k] = Math.round((1 - Math.exp(-0.35 * hits)) * 1000) / 1000;
    });
    return out;
  }
  function inferSeasons(title, tags) {
    var t = norm(title) + ' · ' + norm(tags.join(' · '));
    return Object.keys(SEASON_WORDS).filter(function (k) {
      return SEASON_WORDS[k].some(function (w) { return countPhrase(t, w) > 0; });
    });
  }
  // Books written for a stretch of the calendar: "Weeks 13-23" (of Ordinary Time), "Feasts,
  // January-June". Returns the months (0-11) the book belongs to, or null.
  var MONTH_WORDS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  function otWeekMonth(w) { // Ordinary Time: weeks 1-8 before Lent, then from about week 9 after Pentecost
    return w <= 3 ? 0 : w <= 7 ? 1 : w <= 13 ? 5 : w <= 17 ? 6 : w <= 21 ? 7 : w <= 26 ? 8 : w <= 30 ? 9 : 10;
  }
  function inferMonths(title) {
    var t = norm(title), out = [];
    var wk = t.match(/\bweeks?\s*(\d{1,2})\s*(?:-|to|through)\s*(\d{1,2})\b/);
    if (wk) {
      for (var w = Number(wk[1]); w <= Math.min(34, Number(wk[2])); w++) out.push(otWeekMonth(w));
    } else {
      var mm = t.match(new RegExp('\\b(' + MONTH_WORDS.join('|') + ')\\s*(?:-|to|through)\\s*(' + MONTH_WORDS.join('|') + ')\\b'));
      if (mm) {
        var a = MONTH_WORDS.indexOf(mm[1]), b = MONTH_WORDS.indexOf(mm[2]);
        for (var m = a; ; m = (m + 1) % 12) { out.push(m); if (m === b || out.length > 12) break; }
      }
    }
    return out.length ? uniq(out) : null;
  }

  function inferDepth(title, body, themes, type) {
    var t = norm(title + ' ' + (type || '')), b = norm(body).slice(0, 1500);
    if (/booklet|pamphlet|mini edition|little book|pocket/.test(t)) return 1;
    if (themes.story) return 1.5;
    if (/treatise|theology|commentary|ecclesiology|collected letters|philosoph|volume \d/.test(t)) return 3;
    if (/introduction|beginners|basics|simple|short|brief|small treatise/.test(t + ' ' + b.slice(0, 400))) return 1.5;
    if (/meditations?|daily/.test(t)) return 2;
    return 2;
  }

  // Map admin-facing labels (or keys) from the metaobject to internal keys.
  function mapLabels(values, dict) {
    var out = [];
    toArray(values).forEach(function (v) {
      var n = norm(v);
      Object.keys(dict).forEach(function (k) {
        var label = typeof dict[k] === 'string' ? dict[k] : dict[k].label;
        if (n === k || n === norm(label) || n === norm(k.replace(/[-_]/g, ' '))) out.push(k);
      });
    });
    return uniq(out);
  }
  var DEPTHS = { gentle: 1, steady: 2, deep: 3, '1': 1, '2': 2, '3': 3 };
  var START_WHEN = {
    struggling: 'Struggling with God or the world', faith_distant: 'Faith feels distant',
    not_catholic: 'New to the faith', newlywed: 'Newly married or engaged', parents: 'Parents',
    priest: 'Priests', religious: 'Religious', leader: 'Leaders', work_not_service: 'Work feels meaningless',
    wants_learn: 'Wants to learn', wants_discover: 'Wants to discover', wants_grow: 'Wants to grow',
    home_hard: 'Home life is hard', widowed: 'Grieving or widowed', young: 'Young adults'
  };
  var SEASON_LABELS = {
    advent: 'Advent', christmas: 'Christmas', lent: 'Lent', easter: 'Easter', pentecost: 'Pentecost',
    mary: 'Marian (May & October)', 'sacred-heart': 'Sacred Heart (June)', 'last-things': 'November',
    summer: 'Summer', 'new-year': 'New Year', 'back-to-work': 'September'
  };

  function normaliseLibrary(entries) {
    var byHandle = {};
    (entries || []).forEach(function (e) {
      if (!e || !e.handle) return;
      var themes = {};
      mapLabels(e.themes, THEMES).forEach(function (k) { themes[k] = 1; });
      byHandle[e.handle] = {
        themes: themes,
        audience: mapLabels(e.good_for || e.audience, AUDIENCES),
        depth: e.depth ? (DEPTHS[norm(e.depth)] || num(e.depth, 0) || null) : null,
        seasons: mapLabels(e.seasons, SEASON_LABELS),
        startWhen: mapLabels(e.start_when || e.startWhen, START_WHEN),
        why: e.why || '',
        boost: clamp(num(e.boost, 0), -3, 3),
        exclude: e.exclude === true || e.exclude === 'true'
      };
    });
    return byHandle;
  }

  // Topic collections: "marriage-and-family: marriage, family" lines, or an object.
  function parseTopicMap(v) {
    if (!v) return {};
    if (typeof v === 'object') return v;
    var out = {};
    String(v).split(/\r?\n/).forEach(function (line) {
      var m = line.match(/^\s*([a-z0-9][a-z0-9-]*)\s*:\s*(.+)$/i);
      if (m) out[m[1].toLowerCase()] = m[2].split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
    });
    return out;
  }

  /**
   * Build the scored catalogue. `input`:
   *   products   Shopify products (products.json shape, or the compact shape Liquid emits)
   *   lists      { bestsellers: [handle…] in rank order, trending: [handle…], topics: {collection: [handle…]} }
   *   topicMap   { collection: ['marriage', 'family', 'season:lent', 'audience:parents'] } or text lines
   *   library    curated entries from the formation_book metaobject
   *   settings   overrides of DEFAULTS
   */
  function prepareCatalog(input) {
    input = input || {};
    var s = Object.assign({}, DEFAULTS, input.settings || {});
    var lists = input.lists || {};
    var lib = normaliseLibrary(input.library);
    var topicMap = parseTopicMap(input.topicMap);
    var bestRank = {}, trending = {};
    (lists.bestsellers || []).forEach(function (h, i) { if (!(h in bestRank)) bestRank[h] = i; });
    (lists.trending || []).forEach(function (h) { trending[h] = true; });
    var nBest = Math.max(1, (lists.bestsellers || []).length);

    // Which topic collections each handle sits in.
    var topicsOf = {};
    Object.keys(lists.topics || {}).forEach(function (col) {
      (lists.topics[col] || []).forEach(function (h) { (topicsOf[h] = topicsOf[h] || []).push(col.toLowerCase()); });
    });

    var excludeHandles = toArray(s.excludeHandles).map(norm);
    var excludeTags = toArray(s.excludeTags).map(norm);
    var excludeTypes = s.excludeTypes instanceof RegExp ? s.excludeTypes
      : (s.excludeTypes ? new RegExp(toArray(s.excludeTypes).map(escapeRe).join('|'), 'i') : null);
    var publishers = toArray(s.publisherNames).map(norm);
    var root = String(s.rootUrl || '/').replace(/\/?$/, '/');

    var seen = {}, items = [], rejected = [];
    var products = (input.products || []).concat((input.library || []).map(function (e) { return e && e.product; }));
    products.forEach(function (p) {
      if (!p || !p.handle || seen[p.handle]) return;
      seen[p.handle] = true;
      var tags = toArray(p.tags);
      var title = p.title || p.handle;
      var body = stripHtml(p.body_html || p.description || p.excerpt || '');
      var type = p.product_type || p.type || '';
      var variants = p.variants || [];
      var available = p.available !== undefined ? !!p.available
        : variants.length ? variants.some(function (v) { return v.available !== false; }) : true;
      var price = priceOf(p);
      var curated = lib[p.handle] || null;

      var why = null;
      if (curated && curated.exclude) why = 'curated-exclude';
      else if (excludeHandles.indexOf(norm(p.handle)) >= 0) why = 'handle';
      else if (tags.some(function (t) { return excludeTags.indexOf(norm(t)) >= 0; })) why = 'tag';
      else if (excludeTypes && type && excludeTypes.test(type)) why = 'type';
      else if (/gift ?card/i.test(title)) why = 'type';
      else if (s.requireAvailable && !available) why = 'unavailable';
      else if (s.excludeFree && !(price > 0)) why = 'free';
      else if (s.excludeSpanish && looksSpanish(title, tags)) why = 'spanish';
      else if (s.excludeBundles && !curated && /\b(set|sets|pack|bundle|box|boxed|series|kit|full set)\b/i.test(title.replace(/\bsets? (?:free|apart|out)\b/i, ''))) why = 'bundle';
      if (why) { rejected.push({ handle: p.handle, title: title, reason: why }); return; }

      // Author: a vendor that is not the publisher, else a person-like tag, else "by X".
      var author = '';
      if (p.vendor && publishers.indexOf(norm(p.vendor)) < 0) author = p.vendor;
      var personTags = tags.filter(looksLikePerson);
      if (!author && personTags.length) {
        var bodyN = norm(body);
        author = personTags.slice().sort(function (x, y) {
          function sc(t) { return (bodyN.indexOf(authorKey(t)) >= 0 ? 2 : 0) + (HONORIFIC.test(norm(t)) ? 1 : 0); }
          return sc(y) - sc(x);
        })[0];
      }
      if (!author) {
        var m = body.match(/\bby\s+((?:(?:Fr|St|Rev|Msgr|Dr)\.?\s+)?[A-Z][\wáéíóúñ.'’-]+(?:\s+(?:de|del|la|van|von)?\s*[A-Z][\wáéíóúñ.'’-]+){0,3})/);
        if (m) author = m[1];
      }
      var nonAuthorTags = tags.filter(function (t) { return personTags.indexOf(t) < 0; });

      // Themes: curated (1.0) ∪ topic collections (0.8) ∪ inferred (≤0.7).
      var themes = {};
      var inferred = inferThemes(title, nonAuthorTags, body);
      Object.keys(inferred).forEach(function (k) { themes[k] = Math.max(themes[k] || 0, 0.7 * inferred[k]); });
      var seasons = inferSeasons(title, nonAuthorTags);
      var audience = [];
      (topicsOf[p.handle] || []).forEach(function (col) {
        (topicMap[col] || []).forEach(function (t) {
          if (t.indexOf('season:') === 0) seasons.push(t.slice(7));
          else if (t.indexOf('audience:') === 0) audience.push(t.slice(9));
          else if (THEMES[t]) themes[t] = Math.max(themes[t] || 0, 0.8);
        });
      });
      if (curated) {
        Object.keys(curated.themes).forEach(function (k) { themes[k] = 1; });
        audience = audience.concat(curated.audience);
        seasons = seasons.concat(curated.seasons);
      }
      // Inferred audiences for books that are plainly for one state of life.
      if (!curated) {
        if (/\b(priests?|priesthood|priestly|seminar\w*|clergy)\b/i.test(title)) audience.push('priests');
        if (/\b(religious life|consecrated|nuns|monks|novices?)\b/i.test(title)) audience.push('religious');
        if (/\b(marriage|married|spouses?|husbands?|wives|wife|wedding|engaged)\b/i.test(title)) audience.push('married', 'engaged');
        if (/\b(parents?|parenting|upbringing|raising|teenagers?|fathers|fatherhood|mothers|motherhood)\b/i.test(title)) audience.push('parents');
      }
      audience = uniq(audience);
      seasons = uniq(seasons);

      var depth = curated && curated.depth ? curated.depth : inferDepth(title, body, themes, type);
      var rank = bestRank.hasOwnProperty(p.handle) ? bestRank[p.handle] : null;
      var variant = p.variant || (variants.find ? variants.find(function (v) { return v.available !== false; }) : null) || variants[0];

      items.push({
        handle: p.handle,
        id: p.id || null,
        title: title,
        url: p.url || (root + 'products/' + p.handle),
        image: imageOf(p, s.imageWidth),
        price: price,
        variantId: typeof variant === 'object' && variant ? variant.id : (variant || null),
        author: author,
        authorKey: authorKey(author) || ('~' + p.handle),
        workKeys: workKeysFor(title),
        themes: themes,
        strength: Math.sqrt(Object.keys(themes).reduce(function (acc, k) { return acc + themes[k] * themes[k]; }, 0)),
        audience: audience,
        seasons: seasons,
        months: inferMonths(title),
        depth: depth,
        bestRank: rank,
        isBestseller: rank !== null || !!trending[p.handle],
        popularity: rank !== null ? 0.5 + 0.5 * (1 - rank / nBest) : (trending[p.handle] ? 0.45 : 0),
        trending: !!trending[p.handle],
        largePrint: /large print/i.test(title),
        reference: /\b(handbook of prayers|prayer ?book|missal|breviary|lectionary|catechism of|new testament|bible)\b/i.test(title) && !/commentary|navarre/i.test(title + ' ' + body.slice(0, 300)),
        insider: /\bopus dei\b|\bprelature\b|\bnumerar/i.test(title + ' ' + body.slice(0, 600)),
        curated: !!curated,
        boost: curated ? curated.boost : 0,
        why: curated ? curated.why : '',
        startWhen: curated ? curated.startWhen : []
      });
    });

    // Prefer the best-ranked, regular-print edition when two editions of the same work exist.
    items.sort(function (x, y) {
      var rx = x.bestRank === null ? 1e6 : x.bestRank, ry = y.bestRank === null ? 1e6 : y.bestRank;
      return (rx - ry) || ((x.largePrint ? 1 : 0) - (y.largePrint ? 1 : 0)) || (y.curated - x.curated);
    });
    var byHandle = {};
    items.forEach(function (it) { byHandle[it.handle] = it; });
    return { items: items, byHandle: byHandle, rejected: rejected, settings: s };
  }

  // ---------------------------------------------------------------------------------------------
  // Scoring
  // ---------------------------------------------------------------------------------------------

  function audienceFactor(it, p) {
    var named = 0, missed = 0;
    Object.keys(DIMENSIONS).forEach(function (d) {
      var mine = it.audience.filter(function (x) { return DIMENSIONS[d].indexOf(x) >= 0; });
      if (!mine.length) return;
      named++;
      if (!mine.some(function (x) { return p.audience.indexOf(x) >= 0; })) missed++;
    });
    // "Everyone; Married; Parents" means anyone, especially couples and parents: an emphasis,
    // not a gate. Without "Everyone" the named audiences are the audience.
    var open = it.audience.indexOf('everyone') >= 0;
    if (missed) return open ? (named > missed ? 1.15 : 1) : 0.3;
    if (named) return open ? 1.2 : 1.3;
    var soft = it.audience.some(function (x) { return x !== 'everyone' && p.audience.indexOf(x) >= 0; });
    return soft ? 1.12 : 1;
  }

  function faithFactor(it, p, slotIndex) {
    var t = it.themes;
    if (p.faithGroup === 'catholic') {
      if ((t.seeker || 0) > 0.5 && !p.flags.distant) return 0.85;
      return 1;
    }
    var f = 1;
    if (Math.max(t.priesthood || 0, t.religious || 0) > 0.5) f *= 0.2;
    if (it.insider) f *= slotIndex < 6 ? 0.2 : 0.35;
    if ((t.seeker || 0) > 0.4 || it.audience.indexOf('seekers') >= 0 || it.audience.indexOf('christians') >= 0) f *= 1.35;
    var universal = ['peace', 'virtue', 'leadership', 'friendship', 'family', 'marriage', 'culture', 'story', 'hope'];
    if (universal.some(function (k) { return (t[k] || 0) >= 0.6; })) f *= 1.1;
    if (slotIndex < 3 && ((t.mary || 0) > 0.6 || (t.classic || 0) > 0.6)) f *= 0.8;
    return f;
  }

  var ANCHOR_ORDER = ['advent', 'christmas', 'lent', 'easter', 'pentecost', 'mary', 'sacred-heart', 'last-things', 'summer', 'new-year', 'back-to-work'];
  function anchorOf(seasons) {
    return seasons.slice().sort(function (x, y) { return ANCHOR_ORDER.indexOf(x) - ANCHOR_ORDER.indexOf(y); })[0];
  }
  function seasonFactor(it, slot) {
    if (it.months) return it.months.indexOf(slot.month) >= 0 ? 1.45 : 0.3;
    var explicit = it.seasons;
    var liturgical = explicit.filter(function (x) { return LITURGICAL.indexOf(x) >= 0 && x !== 'pentecost'; });
    if (explicit.length && slot.seasons.indexOf(anchorOf(explicit)) >= 0) return 1.45;
    if (explicit.some(function (x) { return slot.seasons.indexOf(x) >= 0; })) return 1.12;
    if (liturgical.length) return 0.25; // Advent meditations do not belong in July.
    var aff = 0;
    slot.seasons.forEach(function (sk, i) {
      var st = SEASONS[sk] && SEASONS[sk].themes;
      if (st) aff = Math.max(aff, (i === 0 ? 1 : 0.6) * cosine(st, it.themes));
    });
    return 1 + 0.25 * aff;
  }

  function gaussian(x, mu, sigma) { return Math.exp(-((x - mu) * (x - mu)) / (2 * sigma * sigma)); }

  function scoreItem(it, p, slot, ctx) {
    var needs = slot.index === 0 ? ctx.firstNeeds : p.needs;
    // Direction (cosine) times the strength of the evidence: a book we only faintly know is
    // about prayer should not beat one we know well is about prayer.
    var rel = cosine(needs, it.themes) * Math.min(1, Math.sqrt(it.strength / 0.9));
    var top = p.top[0];
    if (top && (it.themes[top] || 0) >= 0.5) rel += 0.08;
    var depthFit = gaussian(it.depth, slot.targetDepth, 0.9);
    var base = (0.15 + rel) * audienceFactor(it, p) * faithFactor(it, p, slot.index) *
      (0.55 + 0.45 * depthFit) * seasonFactor(it, slot);
    var pop = 0.22 * it.popularity + (it.trending ? 0.04 : 0);
    var editorial = 0.06 * it.boost + (ctx.featured[it.handle] ? 0.12 : 0) - (it.largePrint ? 0.05 : 0);
    if (it.reference) base *= slot.index === 0 ? 0.6 : 0.8;
    if (slot.index < 3 && it.startWhen.some(function (c) { return CONDITIONS[c] && CONDITIONS[c](p); })) editorial += 0.35;
    return { total: base + pop + editorial, rel: rel, base: base, pop: pop };
  }

  // ---------------------------------------------------------------------------------------------
  // Planning
  // ---------------------------------------------------------------------------------------------

  function startOf(date) {
    var d = date instanceof Date ? date : new Date(date || Date.now());
    var y = d.getFullYear(), m = d.getMonth();
    // After the 20th, the plan starts next month; nobody starts a month-long book on the 28th.
    if (d.getDate() > 20) { m += 1; if (m > 11) { m = 0; y += 1; } }
    return { year: y, month: m };
  }

  function backlistSlots(n, share) {
    var count = Math.round(n * (1 - clamp(share, 0, 1)));
    var out = {};
    for (var k = 0; k < count; k++) {
      var pos = Math.round((k + 1) * n / (count + 1));
      pos = clamp(pos, 1, n - 1); // month 1 is always a proven favourite
      while (out[pos] && pos < n - 1) pos++;
      out[pos] = true;
    }
    return out;
  }

  function makeSlots(start, n, p, share) {
    var back = backlistSlots(n, share); // provisional; assignTiers() refines it
    var slots = [];
    for (var i = 0; i < n; i++) {
      var m = start.month + i, y = start.year + Math.floor(m / 12);
      m = m % 12;
      var seasons = seasonsFor(y, m);
      var t = n > 1 ? i / (n - 1) : 0;
      var depth = p.depth.start + (p.depth.end - p.depth.start) * t;
      if (i === 0) depth = Math.min(depth, 1.6);
      if (seasons.indexOf('summer') >= 0) depth -= 0.3;
      slots.push({ index: i, year: y, month: m, label: MONTH_NAMES[m] + ' ' + y, seasons: seasons,
        targetDepth: depth, wantTier: back[i] ? 'backlist' : 'bestseller' });
    }
    return slots;
  }

  // Same work, a combined volume and its parts, or a title that extends another of three or more
  // words ("The Faith Explained" / "The Faith Explained Today"). "The Way" and "The Way of the
  // Cross" stay distinct: two words are not enough to call it a family.
  function sameFamily(x, y) {
    var a = x.workKeys[0], b = y.workKeys[0];
    if (a.indexOf('#') >= 0 || b.indexOf('#') >= 0) return false;
    var short = a.length <= b.length ? a : b, long = short === a ? b : a;
    return short.split(' ').length >= 3 && long.indexOf(short + ' ') === 0;
  }
  function conflicts(it, chosen) {
    return chosen.some(function (c) {
      return c.handle === it.handle || sameFamily(c, it) ||
        c.workKeys.some(function (k) { return it.workKeys.indexOf(k) >= 0; });
    });
  }

  function authorCount(it, chosen) {
    return chosen.filter(function (c) { return c.authorKey === it.authorKey; }).length;
  }

  function adjacentSameAuthor(it, index, placed) {
    return [index - 1, index + 1].some(function (j) { return placed[j] && placed[j].authorKey === it.authorKey; });
  }

  function eligible(it, index, placed, maxPerAuthor, exclude) {
    var chosen = placed.filter(Boolean);
    if (exclude && exclude[it.handle]) return false;
    if (conflicts(it, chosen)) return false;
    if (authorCount(it, chosen) >= maxPerAuthor) return false;
    if (adjacentSameAuthor(it, index, placed)) return false;
    return true;
  }

  function diversityPenalty(it, placed) {
    var maxSim = 0, sameAuthor = false, reference = false;
    placed.forEach(function (c) {
      if (!c) return;
      maxSim = Math.max(maxSim, cosine(it.themes, c.themes));
      if (c.authorKey === it.authorKey) sameAuthor = true;
      if (c.reference && it.reference) reference = true;
    });
    return 0.3 * maxSim + (sameAuthor ? 0.12 : 0) + (reference ? 0.3 : 0);
  }

  // Bring the backlist in where it costs least. The year is first filled with the best picks
  // (bestsellers preferred); then, one at a time, the month whose best *available* backlist
  // book loses the least against what is there is switched, until the share is met or no
  // backlist book clears the floor. Swaps are costed against the plan as it now stands, so a
  // backlist book used in November is not counted again for March.
  function bringInBacklist(slots, items, p, ctx, placed, meta, target) {
    var have = placed.filter(function (it) { return it && !it.isBestseller; }).length;
    var locked = {};
    meta.forEach(function (m, i) { if (m && m.source === 'rule') locked[i] = true; });
    locked[0] = true; // month 1 is always a proven favourite
    while (have < target) {
      var bestSwap = null;
      for (var i = 1; i < slots.length; i++) {
        if (locked[i] || !placed[i] || !placed[i].isBestseller) continue;
        var others = placed.slice(); others[i] = null;
        var cur = scoreItem(placed[i], p, slots[i], ctx).total - diversityPenalty(placed[i], others);
        var alt = null;
        for (var j = 0; j < items.length; j++) {
          var it = items[j];
          if (it.isBestseller || !eligible(it, i, others, ctx.maxPerAuthor)) continue;
          var t = scoreItem(it, p, slots[i], ctx).total - diversityPenalty(it, others);
          if (!alt || t > alt.t) alt = { it: it, t: t };
        }
        if (!alt || alt.t < FLOOR.backlist * cur) continue;
        var nearBack = (placed[i - 1] && !placed[i - 1].isBestseller ? 1 : 0) + (placed[i + 1] && !placed[i + 1].isBestseller ? 1 : 0);
        var val = (cur - alt.t) / Math.max(cur, 1e-6) + 0.18 * nearBack; // keep the gems spread through the year
        if (!bestSwap || val < bestSwap.val) bestSwap = { i: i, it: alt.it, val: val };
      }
      if (!bestSwap) break;
      placed[bestSwap.i] = bestSwap.it;
      meta[bestSwap.i] = { source: 'engine' };
      locked[bestSwap.i] = true;
      have++;
    }
  }

  // How good the wanted shelf's best book must be, relative to the best book on any shelf,
  // before quality overrides the quota.
  var FLOOR = { backlist: 0.5, bestseller: 0.8 };

  function matchesText(it, needle) {
    var n = norm(needle);
    if (!n) return false;
    return norm(it.author).indexOf(n) >= 0 || norm(it.title).indexOf(n) >= 0 ||
      it.authorKey === authorKey(needle);
  }

  function pickFor(slot, cands, p, ctx, placed, rand, exclude) {
    var runners = [];
    cands.forEach(function (it) {
      if (!eligible(it, slot.index, placed, ctx.maxPerAuthor, exclude)) return;
      var sc = scoreItem(it, p, slot, ctx);
      runners.push({ it: it, total: sc.total - diversityPenalty(it, placed) + rand() * 0.05, sc: sc });
    });
    runners.sort(function (x, y) { return y.total - x.total; });
    var top = runners[0] || null;
    var wantBack = slot.wantTier === 'backlist';
    var inTier = runners.filter(function (r) { return wantBack ? !r.it.isBestseller : r.it.isBestseller; })[0];
    var best = inTier && top && inTier.total >= FLOOR[wantBack ? 'backlist' : 'bestseller'] * top.total ? inTier : top;
    return { best: best, runners: runners };
  }

  function placeAt(preferred, placed, it) {
    var n = placed.length;
    for (var d = 0; d < n; d++) {
      var i = preferred + d;
      if (i < n && !placed[i] && !adjacentSameAuthor(it, i, placed)) return i;
    }
    for (var e = 1; e < n; e++) {
      var j = preferred - e;
      if (j >= 0 && !placed[j] && !adjacentSameAuthor(it, j, placed)) return j;
    }
    return -1;
  }

  /**
   * Build a plan.
   *   profile   from profileFromAnswers()
   *   catalog   from prepareCatalog()
   *   opts      { start: Date, seed: string, variant, bestsellerShare, rules: [{condition, products:[handles], match, month, note}],
   *               featured: [handles], maxPerAuthor, months }
   */
  function buildPlan(profile, catalog, opts) {
    opts = opts || {};
    var s = catalog.settings || DEFAULTS;
    var n = opts.months || s.months || 12;
    var share = num(opts.bestsellerShare, s.bestsellerShare);
    var start = opts.start && opts.start.year !== undefined ? opts.start : startOf(opts.start);
    var rand = rng(String(opts.seed || JSON.stringify(profile.a)) + '|' + (opts.variant || ''));
    var slots = makeSlots(start, n, profile, share);
    var featured = {};
    toArray(opts.featured).forEach(function (h) { featured[h] = true; });
    // The first month leans harder on the single strongest need.
    var firstNeeds = Object.assign({}, profile.needs);
    if (profile.top[0]) firstNeeds[profile.top[0]] = (firstNeeds[profile.top[0]] || 0) * 2;
    var ctx = { featured: featured, firstNeeds: firstNeeds, maxPerAuthor: num(opts.maxPerAuthor, s.maxPerAuthor) };
    var placed = new Array(n), meta = new Array(n);
    var items = catalog.items;

    // 1. Starter rules from the admin, in order. One rule is built in and survives an empty
    //    rule list: someone who feels pretty poor about God, religion or the world starts with
    //    Fr. Jacques Philippe.
    var rules = (opts.rules || []).filter(function (r) { return r && r.condition; });
    if (opts.builtInRules !== false && !rules.some(function (r) { return r.condition === 'struggling'; })) {
      rules.unshift({ condition: 'struggling', match: 'Jacques Philippe', month: 1 });
    }
    rules.forEach(function (rule, ri) {
      var test = CONDITIONS[rule.condition];
      if (!test || !test(profile)) return;
      var pool = [];
      toArray(rule.products).forEach(function (h) { if (catalog.byHandle[h]) pool.push(catalog.byHandle[h]); });
      if (!pool.length && rule.match) pool = items.filter(function (it) { return matchesText(it, rule.match); });
      var index = clamp(num(rule.month, 1), 1, n) - 1;
      var probe = { index: index, seasons: slots[index].seasons, targetDepth: slots[index].targetDepth, wantTier: 'bestseller' };
      var chosen = placed.filter(Boolean);
      var best = null;
      pool.forEach(function (it, order) {
        if (conflicts(it, chosen) || authorCount(it, chosen) >= ctx.maxPerAuthor) return;
        // Listed order is the admin's preference; relevance breaks near-ties.
        var sc = scoreItem(it, profile, probe, ctx).total - order * 0.04;
        if (!best || sc > best.sc) best = { it: it, sc: sc };
      });
      if (!best) return;
      var at = placeAt(index, placed, best.it);
      if (at < 0) return;
      placed[at] = best.it;
      meta[at] = { source: 'rule', rule: ri, note: rule.note || '' };
    });

    // 2. Fill the year, month 1 first, bestsellers preferred (a much better backlist book still
    //    wins), then bring in the backlist where it costs least.
    for (var i = 0; i < n; i++) {
      if (placed[i]) continue;
      slots[i].wantTier = 'bestseller';
      var r = pickFor(slots[i], items, profile, ctx, placed, rand);
      if (!r.best) continue;
      placed[i] = r.best.it;
      meta[i] = { source: 'engine' };
    }
    bringInBacklist(slots, items, profile, ctx, placed, meta, Math.round(n * (1 - clamp(share, 0, 1))));
    slots.forEach(function (slot, k) { if (placed[k]) slot.wantTier = placed[k].isBestseller ? 'bestseller' : 'backlist'; });

    // 3. Alternates for the "already read it? swap" button.
    var months = slots.map(function (slot, i) {
      var it = placed[i];
      if (!it) return null;
      var others = placed.slice(); others[i] = null;
      var alts = pickFor(slot, items, profile, ctx, others, rng('alt' + i + (opts.seed || '')), (function () { var x = {}; x[it.handle] = 1; return x; })())
        .runners.slice(0, 4).map(function (rr) { return rr.it.handle; });
      return describeMonth(slot, it, profile, meta[i], alts);
    });

    var picked = months.filter(Boolean);
    return {
      version: 1,
      variant: opts.variant || '',
      archetype: profile.archetype,
      top: profile.top,
      start: start,
      months: picked,
      practice: practiceFor(profile),
      stats: {
        bestsellers: picked.filter(function (m) { return m.tier === 'bestseller'; }).length,
        backlist: picked.filter(function (m) { return m.tier === 'backlist'; }).length,
        authors: uniq(picked.map(function (m) { return m.item.authorKey; })).length
      }
    };
  }

  // Swap one month for its next-best alternative, keeping the rest of the plan.
  function swapMonth(plan, index, profile, catalog, opts) {
    opts = opts || {};
    var s = catalog.settings || DEFAULTS;
    var slots = makeSlots(plan.start, plan.months.length, profile, num(opts.bestsellerShare, s.bestsellerShare));
    slots[index].wantTier = plan.months[index].tier;
    var placed = plan.months.map(function (m) { return catalog.byHandle[m.item.handle] || null; });
    var exclude = {};
    toArray(opts.exclude).forEach(function (h) { exclude[h] = 1; });
    exclude[plan.months[index].item.handle] = 1;
    placed[index] = null;
    var firstNeeds = Object.assign({}, profile.needs);
    if (profile.top[0]) firstNeeds[profile.top[0]] = (firstNeeds[profile.top[0]] || 0) * 2;
    var ctx = { featured: {}, firstNeeds: firstNeeds, maxPerAuthor: num(opts.maxPerAuthor, s.maxPerAuthor) };
    var r = pickFor(slots[index], catalog.items, profile, ctx, placed, rng('swap' + index + Object.keys(exclude).join()), exclude);
    if (!r.best) return plan;
    var next = Object.assign({}, plan, { months: plan.months.slice() });
    next.months[index] = describeMonth(slots[index], r.best.it, profile, { source: 'swap' },
      r.runners.slice(1, 5).map(function (x) { return x.it.handle; }));
    next.stats = Object.assign({}, plan.stats, {
      bestsellers: next.months.filter(function (m) { return m.tier === 'bestseller'; }).length,
      backlist: next.months.filter(function (m) { return m.tier === 'backlist'; }).length
    });
    return next;
  }

  // ---------------------------------------------------------------------------------------------
  // Words: why each book, and a first-week practice.
  // ---------------------------------------------------------------------------------------------

  var MARRIED_YEARS = { '<1': 'less than a year', '1-5': 'a few years', '6-15': 'more than five years', '16-30': 'more than fifteen years', '30+': 'more than thirty years' };
  var NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six or more'];

  // One clean clause per theme, in the reader's own terms where we have them.
  function reasonFor(theme, p) {
    var a = p.a, f = p.flags;
    switch (theme) {
      case 'peace':
        if (f.struggling) return 'God, the Church or the world feel heavy right now';
        if (a.workFeel === 'burnedout') return 'work has you running on empty';
        if (f.homeHard) return 'home has been hard lately';
        return 'every good thing starts from a heart at peace';
      case 'prayer':
        if (a.faith === 'dry') return 'prayer has felt dry lately';
        if (a.desire === 'grow') return 'you want to grow in prayer';
        return 'it will deepen your prayer';
      case 'hope': return a.state === 'widowed' ? 'you have known loss' : 'some stretches of the road are hard';
      case 'virtue': return a.desire === 'grow' ? 'you want to grow in virtue' : 'every mission needs character';
      case 'work': return f.workNotService ? 'you would like your work to mean more' : 'your work can become prayer';
      case 'leadership': return f.leader ? 'you lead people at work' : 'real leadership starts with virtue';
      case 'marriage':
        if (a.state === 'engaged') return 'you are preparing for marriage';
        if (a.state === 'married' && MARRIED_YEARS[a.marriedYears]) return 'you have been married ' + MARRIED_YEARS[a.marriedYears];
        return 'married love is a path to holiness';
      case 'family':
        if (p.kids === 1) return 'you are raising a child';
        if (p.kids > 1) return 'you are raising ' + NUMBER_WORDS[Math.min(p.kids, 6)] + ' children';
        if (a.work === 'home') return 'your home is your workplace';
        return 'home is where holiness is learned';
      case 'doctrine':
        if (a.faith === 'doubting') return 'your questions deserve real answers';
        return a.desire === 'learn' ? 'you want to understand the faith more deeply' : 'it lays the foundations clearly';
      case 'scripture': return 'it opens Scripture with the Church';
      case 'saints': return a.desire === 'discover' ? 'you want to discover something new' : 'the saints show what is possible';
      case 'mary': return 'Our Lady walks this road with you';
      case 'priesthood': return a.priestRole === 'parochial' ? 'you shepherd a parish' : 'it is written for priests';
      case 'religious': return a.order ? 'you serve God with the ' + a.order : 'you have given your life to God';
      case 'friendship': return 'your faith is ready to be shared';
      case 'story': return 'a story can teach what an argument cannot';
      case 'classic': return 'it is a classic of the spiritual life';
      case 'seeker': return 'it is a clear, welcoming place to begin';
      case 'culture': return 'it helps you read the world we live in';
    }
    return 'it fits where you are';
  }

  function describeMonth(slot, it, p, meta, alts) {
    var contrib = THEME_KEYS.map(function (k) { return { k: k, v: (p.needs[k] || 0) * (it.themes[k] || 0) }; })
      .filter(function (x) { return x.v > 0.05; })
      .sort(function (x, y) { return y.v - x.v; });
    var reasons = uniq(contrib.slice(0, 2).map(function (x) { return reasonFor(x.k, p); }));
    if (!reasons.length) reasons.push(it.isBestseller ? 'readers keep coming back to it' : 'it is one of the quiet treasures of our backlist');
    var seasonHit = it.seasons.filter(function (x) { return slot.seasons.indexOf(x) >= 0; })[0] ||
      slot.seasons.filter(function (x) { var t = SEASON_TAG_IF[x]; return t && (it.themes[t] || 0) >= 0.6; })[0] || null;
    var tags = [];
    if (it.isBestseller) tags.push(it.trending && it.bestRank === null ? 'Trending now' : 'Reader favorite');
    else tags.push('Hidden gem');
    if (seasonHit && SEASONS[seasonHit]) tags.push(SEASONS[seasonHit].tag);
    else if (it.months && it.months.indexOf(slot.month) >= 0) tags.push('In season');
    var because = 'Because ' + reasons[0] + (reasons[1] ? ', and ' + reasons[1] : '') + '.';
    var blurb = (meta && meta.note) || it.why || '';
    return {
      index: slot.index, year: slot.year, month: slot.month, label: slot.label, monthName: MONTH_NAMES[slot.month],
      seasons: slot.seasons, season: seasonHit,
      item: {
        handle: it.handle, id: it.id, title: it.title, url: it.url, image: it.image, price: it.price,
        variantId: it.variantId, author: it.author, authorKey: it.authorKey
      },
      tier: it.isBestseller ? 'bestseller' : 'backlist',
      trending: it.trending,
      themes: contrib.slice(0, 3).map(function (x) { return x.k; }),
      reasons: reasons, because: because, blurb: blurb, why: blurb || because, tags: tags,
      source: meta ? meta.source : 'engine',
      alternates: alts || []
    };
  }

  var PRACTICES = {
    peace: 'Each morning this week, before you look at your phone, give God five quiet minutes and hand Him one worry by name.',
    hope: 'This week, when something weighs on you, say one sentence to God about it: “You know this. I trust You.”',
    prayer: 'Ten minutes of quiet prayer every day this week: same time, same place, even when it feels like nothing is happening.',
    classic: 'Ten minutes of quiet prayer every day this week: same time, same place, even when it feels like nothing is happening.',
    mary: 'Pray one decade of the Rosary each day this week, for one person you love by name.',
    work: 'Offer the first hour of your work each day this week for someone who needs it, and do that hour as well as you can.',
    leadership: 'This week, notice one person on your team each day and serve them in a small, concrete way before they ask.',
    virtue: 'Choose one small, stubborn habit and conquer it every day this week. Greatness is built of small victories.',
    marriage: 'This week, one evening without screens: ask your spouse, “What is one thing I could do to make your week lighter?”',
    family: 'Pick one meal this week to eat together with no phones, and let each person share the best part of their day.',
    doctrine: 'Read fifteen minutes a day this week, and write down one question each day. Questions are how understanding grows.',
    scripture: 'Read the Gospel of the day each morning this week and carry one line of it with you until evening.',
    saints: 'Look up the saint of each day this week and ask: what would they do in my place today?',
    story: 'Read fifteen minutes before bed each night this week instead of scrolling. Let a good story do its quiet work.',
    friendship: 'This week, reach out to one friend you have not spoken to in a while, just to ask how they are really doing.',
    priesthood: 'Each day this week, before Mass, name one parishioner and offer that Mass for them in particular.',
    religious: 'Each day this week, renew your vows silently at one ordinary moment: the stairs, a doorway, the kitchen.',
    seeker: 'Spend ten minutes in silence three times this week and simply say: “If You are there, show me.”',
    culture: 'Once this week, trade one news session for fifteen minutes of reading that helps you understand, not just react.'
  };
  function practiceFor(p) {
    var key = p.top.filter(function (k) { return PRACTICES[k]; })[0] || 'prayer';
    return { theme: key, text: PRACTICES[key] };
  }

  // ---------------------------------------------------------------------------------------------
  // Catalogue loading in the browser (Shopify storefront JSON, cached).
  // ---------------------------------------------------------------------------------------------

  function compactProduct(p) {
    var v = (p.variants || []).find(function (x) { return x.available !== false; }) || (p.variants || [])[0] || {};
    return {
      id: p.id, handle: p.handle, title: p.title, vendor: p.vendor, product_type: p.product_type,
      tags: toArray(p.tags), available: (p.variants || []).some(function (x) { return x.available !== false; }),
      price: v.price, variant: v.id, image: p.images && p.images[0] ? p.images[0].src : '',
      excerpt: stripHtml(p.body_html || '').replace(/\s+/g, ' ').trim().slice(0, 1200)
    };
  }

  /**
   * Fetch every published product from /products.json (250 a page) and cache a compact copy.
   * Resolves to [] rather than rejecting: a plan from the bestsellers alone is still a plan.
   */
  function loadCatalog(opts) {
    opts = opts || {};
    var root = String(opts.rootUrl || '/').replace(/\/?$/, '/');
    var key = 'scepter-catalog:' + root + ':' + (opts.version || 1);
    var ttl = (opts.ttlHours || 6) * 3600000;
    var store = null;
    try { store = opts.storage || (typeof localStorage !== 'undefined' ? localStorage : null); } catch (e) { store = null; }
    try {
      var cached = store && JSON.parse(store.getItem(key) || 'null');
      if (cached && Date.now() - cached.t < ttl && cached.products && cached.products.length) return Promise.resolve(cached.products);
    } catch (e) { /* corrupt cache: refetch */ }
    var fetcher = opts.fetch || (typeof fetch !== 'undefined' ? fetch.bind(typeof window !== 'undefined' ? window : undefined) : null);
    if (!fetcher) return Promise.resolve([]);
    var maxPages = opts.maxPages || 8, all = [];
    function page(n) {
      return fetcher(root + 'products.json?limit=250&page=' + n, { credentials: 'same-origin' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (j) {
          var ps = (j && j.products) || [];
          all = all.concat(ps.map(compactProduct));
          if (ps.length === 250 && n < maxPages) return page(n + 1);
          return all;
        });
    }
    return page(1).then(function (list) {
      try { if (store) store.setItem(key, JSON.stringify({ t: Date.now(), products: list })); } catch (e) { /* quota: fine */ }
      return list;
    }).catch(function () { return all; });
  }

  // ---------------------------------------------------------------------------------------------
  // Plan permalinks: /pages/reading-plan?plan=1.m.202610.peacemaker.handle~handle~…
  // ---------------------------------------------------------------------------------------------

  var VARIANT_CODES = { mission: 'm', adventure: 'a', treasures: 't' };
  function encodePlan(plan) {
    var v = VARIANT_CODES[plan.variant] || 'x';
    var ym = String(plan.start.year) + ('0' + (plan.start.month + 1)).slice(-2);
    return ['1', v, ym, plan.archetype || 'pilgrim', plan.months.map(function (m) { return m.item.handle; }).join('~')].join('.');
  }
  function decodePlan(code) {
    var parts = String(code || '').split('.');
    if (parts.length < 5 || parts[0] !== '1') return null;
    var variant = Object.keys(VARIANT_CODES).filter(function (k) { return VARIANT_CODES[k] === parts[1]; })[0] || '';
    var ym = parts[2];
    var handles = parts.slice(4).join('.').split('~').filter(function (h) { return /^[a-z0-9][a-z0-9-]*$/.test(h); });
    return {
      variant: variant, archetype: parts[3].replace(/[^a-z-]/g, ''),
      start: { year: Number(ym.slice(0, 4)), month: Number(ym.slice(4, 6)) - 1 },
      handles: handles.slice(0, 24)
    };
  }

  return {
    THEMES: THEMES, AUDIENCES: AUDIENCES, SEASONS: SEASONS, CONDITIONS: CONDITIONS, MONTH_NAMES: MONTH_NAMES,
    START_WHEN: START_WHEN, SEASON_LABELS: SEASON_LABELS, DEFAULTS: DEFAULTS,
    profileFromAnswers: profileFromAnswers,
    prepareCatalog: prepareCatalog,
    buildPlan: buildPlan,
    swapMonth: swapMonth,
    loadCatalog: loadCatalog,
    encodePlan: encodePlan,
    decodePlan: decodePlan,
    // exposed for tests and for the admin playground
    _internal: {
      easterSunday: easterSunday, seasonsFor: seasonsFor, startOf: startOf, makeSlots: makeSlots,
      backlistSlots: backlistSlots, inferThemes: inferThemes, looksSpanish: looksSpanish, inferMonths: inferMonths,
      workKeysFor: workKeysFor, authorKey: authorKey, looksLikePerson: looksLikePerson,
      scoreItem: scoreItem, audienceFactor: audienceFactor, hashString: hashString, rng: rng, parseTopicMap: parseTopicMap,
      normaliseLibrary: normaliseLibrary, mainTitle: mainTitle, compactProduct: compactProduct
    }
  };
});
