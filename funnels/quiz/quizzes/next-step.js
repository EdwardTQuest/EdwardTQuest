/* Quiz 1: "Find Your Next Step". For a reader choosing for themselves.
 *
 * Who it is for: cold traffic (social, search, a homepage banner) and newsletter readers.
 * Length: 8 to 11 screens, about three minutes. Questions that do not apply are hidden, so a
 * newcomer sees 8 and a practicing Catholic sees 10.
 *
 * How it places a reader (see derive below):
 *   - what they say about their faith sets the starting point;
 *   - what they do (prayer, Mass, reading) decides between Taking Root and Growing Deeper for
 *     practicing Catholics and keeps enthusiasm and modesty from skewing the result;
 *     Bearing Fruit is for a deep, steady practice, whether or not someone talks about it;
 *   - Seeking and Coming Home are never changed by habits, except that a returning reader with a
 *     steady practice is Taking Root. Someone who prays daily in another tradition is still
 *     Seeking in relation to the Catholic faith, and the result says so kindly;
 *   - needs come from what they choose, plus their life season (a couple gets "marriage", a parent
 *     gets "raising children") and the Confession answer. What they tick counts for more than what
 *     is inferred, so a reader's own choices win.
 * Nothing here is shown as a grade: no numbers, no levels, no ladder.
 * Readers under 13 are not offered the quiz: the first age answer ends it and saves nothing.
 */
