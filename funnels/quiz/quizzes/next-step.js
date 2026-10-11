/* Quiz 1: "Find Your Next Step". For a reader choosing for themselves.
 *
 * Who it is for: cold traffic (social, search, a homepage banner) and newsletter readers.
 * Length: 8 to 11 screens, about three minutes. Questions that do not apply are hidden, so a
 * newcomer sees 8 and a practising Catholic sees 10.
 *
 * How it places a reader (see derive below):
 *   - what they say about their faith sets the starting point;
 *   - what they do (prayer, Mass, reading) decides between Taking Root, Growing Deeper and Bearing
 *     Fruit for practising Catholics, so enthusiasm and modesty both even out;
 *   - Seeking and Coming Home are never changed by habits, except that a returning reader with a
 *     steady practice is Taking Root. Someone who prays daily in another tradition is still
 *     Seeking in relation to the Catholic faith, and the result says so kindly.
 *   - needs come from what they choose, plus their life season (a couple gets "marriage", a parent
 *     gets "raising children") and Confession answers.
 * Nothing here is shown as a grade: no numbers, no levels, no ladder.
 */
(function (root) {
  'use strict';
  var SQ = root.ScepterQuiz;
  var seg = SQ.data.segments;

  function need(id, label) {
    var n = seg.needs.filter(function (x) { return x.id === id; })[0];
    return { id: id, label: label || n.label, score: { need: (function (o) { o[id] = 3; return o; })({}) } };
  }
  function needs(ids) { return ids.map(function (id) { return need(id); }); }

  var HABIT = function (n) { return { value: { habit: n } }; };

  var stageNames = {};
  seg.stages.forEach(function (s) { stageNames[s.id] = s.name; });

  var lifeStep = {
    'student': { title: 'Keep it short and keep it steady.', text: 'Five minutes before the day starts beats an hour you never get to. Tie it to something you already do, like the first coffee.' },
    'single': { title: 'Treat this as a full life, because it is one.', text: 'Your work, your friendships and your free evenings are exactly where God wants to meet you.' },
    'married': { title: 'Pray one short prayer together.', text: 'Grace before a meal or a minute before bed is enough. Few things strengthen a marriage more than praying side by side.' },
    'parent-young': { title: 'Pick one family moment and keep it.', text: 'A blessing at bedtime or a short prayer at dinner. Little ones remember rhythm long before they understand words.' },
    'parent-teen': { title: 'Let them see you pray.', text: 'Teens notice what parents do far more than what they say. A short prayer you keep up, without comment, speaks loudly.' },
    'grown-children': { title: 'Use the time you now have.', text: 'Add a weekday Mass, a longer stretch of reading, or a prayer for each of your children and grandchildren by name.' },
    'clergy': { title: 'Protect your own prayer first.', text: 'Fifteen minutes with a book that is for you, not for a homily. Your people are helped by what overflows.' }
  };

  SQ.define({
    id: 'next-step',
    version: 1,
    maxNeeds: 3,
    meta: {
      eyebrow: 'Scepter Publishers',
      title: 'Find Your Next Step',
      tabNote: 'For yourself · about 3 minutes',
      description: 'A short quiz that suggests books, a simple next step and a free ebook for where you are in your faith.',
      lede: [
        'Answer a few short questions and we’ll suggest a simple next step, three books and a free ebook chosen for where you are right now.',
        'Whether you’re curious, coming back, or years into a faithful life, there’s a good place to start.'
      ],
      facts: ['About 3 minutes', 'See your results first', 'Free ebook at the end'],
      startLabel: 'Start the quiz',
      reassurance: 'There are no right answers and nothing is graded. Your answers are used only to choose what to suggest to you.'
    },

    questions: [
      {
        id: 'age', type: 'single', prompt: 'First, how old are you?',
        help: 'So we can suggest books written for your stage of life.',
        columns: 2,
        options: [
          { id: 'teen', label: 'Under 18', set: { age: 'teen', life: 'student' } },
          { id: '18-24', label: '18–24', set: { age: '18-24' } },
          { id: '25-34', label: '25–34', set: { age: '25-34' } },
          { id: '35-49', label: '35–49', set: { age: '35-49' } },
          { id: '50-64', label: '50–64', set: { age: '50-64' } },
          { id: '65-plus', label: '65 or older', set: { age: '65-plus' } }
        ]
      },
      {
        id: 'life', type: 'single', required: false,
        showIf: { age: ['18-24', '25-34', '35-49', '50-64', '65-plus'] },
        prompt: 'Which of these sounds most like your life right now?',
        help: 'Pick the closest one, or skip.',
        options: [
          { id: 'student', label: 'I’m a student', set: { life: 'student' }, score: { need: { purpose: 1 } } },
          { id: 'single', label: 'I’m single and working, or between things', set: { life: 'single' }, score: { need: { purpose: 1 } } },
          { id: 'married', label: 'I’m married or engaged', set: { life: 'married' }, score: { need: { marriage: 2 } } },
          { id: 'parent-young', label: 'I’m raising young children', set: { life: 'parent-young' }, score: { need: { parenting: 2 } } },
          { id: 'parent-teen', label: 'I’m raising teenagers', set: { life: 'parent-teen' }, score: { need: { parenting: 2 } } },
          { id: 'grown-children', label: 'My children are grown, or I’m a grandparent', set: { life: 'grown-children' } },
          { id: 'clergy', label: 'I’m a priest, deacon, religious or seminarian', set: { life: 'clergy' } }
        ]
      },
      {
        id: 'faith', type: 'single',
        prompt: 'Which of these sounds most like you right now?',
        help: 'Wherever you are is a fine place to start.',
        options: [
          { id: 'curious', label: 'I’m curious about the Catholic faith, or not sure what I believe', score: { stage: { exploring: 4 } } },
          { id: 'ocia', label: 'I’m preparing to become Catholic, or thinking about it', score: { stage: { exploring: 4 }, need: { basics: 2 } } },
          { id: 'away', label: 'I grew up Catholic, drifted away, and feel drawn back', score: { stage: { returning: 4 } } },
          { id: 'unsteady', label: 'I’m Catholic and my faith matters, but it isn’t as steady as I’d like', score: { stage: { beginning: 4 } } },
          { id: 'practising', label: 'I’m Catholic and practise regularly. I want to go deeper', score: { stage: { growing: 4 } } },
          { id: 'central', label: 'My faith is the centre of my life. I want to grow and to help others', score: { stage: { deepening: 4 } } }
        ]
      },
      {
        id: 'prayer', type: 'single',
        prompt: 'How often do you pray, apart from Mass or services?',
        help: 'Any kind counts: talking to God, a rosary, a quiet minute. No judgment here.',
        options: [
          { id: 'never', label: 'Rarely or never', ...HABIT(0) },
          { id: 'sometimes', label: 'A few times a month', ...HABIT(1) },
          { id: 'weekly', label: 'Most weeks', ...HABIT(2) },
          { id: 'mostdays', label: 'Most days', ...HABIT(3) },
          { id: 'daily', label: 'Every day, at a set time', ...HABIT(4) }
        ]
      },
      {
        id: 'mass', type: 'single', required: false,
        showIf: { faith: ['away', 'unsteady', 'practising', 'central'] },
        prompt: 'In a typical month, how often do you get to Mass?',
        help: 'Many people can’t always get there. Skip this one if you’d rather.',
        options: [
          { id: 'rare', label: 'Rarely, or only on big occasions', ...HABIT(0) },
          { id: 'monthly', label: 'About once a month', ...HABIT(1) },
          { id: 'most', label: 'Most Sundays', ...HABIT(2) },
          { id: 'every', label: 'Every Sunday', ...HABIT(3) },
          { id: 'more', label: 'Every Sunday, and some weekdays', ...HABIT(4) },
          { id: 'cant', label: 'I can’t get to Mass right now (health, distance, work)' }
        ]
      },
      {
        id: 'confession', type: 'single', required: false,
        showIf: { faith: ['away', 'unsteady'] },
        prompt: 'When did you last go to Confession?',
        help: 'Skip this if you’d rather. Plenty of people haven’t been in years, and there’s a way back.',
        options: [
          { id: 'recent', label: 'Within the last few months' },
          { id: 'year', label: 'Within the last year or two' },
          { id: 'long', label: 'It’s been a long time', score: { need: { sacraments: 3 } } },
          { id: 'unsure', label: 'Many years, or I’m not sure how to start', score: { need: { sacraments: 3, basics: 1 } } }
        ]
      },
      {
        id: 'reading', type: 'single',
        prompt: 'How often do you read something that feeds your faith?',
        help: 'The Bible, a spiritual book, a daily reflection, even an article.',
        options: [
          { id: 'never', label: 'Rarely or never', ...HABIT(0) },
          { id: 'sometimes', label: 'Now and then', ...HABIT(1) },
          { id: 'weekly', label: 'About once a week', ...HABIT(2) },
          { id: 'often', label: 'A few times a week', ...HABIT(3) },
          { id: 'daily', label: 'Almost every day', ...HABIT(4) }
        ]
      },
      {
        id: 'reach', type: 'single',
        showIf: { faith: ['practising', 'central'] },
        prompt: 'How does your faith show up with the people around you?',
        help: 'Pick the closest one. Each is a good place to be.',
        options: [
          { id: 'private', label: 'It’s mostly private, between me and God', value: { reach: 0 } },
          { id: 'asked', label: 'I talk about it when someone asks', value: { reach: 1 } },
          { id: 'invite', label: 'I look for ways to encourage and invite others', value: { reach: 2 }, score: { need: { sharing: 1 } } }
        ]
      },
      {
        id: 'needs-seeking', group: 'needs', type: 'multi', max: 3, columns: 2,
        showIf: { faith: ['curious', 'ocia'] },
        prompt: 'What are you most curious about?',
        help: 'Choose up to three.',
        options: needs(['basics', 'scripture', 'prayer', 'peace', 'suffering', 'purpose', 'saints', 'everyday'])
      },
      {
        id: 'needs-returning', group: 'needs', type: 'multi', max: 3, columns: 2,
        showIf: { faith: ['away'] },
        prompt: 'We’re glad you’re here. What would help most as you come back?',
        help: 'Choose up to three.',
        options: needs(['sacraments', 'prayer', 'basics', 'peace', 'suffering', 'everyday', 'saints', 'purpose'])
      },
      {
        id: 'needs-practising', group: 'needs', type: 'multi', max: 3, columns: 2,
        showIf: { faith: ['unsteady', 'practising', 'central'] },
        prompt: 'What would help you most right now?',
        help: 'Choose up to three.',
        options: needs(['prayer', 'peace', 'suffering', 'everyday', 'virtue', 'scripture', 'sacraments', 'saints', 'seasons', 'purpose', 'sharing'])
      },
      {
        id: 'format', type: 'single', required: false,
        prompt: 'What kind of reading fits your life right now?',
        help: 'Optional. It helps us pick books you’ll actually finish.',
        options: [
          { id: 'minutes', label: 'A few minutes a day', sub: 'Short daily readings', set: { format: 'minutes' } },
          { id: 'chapters', label: 'A book, a chapter at a time', set: { format: 'chapters' } },
          { id: 'deep', label: 'I like to dig in', sub: 'Longer or more demanding books', set: { format: 'deep' } }
        ]
      },
      {
        id: 'lang', type: 'single', required: false,
        prompt: 'Do you prefer to read in English or Spanish? / ¿Prefiere leer en inglés o en español?',
        help: 'Optional. / Opcional.',
        columns: 2,
        options: [
          { id: 'en', label: 'English', set: { lang: 'en' } },
          { id: 'es', label: 'Español', set: { lang: 'es' } }
        ]
      }
    ],

    // Stage = what they said, then what they do. See the header comment.
    derive: function (p, answers, t, core) {
      var said = p.stage;
      var H = core.mean(p.values.habit);
      var reach = core.mean(p.values.reach);
      var stage = said;
      if (H != null) {
        if (said === 'returning' && H >= 3) stage = 'beginning';
        if (said === 'beginning' || said === 'growing' || said === 'deepening') {
          var nudge = { beginning: -0.25, growing: 0, deepening: 0.25 }[said];
          var s = H + nudge;
          if (s < 2.5) stage = 'beginning';
          else if (s >= 3.4 && reach != null && reach >= 2) stage = 'deepening';
          else stage = 'growing';
        }
      }
      p.stage = stage;
      p.said = said;
      p.praysRegularly = answers.prayer === 'mostdays' || answers.prayer === 'daily';
      return p;
    },

    plan: function (p, data) {
      var st = data.segments.stages.filter(function (s) { return s.id === p.stage; })[0];
      var steps = st.steps.slice();
      var extra = lifeStep[p.life];
      if (extra && p.age !== 'teen') steps.push(extra);
      return { title: 'Small steps for this week', intro: 'Pick one to start. They all work, and none is a test.', steps: steps };
    },

    result: {
      eyebrow: 'Your result',
      count: 3,
      filter: function (it) { return !it.gendered; },
      booksTitle: 'Three books picked for you',
      booksIntro: 'Each one is chosen from your answers. The notes under each title say why.',
      notes: function (p) {
        var out = ['This isn’t a grade. It’s a snapshot of where you are today, and it will change.'];
        if (p.stage === 'exploring' && p.praysRegularly) {
          out.push('You already pray regularly, which is a real gift. “Seeking” here refers only to the Catholic faith, and we’ve chosen books accordingly.');
        }
        if ((p.needs || []).indexOf('suffering') >= 0) {
          out.push('If things feel heavy, please talk with a priest or someone you trust. In the US you can also call or text 988 at any hour.');
        }
        return out;
      },
      crossLinks: [{ label: 'Buying for someone else? Try the gift finder', quiz: 'gift-finder' }],
      order: ['head', 'capture', 'plan', 'books'],
      magnet: {
        eyebrow: 'Your free ebook',
        button: 'Send me the free ebook',
        promise: 'Free. No payment details needed.',
        guardianNote: 'Because you’re under 18, we’ll send the ebook to a parent or guardian’s email. Please ask one to enter theirs below.',
        doneTitle: 'Your ebook is ready.',
        doneTextLink: 'Download it below. We’ve also emailed you a copy to keep.',
        doneText: 'It’s on its way to your inbox. You can also read it free in the Scepter app.'
      }
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
