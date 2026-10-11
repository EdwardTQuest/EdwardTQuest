/* Quiz 2: "Find a Book for Someone You Love". For a parent, grandparent, godparent, spouse or
 * friend choosing for someone else.
 *
 * Who it is for: warm traffic, and gift seasons (Advent, First Communion and Confirmation in
 * spring, Mother's and Father's Day). About a minute: 5 or 6 screens.
 *
 * What it keeps: the giver's email only. The person they are choosing for is never named, never
 * emailed, and never gets a profile of their own. Everything the giver says about them is stored
 * under gift_* tags and properties, so a grandmother buying for a drifting grandson is never
 * emailed as if she were the one drifting.
 *
 * Children are not placed on a stage; their picks come only from the children's titles.
 * Teens and adults are placed from the giver's best guess about where they are.
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

  var NOT_CHILD = ['teen', '18-24', '25-34', '35-49', '50-64', '65-plus'];

  var titleBits = {
    exploring: 'who is looking around',
    returning: 'who is finding their way back',
    beginning: 'who is building a daily habit',
    growing: 'who is ready to go deeper',
    deepening: 'whose faith runs deep'
  };

  SQ.define({
    id: 'gift-finder',
    version: 1,
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
        id: 'occasion', type: 'single', required: false,
        prompt: 'Is there an occasion?',
        help: 'Optional.',
        options: [
          { id: 'none', label: 'Birthday, Christmas or just because' },
          { id: 'sacrament', label: 'First Communion, Confirmation or Baptism', score: { need: { sacraments: 3 } } },
          { id: 'wedding', label: 'An engagement or wedding', score: { need: { marriage: 3 } } },
          { id: 'ocia', label: 'They’re becoming Catholic', score: { need: { basics: 3 }, stage: { exploring: 2 } } },
          { id: 'hard', label: 'They’re going through a hard time', score: { need: { suffering: 3, peace: 1 } } },
          { id: 'newparent', label: 'A new baby, or they’re raising young children', score: { need: { parenting: 3 } } }
        ]
      },
      {
        id: 'faith', type: 'single',
        showIf: { age: NOT_CHILD },
        prompt: 'As far as you can tell, where are they with faith right now?',
        help: 'Go by what you’ve seen. A best guess is fine, and there are no wrong answers.',
        options: [
          { id: 'away', label: 'Not interested yet, or not sure about faith', score: { stage: { exploring: 3 } } },
          { id: 'lapsed', label: 'Raised Catholic but away from the Church', score: { stage: { returning: 3 } } },
          { id: 'casual', label: 'Goes to Mass, but faith is mostly casual', score: { stage: { beginning: 3 } } },
          { id: 'faithful', label: 'Faithful, and wants to grow', score: { stage: { growing: 3 } } },
          { id: 'devout', label: 'Deeply devout, and loves to read', score: { stage: { deepening: 3 } } },
          { id: 'unsure', label: 'I honestly don’t know', score: { stage: { beginning: 3 } } }
        ]
      },
      {
        id: 'needs-child', group: 'needs', type: 'multi', max: 2,
        showIf: { age: ['child'] },
        prompt: 'What would you love the book to do?',
        help: 'Choose up to two.',
        columns: 2,
        options: [
          { id: 'prayer', label: 'Help them learn to pray', score: { need: { prayer: 3 } } },
          { id: 'sacraments', label: 'Get ready for Confession or First Communion', score: { need: { sacraments: 3 } } },
          { id: 'saints', label: 'Introduce them to saints and heroes', score: { need: { saints: 3 } } },
          { id: 'story', label: 'Just be a good story we’ll enjoy together', score: { need: { parenting: 2 } } }
        ]
      },
      {
        id: 'needs', group: 'needs', type: 'multi', max: 2, columns: 2,
        showIf: { age: NOT_CHILD },
        prompt: 'What might they welcome most right now?',
        help: 'Choose up to two.',
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
        id: 'lang', type: 'single', required: false,
        prompt: '¿Leen en inglés o en español? / Do they read in English or Spanish?',
        help: 'Optional. / Opcional.',
        columns: 2,
        options: [
          { id: 'en', label: 'English', set: { lang: 'en' } },
          { id: 'es', label: 'Español', set: { lang: 'es' } }
        ]
      }
    ],

    derive: function (p) {
      p.recipient = 'gift';
      if (p.age === 'child') p.stage = 'beginning';
      p.life = null;
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
          steps.push({ title: 'Give it with no strings attached.', text: 'Let it be an invitation, not a message. Resist asking later whether they’ve read it; trust the book and pray for them.' });
        } else {
          steps.push({ title: 'Offer to talk about it, if they’d like.', text: 'A shared book can become a good conversation, or a small reading plan you follow together.' });
        }
        steps.push({ title: 'Keep the free ebook for yourself, or pass it on.', text: 'It’s a short read you can pair with the gift.' });
      }
      return { title: 'Giving it well', intro: 'Three small things that make a book land.', steps: steps };
    },

    result: {
      eyebrow: 'Your gift picks',
      count: 3,
      filter: function (it, p) {
        if (it.gendered) return false;
        return p.age !== 'child' || it.audience === 'children';
      },
      title: function (p) {
        return p.age === 'child' ? 'Three books for a young reader' : 'Books for someone ' + titleBits[p.stage];
      },
      tagline: null,
      portrait: function (p, st) {
        if (p.age === 'child') {
          return ['Children learn the faith first at home, from the people who love them. These books are made to be read aloud together, so they work as a gift for the child and for you.'];
        }
        return st.giftPortrait;
      },
      notes: function (p) {
        var out = [];
        if (p.age !== 'child' && (p.stage === 'exploring' || p.stage === 'returning')) {
          out.push('When someone is away from the Church, the kindest gift is usually a good book and a lot of patience. We’ve chosen titles that are warm and never pushy.');
        }
        if ((p.needs || []).indexOf('suffering') >= 0) {
          out.push('If they are going through something heavy, your company will mean more than any book. A short note and an offer to listen go a long way.');
        }
        return out;
      },
      booksTitle: 'Three books to consider',
      booksIntro: 'Chosen from what you told us. The notes under each title say why.',
      crossLinks: [{ label: 'Want a book for yourself? Try Find Your Next Step', quiz: 'next-step' }],
      order: ['head', 'books', 'capture', 'plan'],
      magnet: {
        eyebrow: 'A free ebook for you',
        button: 'Send me the free ebook',
        promise: 'Free. It’s yours to read or to pass along.',
        doneTitle: 'Your ebook is ready.',
        doneTextLink: 'Download it below. We’ve also emailed you a copy to keep.',
        doneText: 'It’s on its way to your inbox. You can also read it free in the Scepter app.'
      }
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
