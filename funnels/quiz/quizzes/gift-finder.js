/* Quiz 2: "Find a Book for Someone You Love". For a parent, grandparent, godparent, spouse or
 * friend choosing for someone else.
 *
 * Who it is for: warm traffic, and gift seasons (Advent, First Communion and Confirmation in
 * spring, Mother's and Father's Day). About a minute: 5 or 6 screens.
 *
 * What it keeps: the giver's email only. The person they are choosing for is never named, never
 * emailed, and never gets a profile of their own. Everything the giver says about them is stored
 * under gift_* tags and properties that share no key with a reader's own, so a grandmother buying
 * for a drifting grandson is never emailed as if she were the one drifting, and buying for a
 * Spanish-reading mother does not switch her own language.
 *
 * Children are not placed on a stage; their picks come only from the children's titles.
 * Teens and adults are placed from the giver's best guess about where they are. When the giver
 * says they do not know, the result says so and offers easy, widely loved books.
 * Books that read as "you need this" are never offered as a gift to someone away from the Church.
 */
(function (root) {
  'use strict';
  var SQ = root.ScepterQuiz;
  var seg = SQ.data.segments;

  function giftNeed(id) {
    var n = seg.needs.filter(function (x) { return x.id === id; })[0];
    var score = {}; score[id] = 3;
    return { id: id, label: n.gift, score: { need: score } };
  }
  function giftNeeds(ids) { return ids.map(giftNeed); }

  var ADULT = ['18-24', '25-34', '35-49', '50-64', '65-plus'];
  var NOT_CHILD = ['teen'].concat(ADULT);

  var titleBits = {
    exploring: 'who may not be looking yet',
    returning: 'who has been away from the Church',
    beginning: 'whose faith is quiet',
    growing: 'who wants to go deeper',
    deepening: 'whose faith runs deep'
  };

  // Free ebooks that suit any giver, whoever the gift is for.
  var GIVER_EBOOKS = ['how-to-pray', 'treasury-of-prayers', 'norms-of-piety', 'sanctifying-ordinary-work', 'advent-christmas-carols'];

  SQ.define({
    id: 'gift-finder',
    recipient: 'gift',
    version: 2,
    maxNeeds: 2,
    defaultStage: 'beginning',
    meta: {
      eyebrow: 'Scepter Publishers',
      title: 'Find a Book for Someone You Love',
      tabNote: 'As a gift · about 1 minute',
      description: 'A one-minute quiz that suggests books for a child, a teen or an adult, with a free ebook for you.',
      lede: [
        'Tell us a little about the person you have in mind and we’ll suggest three books they’re likely to enjoy.',
        'You don’t need to know their whole story. Your best guess is plenty.'
      ],
      facts: ['About 1 minute', 'We never ask for their name or email', 'Free ebook for you'],
      startLabel: 'Find a gift',
      reassurance: 'We only ask about them in general terms, and we never contact them. The only email we’ll ever ask for is yours.'
    },

    questions: [
      {
        id: 'age', type: 'single', prompt: 'How old is the person you’re choosing for?',
        columns: 2,
        options: [
          { id: 'child', label: 'A child (under 13)', set: { age: 'child' } },
          { id: 'teen', label: 'A teenager', set: { age: 'teen' } },
          { id: '18-24', label: '18–24', set: { age: '18-24' } },
          { id: '25-34', label: '25–34', set: { age: '25-34' } },
          { id: '35-49', label: '35–49', set: { age: '35-49' } },
          { id: '50-64', label: '50–64', set: { age: '50-64' } },
          { id: '65-plus', label: '65 or older', set: { age: '65-plus' } }
        ]
      },
      {
        id: 'occasion-child', group: 'occasion', type: 'single', required: false,
        showIf: { age: ['child'] },
        prompt: 'Is there an occasion?',
        help: 'Optional.',
        options: [
          { id: 'none', label: 'Birthday, Christmas or just because' },
          { id: 'sacrament', label: 'First Communion, First Confession or Baptism', score: { need: { sacraments: 2 } } }
        ]
      },
      {
        id: 'occasion-teen', group: 'occasion', type: 'single', required: false,
        showIf: { age: ['teen'] },
        prompt: 'Is there an occasion?',
        help: 'Optional.',
        options: [
          { id: 'none', label: 'Birthday, Christmas or just because' },
          { id: 'sacrament', label: 'Confirmation', score: { need: { sacraments: 2 } } },
          { id: 'ocia', label: 'They’re becoming Catholic', score: { need: { basics: 2 } }, set: { stage: 'exploring' } },
          { id: 'hard', label: 'They’re going through a hard time', score: { need: { suffering: 2, peace: 1 } } }
        ]
      },
      {
        id: 'occasion', group: 'occasion', type: 'single', required: false,
        showIf: { age: ADULT },
        prompt: 'Is there an occasion?',
        help: 'Optional.',
        options: [
          { id: 'none', label: 'Birthday, Christmas or just because' },
          { id: 'sacrament', label: 'First Communion, Confirmation or Baptism', score: { need: { sacraments: 2 } } },
          { id: 'wedding', label: 'An engagement or wedding', score: { need: { marriage: 2 } } },
          { id: 'ocia', label: 'They’re becoming Catholic', score: { need: { basics: 2 } }, set: { stage: 'exploring' } },
          { id: 'hard', label: 'They’re going through a hard time', score: { need: { suffering: 2, peace: 1 } } },
          { id: 'newparent', label: 'A new baby, or they’re raising young children', score: { need: { parenting: 2 } } },
          { id: 'ordination', label: 'Ordination, vows or an anniversary of one', score: { need: { prayer: 2, sharing: 1 } }, set: { life: 'clergy' } }
        ]
      },
      {
        id: 'faith', type: 'single',
        showIf: { age: NOT_CHILD },
        prompt: 'As far as you can tell, where are they with faith right now?',
        help: 'Go by what you’ve seen. A best guess is fine.',
        options: [
          { id: 'away', label: 'Not interested yet, or not sure about faith', score: { stage: { exploring: 3 } } },
          { id: 'other', label: 'A Christian, but not Catholic', score: { stage: { exploring: 3 } } },
          { id: 'lapsed', label: 'Raised Catholic but away from the Church', score: { stage: { returning: 3 } } },
          { id: 'casual', label: 'Goes to Mass, but faith is not a big part of daily life', score: { stage: { beginning: 3 } } },
          { id: 'faithful', label: 'Faithful, and wants to grow', score: { stage: { growing: 3 } } },
          { id: 'devout', label: 'Deeply devout', score: { stage: { deepening: 3 } } },
          { id: 'unsure', label: 'I honestly don’t know', score: { stage: { beginning: 3 } }, set: { unsure: true } }
        ]
      },
      {
        id: 'needs-child', group: 'needs', type: 'multi', max: 2,
        showIf: { age: ['child'] },
        prompt: 'What would you love the book to do?',
        columns: 2,
        options: [
          { id: 'prayer', label: 'Help them learn to pray', score: { need: { prayer: 3 } } },
          { id: 'sacraments', label: 'Get ready for Confession or First Communion', score: { need: { sacraments: 3 } } },
          { id: 'saints', label: 'Introduce them to saints and heroes', score: { need: { saints: 3 } } },
          { id: 'story', label: 'Just be a good story we’ll enjoy together', score: { need: { virtue: 3 } } }
        ]
      },
      {
        id: 'needs-teen', group: 'needs', type: 'multi', max: 2, columns: 2,
        showIf: { age: ['teen'] },
        prompt: 'What might they welcome most right now?',
        options: giftNeeds(['prayer', 'peace', 'suffering', 'everyday', 'basics', 'sacraments', 'scripture', 'saints', 'virtue', 'purpose'])
      },
      {
        id: 'needs', group: 'needs', type: 'multi', max: 2, columns: 2,
        showIf: { age: ADULT },
        prompt: 'What might they welcome most right now?',
        options: giftNeeds(['prayer', 'peace', 'suffering', 'everyday', 'basics', 'sacraments', 'scripture', 'saints', 'virtue', 'purpose', 'marriage', 'parenting'])
      },
      {
        id: 'format', type: 'single', required: false,
        prompt: 'What kind of reader are they?',
        help: 'Optional.',
        options: [
          { id: 'minutes', label: 'Short and frequent', sub: 'A few minutes at a time', set: { format: 'minutes' } },
          { id: 'chapters', label: 'Likes a good book', sub: 'A chapter at a time', set: { format: 'chapters' } },
          { id: 'deep', label: 'Loves to dig in', sub: 'Longer or more demanding books', set: { format: 'deep' } }
        ]
      },
      {
        id: 'lang', type: 'single', required: false, columns: 2,
        prompt: 'Do they read in English or Spanish?',
        help: 'Optional. ¿Leen en inglés o en español?',
        options: [
          { id: 'en', label: 'English', set: { lang: 'en' } },
          { id: 'es', label: 'Español', lang: 'es', set: { lang: 'es' } }
        ]
      }
    ],

    derive: function (p, answers, t) {
      p.recipient = 'gift';
      if (p.age === 'child') p.stage = 'beginning';
      p.unsure = !!t.sets.unsure && p.stage === 'beginning' && p.age !== 'child';
      return p;
    },

    plan: function (p) {
      var steps = [];
      if (p.age === 'child') {
        steps.push({ title: 'Read it together.', text: 'Bedtime works well. Let them ask questions, and enjoy the pictures.' });
        steps.push({ title: 'Write their name inside the cover.', text: 'Add the date and one sentence about why you chose it.' });
        steps.push({ title: 'Pray one short prayer afterwards.', text: 'A Hail Mary or just “thank you, God” is plenty.' });
      } else {
        steps.push({ title: 'Add a short handwritten note.', text: 'One or two sentences on why you thought of them. The note matters as much as the book.' });
        if (p.stage === 'exploring' || p.stage === 'returning') {
          steps.push({ title: 'Give it as an invitation.', text: 'Resist asking later whether they’ve read it. Trust the book, and pray for them.' });
        } else {
          steps.push({ title: 'Offer to talk about it, if they’d like.', text: 'A shared book can become a good conversation, or a small reading plan you follow together.' });
        }
        steps.push({ title: 'Keep the free ebook for yourself, or pass it on.', text: 'It’s a short read you can pair with the gift.' });
      }
      return { title: 'Giving it well', intro: 'Three small things that help a book land.', steps: steps };
    },

    result: {
      eyebrow: 'Your gift picks',
      count: 3,
      filter: function (it, p) {
        if (it.gendered) return false;
        return p.age !== 'child' || it.audience === 'children';
      },
      magnetFilter: function (it) { return GIVER_EBOOKS.indexOf(it.id) >= 0; },
      title: function (p) {
        if (p.age === 'child') return 'Three books for a young reader';
        if (p.unsure) return 'Books that are easy to give';
        return 'Books for someone ' + titleBits[p.stage];
      },
      tagline: null,
      portrait: function (p, st) {
        if (p.age === 'child') {
          return ['Children learn the faith first at home, from the people who love them. These books are made to be read aloud together, so they work as a gift for the child and for you.'];
        }
        if (p.unsure) {
          return ['You said you’re not sure where they are with faith. These picks are warm and easy to start, so they suit a wide range of readers.'];
        }
        return st.giftPortrait;
      },
      notes: function (p) {
        var out = [];
        if (p.age !== 'child' && (p.stage === 'exploring' || p.stage === 'returning')) {
          out.push('When someone is away from the Church, a good book and a lot of patience are usually the kindest gift. We chose titles that are easy to start and easy to put down.');
        }
        if ((p.needs || []).indexOf('suffering') >= 0) {
          out.push('If they are going through something heavy, your company will mean more than any book. A short note and an offer to listen go a long way.');
        }
        return out;
      },
      booksTitle: 'Three books to consider',
      booksIntro: 'Chosen from what you told us. The note under each title says why.',
      crossLinks: [{ label: 'Want a book for yourself? Try Find Your Next Step', quiz: 'next-step' }],
      order: ['head', 'books', 'capture', 'plan'],
      magnet: {
        eyebrow: 'A free ebook for you',
        button: 'Send me the free ebook',
        promise: 'Free. It’s yours to read or to pass along.',
        doneTitle: 'Your ebook is ready.',
        doneTitleEmail: 'Your ebook is on its way.',
        doneTextLink: 'Download it below. We’ve also emailed you a copy to keep.',
        doneText: 'Check your inbox in a few minutes. You can also read it free in the Scepter app.'
      }
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