(function (root) {
  'use strict';
  var SQ = root.ScepterQuiz;
  var seg = SQ.data.segments;

  function need(id, label) {
    var n = seg.needs.filter(function (x) { return x.id === id; })[0];
    var score = {}; score[id] = 3;
    return { id: id, label: label || n.label, score: { need: score } };
  }
  function needs(ids) { return ids.map(function (id) { return need(id); }); }

  var HABIT = function (n) { return { value: { habit: n } }; };

  // One extra step for the reader's life season, added to the three for their stage.
  // `early` is for Seeking and Coming Home readers, who are not assumed to have a practice yet.
  var lifeStep = {
    'student': { title: 'Keep it short and keep it steady.', text: 'Five minutes before the day starts beats an hour you never get to. Tie it to something you already do, like the first coffee.' },
    'single': { title: 'Treat this as a full life, because it is one.', text: 'Your work, your friendships and your free evenings are exactly where God wants to meet you.' },
    'married': { title: 'Try one short prayer together.', text: 'Grace before a meal or a minute before bed is enough. Praying side by side can strengthen a marriage.' },
    'parent-young': { title: 'Pick one family moment and keep it.', text: 'A blessing at bedtime or a short prayer at dinner. Little ones remember rhythm long before they understand words.' },
    'parent-teen': { title: 'Let them see you pray.', text: 'Teens notice what parents do far more than what they say. A short prayer you keep up, without comment, speaks loudly.' },
    'grown-children': { title: 'Use the time you now have.', text: 'Add a weekday Mass, a longer stretch of reading, or a prayer for each of your children and grandchildren by name.',
      early: { title: 'Use the time you now have.', text: 'A longer stretch of reading, a quiet walk with a short prayer, or a prayer for each of your children and grandchildren by name.' } },
    'carer': { title: 'Look after yourself too.', text: 'Ten quiet minutes with a short prayer counts. You are giving a great deal, and you are allowed to be tired.' },
    'clergy': { title: 'Protect your own prayer first.', text: 'Fifteen minutes with a book that is for you, not for a homily. Your people are helped by what overflows.', skipEarly: true }
  };

  SQ.define({
    id: 'next-step',
    version: 2,
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
      reassurance: 'There are no right answers. We use what you tell us only to choose what to suggest.'
    },

    questions: [
      {
        id: 'lang', type: 'single', required: false, columns: 2,
        prompt: 'Which language do you prefer to read in?',
        help: 'Optional. ¿En qué idioma prefiere leer?',
        options: [
          { id: 'en', label: 'English', set: { lang: 'en' } },
          { id: 'es', label: 'Español', lang: 'es', set: { lang: 'es' } }
        ]
      },
      {
        id: 'faith', type: 'single',
        prompt: 'Where are you with faith today?',
        help: 'Wherever you are is a fine place to start.',
        options: [
          { id: 'curious', label: 'I’m curious about the Catholic faith, or not sure what I believe', score: { stage: { exploring: 4 } } },
          { id: 'other', label: 'I belong to another Christian church and want to understand Catholics', score: { stage: { exploring: 4 }, need: { basics: 2 } } },
          { id: 'ocia', label: 'I’m preparing to become Catholic, or thinking about it', score: { stage: { exploring: 4 }, need: { basics: 2 } } },
          { id: 'away', label: 'I grew up Catholic, stepped away, and feel drawn back', score: { stage: { returning: 4 } } },
          { id: 'unsteady', label: 'I’m Catholic and my faith matters, but it isn’t as steady as I’d like', score: { stage: { beginning: 4 } } },
          { id: 'practising', label: 'I’m Catholic and practice regularly. I’d like to go deeper', score: { stage: { growing: 4 } } },
          { id: 'central', label: 'My faith is the center of my life', score: { stage: { deepening: 4 } } }
        ]
      },
      {
        id: 'age', type: 'single', columns: 2,
        prompt: 'How old are you?',
        help: 'So we can suggest books written for your stage of life.',
        options: [
          { id: 'under13', label: 'Under 13', stop: {
            title: 'This quiz is for readers 13 and older',
            text: ['We’d love you to find a good book, with a grown-up’s help. Ask a parent or guardian to use our gift finder to choose one for you.'],
            back: 'Go back' } },
          { id: 'teen', label: '13–17', set: { age: 'teen', life: 'student' } },
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
        prompt: 'What is your life like right now?',
        help: 'Pick the closest one, or skip.',
        options: [
          { id: 'student', label: 'I’m a student', set: { life: 'student' }, score: { need: { purpose: 1 } } },
          { id: 'single', label: 'I’m on my own: single, widowed, divorced or separated', set: { life: 'single' }, score: { need: { purpose: 1 } } },
          { id: 'married', label: 'I’m married or engaged', set: { life: 'married' }, score: { need: { marriage: 2 } } },
          { id: 'parent-young', label: 'I’m raising young children', set: { life: 'parent-young' }, score: { need: { parenting: 2 } } },
          { id: 'parent-teen', label: 'I’m raising teenagers', set: { life: 'parent-teen' }, score: { need: { parenting: 2 } } },
          { id: 'grown-children', label: 'My children are grown, I’m retired, or I’m a grandparent', set: { life: 'grown-children' } },
          { id: 'carer', label: 'I’m caring for a parent or someone who is ill', set: { life: 'carer' }, score: { need: { peace: 2 } } },
          { id: 'clergy', label: 'I’m a priest, deacon, religious or seminarian', set: { life: 'clergy' } }
        ]
      },
      {
        id: 'prayer', type: 'single', required: false,
        prompt: 'How often do you pray, apart from Mass or services?',
        help: 'Any kind counts: talking to God, a rosary, a quiet minute.',
        options: [
          { id: 'never', label: 'Rarely or never', ...HABIT(0) },
          { id: 'sometimes', label: 'A few times a month', ...HABIT(1) },
          { id: 'weekly', label: 'Most weeks', ...HABIT(2) },
          { id: 'mostdays', label: 'Most days', ...HABIT(3) },
          { id: 'daily', label: 'Every day', ...HABIT(4) }
        ]
      },
      {
        id: 'mass', type: 'single', required: false,
        showIf: { faith: ['away', 'unsteady', 'practising', 'central'] },
        prompt: 'In a typical month, how often do you get to Mass?',
        help: 'Illness, distance and caring for others keep many people from Mass. Skip this one if you’d rather.',
        options: [
          { id: 'rare', label: 'Rarely, or only on big occasions', ...HABIT(0) },
          { id: 'monthly', label: 'About once a month', ...HABIT(1) },
          { id: 'most', label: 'Most Sundays', ...HABIT(2) },
          { id: 'every', label: 'Every Sunday', ...HABIT(3) },
          { id: 'more', label: 'Every Sunday, and some weekdays', ...HABIT(4) },
          { id: 'cant', label: 'I can’t get to Mass right now (health, distance, work or caring for someone)' },
          { id: 'home', label: 'I follow Mass at home by TV, radio or online, or a minister brings me Communion' }
        ]
      },
      {
        id: 'confession', type: 'single', required: false,
        showIf: { faith: ['away', 'unsteady'] },
        prompt: 'When did you last go to Confession?',
        help: 'Skip this if you’d rather. Plenty of people haven’t been in years, and there’s a way back.',
        options: [
          { id: 'recent', label: 'Within the last year' },
          { id: 'year', label: 'A few years ago', score: { need: { sacraments: 2 } } },
          { id: 'long', label: 'Many years ago', score: { need: { sacraments: 2 } } },
          { id: 'unsure', label: 'I’m not sure how to begin', score: { need: { sacraments: 2, basics: 1 } } }
        ]
      },
      {
        id: 'reading', type: 'single', required: false,
        prompt: 'How often do you read or listen to something that feeds your faith?',
        help: 'A Bible chapter, a spiritual book, a daily reflection, an article or a podcast.',
        options: [
          { id: 'never', label: 'Rarely or never', ...HABIT(0) },
          { id: 'sometimes', label: 'Now and then', ...HABIT(1) },
          { id: 'weekly', label: 'About once a week', ...HABIT(2) },
          { id: 'often', label: 'A few times a week', ...HABIT(3) },
          { id: 'daily', label: 'Almost every day', ...HABIT(4) }
        ]
      },
      {
        id: 'needs-seeking', group: 'needs', type: 'multi', max: 3, columns: 2,
        showIf: { faith: ['curious', 'other', 'ocia'] },
        prompt: 'What would you like to know more about?',
        options: [
          need('basics', 'What Catholics believe'),
          need('scripture', 'The Bible'),
          need('prayer', 'How to pray'),
          need('peace', 'Finding peace when I worry'),
          need('suffering', 'Getting through a hard time'),
          need('purpose', 'Figuring out what God wants for my life'),
          need('saints', 'Mary and the saints'),
          need('everyday', 'How faith fits into everyday life')
        ]
      },
      {
        id: 'needs-returning', group: 'needs', type: 'multi', max: 3, columns: 2,
        showIf: { faith: ['away'] },
        prompt: 'We’re glad you’re here. What would help most as you come back?',
        options: needs(['sacraments', 'prayer', 'basics', 'peace', 'suffering', 'everyday', 'saints', 'purpose'])
      },
      {
        id: 'needs-practising', group: 'needs', type: 'multi', max: 3, columns: 2,
        showIf: { faith: ['unsteady', 'practising', 'central'] },
        prompt: 'What would help you most right now?',
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
      }
    ],

    // Stage = what they said, then what they do. See the header comment.
    derive: function (p, answers, t, core) {
      var said = p.stage;
      var H = core.mean(p.values.habit);
      var stage = said;
      if (H != null) {
        if (said === 'returning' && H >= 3) stage = 'beginning';
        if (said === 'beginning' || said === 'growing' || said === 'deepening') {
          var nudge = { beginning: -0.25, growing: 0, deepening: 0.25 }[said];
          var s = H + nudge;
          stage = s < 2.5 ? 'beginning' : (s >= 3.4 ? 'deepening' : 'growing');
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
      var early = p.stage === 'exploring' || p.stage === 'returning';
      var extra = lifeStep[p.life];
      if (extra && p.age !== 'teen' && !(early && extra.skipEarly)) steps.push(early && extra.early ? extra.early : extra);
      return { title: 'Small steps for this week', intro: 'Pick one to start. Small is fine.', steps: steps };
    },

    result: {
      eyebrow: 'Your result',
      count: 3,
      filter: function (it) { return !it.gendered; },
      booksTitle: 'Three books picked for you',
      booksIntro: 'Each one is chosen from your answers. The note under each title says why.',
      notes: function (p) {
        var out = ['This is a snapshot of where you are today, and it will change.'];
        if (p.stage === 'exploring' && p.said === 'ocia') {
          out.push('If you are preparing to become Catholic, your parish’s OCIA group (the Order of Christian Initiation of Adults, sometimes called RCIA) is the best place for your questions.');
        }
        if (p.stage === 'exploring') {
          out.push('You are welcome at Mass, whatever you believe. Visitors who are not Catholic simply stay seated at Communion.');
        }
        if (p.stage === 'exploring' && p.praysRegularly) {
          out.push('You already pray regularly, which is a real gift. “Seeking” here refers only to the Catholic faith, and we’ve chosen books accordingly.');
        }
        if ((p.needs || []).indexOf('suffering') >= 0) {
          out.push('If things feel heavy, please talk with a priest, a doctor or a friend you trust. If you are in crisis or thinking of harming yourself, in the US you can call or text 988 (the Suicide and Crisis Lifeline) at any hour. Elsewhere, your local emergency number can help.');
        }
        return out;
      },
      crossLinks: [{ label: 'Buying for someone else? Try the gift finder', quiz: 'gift-finder' }],
      order: ['head', 'books', 'capture', 'plan'],
      magnet: {
        eyebrow: 'Your free ebook',
        button: 'Send me the free ebook',
        promise: 'Free. Nothing to pay.',
        guardianNote: 'Because you’re under 18, we’ll send the ebook to a parent or guardian’s email. Please ask one to enter theirs below.',
        doneTitle: 'Your ebook is ready.',
        doneTitleEmail: 'Your ebook is on its way.',
        doneTextLink: 'Download it below. We’ve also emailed you a copy to keep.',
        doneText: 'Check your inbox in a few minutes. You can also read it free in the Scepter app.'
      }
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
