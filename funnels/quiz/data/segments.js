/* The shared segmentation model: every quiz sorts readers into these same categories, so the
 * email system, the reports and the book tags all speak one language.
 *
 *   age band      teen (under 18) · 18-24 · 25-34 · 35-49 · 50-64 · 65-plus   (child: gift recipients only)
 *   life season   student · single · married · parent-young · parent-teen · grown-children · clergy
 *   stage         exploring → returning → beginning → growing → deepening   (reader-facing names below)
 *   needs         up to three, from the fourteen below
 *
 * Changing an id breaks email segments built on it; change names and copy freely.
 * The stage names are a journey, not a grade: every result is written to encourage.
 */
(function (root) {
  'use strict';
  var SQ = root.ScepterQuiz = root.ScepterQuiz || {};
  SQ.data = SQ.data || {};

  SQ.data.segments = {
    ages: [
      { id: 'child', label: 'A child (under 13)', chip: 'Child', minor: true, giftOnly: true },
      { id: 'teen', label: 'Under 18', chip: 'Under 18', minor: true },
      { id: '18-24', label: '18–24', chip: 'Age 18–24' },
      { id: '25-34', label: '25–34', chip: 'Age 25–34' },
      { id: '35-49', label: '35–49', chip: 'Age 35–49' },
      { id: '50-64', label: '50–64', chip: 'Age 50–64' },
      { id: '65-plus', label: '65 or older', chip: 'Age 65+' }
    ],

    lifeSeasons: [
      { id: 'student', label: 'Student', chip: 'Student' },
      { id: 'single', label: 'Single, working or between things', chip: 'Single' },
      { id: 'married', label: 'Married or engaged', chip: 'Married or engaged', reason: 'For couples' },
      { id: 'parent-young', label: 'Parent of young children', chip: 'Parent of young children', reason: 'For parents of young children' },
      { id: 'parent-teen', label: 'Parent of teens', chip: 'Parent of teens', reason: 'For parents of teens' },
      { id: 'grown-children', label: 'Children grown, or a grandparent', chip: 'Children grown' },
      { id: 'clergy', label: 'Priest, deacon, religious or seminarian', chip: 'Priest or religious', reason: 'Loved by priests and religious' }
    ],

    // Children's and teen books are offered only to readers these fit (core.eligible).
    audiences: {
      children: { ages: ['child'], life: ['parent-young'], label: 'Written for children' },
      teens: { ages: ['teen'], life: ['parent-teen'], label: 'Written for teens' }
    },

    languages: [
      { id: 'en', label: 'English' },
      { id: 'es', label: 'Español' }
    ],

    stages: [
      {
        id: 'exploring',
        name: 'Seeking',
        tagline: 'You have honest questions, and that is a good place to begin.',
        portrait: [
          'You are curious about God, about the Catholic faith, or about whether any of it could make a difference in an ordinary life like yours. You don’t need to have anything figured out.',
          'Every journey toward God starts with a question. There are clear, patient answers waiting for you, and you can take them at your own pace.'
        ],
        giftPortrait: [
          'They are curious about faith, or keeping it at arm’s length for now. The right book meets them where they are: clear, warm, and never preachy.'
        ],
        defaultNeed: 'basics',
        steps: [
          { title: 'Read one Gospel, slowly.', text: 'Start with Mark, the shortest. A chapter a day takes about ten minutes.' },
          { title: 'Say one honest prayer.', text: 'In your own words. Telling God exactly where you stand is already a prayer.' },
          { title: 'Sit in a church when it’s quiet.', text: 'Five minutes, no agenda. Many churches are open during the day.' }
        ]
      },
      {
        id: 'returning',
        name: 'Coming Home',
        tagline: 'The door is open, and you are wanted back.',
        portrait: [
          'You have known the faith before, and something is drawing you back. Whatever kept you away, you are not starting from nothing, and you are far from alone: many people find their way home at exactly this point.',
          'The first steps are simpler than they look, and every one of them is met with mercy.'
        ],
        giftPortrait: [
          'They knew the faith once and may be finding their way back. A gentle book, with no pressure and no lecture, can be the open door they need.'
        ],
        defaultNeed: 'sacraments',
        steps: [
          { title: 'Go to Mass this Sunday.', text: 'Sit wherever you like. Being there is enough for a first step.' },
          { title: 'Look up Confession times at a nearby parish.', text: 'You can simply tell the priest it has been a while; he will gladly help you with the rest.' },
          { title: 'Give God five minutes a day.', text: 'Morning or night, in your own words. Tell Him you’re coming back.' }
        ]
      },
      {
        id: 'beginning',
        name: 'Taking Root',
        tagline: 'You want a real, daily friendship with God.',
        portrait: [
          'Your faith matters to you and you practise it, but prayer still tends to be something you fit in when you can. You are ready for a simple rhythm that holds up on busy days.',
          'This is where St. Josemaría’s advice shines: small, faithful habits, woven into the day you already have.'
        ],
        giftPortrait: [
          'They practise their faith and want to make it part of every day. A book that turns good intentions into a daily habit is a gift they will use.'
        ],
        defaultNeed: 'prayer',
        steps: [
          { title: 'Offer the day when you wake.', text: 'One sentence, before your feet touch the floor, giving God the day ahead.' },
          { title: 'Pray ten minutes a day, same time, same place.', text: 'Talk to God about your day as you would to a friend. A short point from a good book gives you somewhere to start.' },
          { title: 'Look back on the day before sleep.', text: 'Two minutes: what went well, where you fell short, one thing to do better tomorrow.' }
        ]
      },
      {
        id: 'growing',
        name: 'Growing Deeper',
        tagline: 'The habits are in place. Now you want more of Him.',
        portrait: [
          'You pray most days, go to Mass faithfully and try to live your faith at work and at home. Now you are looking for depth: prayer that is more than routine, a clearer sense of where God is leading, help with the faults that keep coming back.',
          'This is the season when good spiritual reading and wise guidance make the biggest difference.'
        ],
        giftPortrait: [
          'Their faith is already part of daily life, and they are hungry for more depth. A substantial book for prayer or spiritual reading will be read, and reread.'
        ],
        defaultNeed: 'prayer',
        steps: [
          { title: 'Give your prayer a book.', text: 'Fifteen minutes with a daily meditation turns routine into conversation.' },
          { title: 'Make Confession a monthly habit.', text: 'Pick a date, put it in your calendar, and keep it like any other appointment.' },
          { title: 'Look for spiritual direction.', text: 'Ask a priest you trust, or go to a day of recollection or a retreat.' }
        ]
      },
      {
        id: 'deepening',
        name: 'Bearing Fruit',
        tagline: 'Your roots are deep, and your life is turning outward.',
        portrait: [
          'Prayer, the sacraments and spiritual reading are a steady part of your life, and you have kept going through dry seasons. More and more, you think about the people around you who need what you have been given.',
          'Your next steps are about contemplation in the middle of ordinary life, and friendships that bring others closer to God.'
        ],
        giftPortrait: [
          'Their faith is the centre of their life. They will treasure a classic they can pray with for years, or a book they can share with others.'
        ],
        defaultNeed: 'sharing',
        steps: [
          { title: 'Read a saint’s life at length.', text: 'A little each day, all the way through. Let their example stretch you.' },
          { title: 'Make a retreat this year.', text: 'Put the dates in your calendar now; a few days of silence bear fruit all year.' },
          { title: 'Invite one friend closer to God.', text: 'Lend a book, bring someone to a talk, or start a small reading group.' }
        ]
      }
    ],

    // Needs: `label` reads in the quiz (first person), `name` is the chip, `reason` explains a
    // book pick. Order is the tie-break when two needs score the same.
    needs: [
      { id: 'prayer', label: 'Learning to pray, or praying better', gift: 'Learning to pray, or praying better', name: 'Prayer', reason: 'Helps with prayer' },
      { id: 'peace', label: 'Finding peace when I worry', gift: 'Finding peace when they worry', name: 'Peace and trust', reason: 'For peace of heart' },
      { id: 'suffering', label: 'Getting through a hard time', gift: 'Getting through a hard time', name: 'A hard time', reason: 'For hard times' },
      { id: 'everyday', label: 'Living my faith at work and at home', gift: 'Living their faith at work and at home', name: 'Faith in daily life', reason: 'For ordinary life' },
      { id: 'marriage', label: 'My marriage, or preparing for one', gift: 'Their marriage, or preparing for one', name: 'Marriage', reason: 'For couples' },
      { id: 'parenting', label: 'Raising my children in the faith', gift: 'Raising their children in the faith', name: 'Raising children', reason: 'For parents' },
      { id: 'basics', label: 'Understanding what Catholics believe', gift: 'Understanding what Catholics believe', name: 'Understanding the faith', reason: 'Answers real questions' },
      { id: 'sacraments', label: 'Going back to Confession, or understanding the Mass', gift: 'Confession and the Mass', name: 'Confession and the Mass', reason: 'For Confession and the Mass' },
      { id: 'virtue', label: 'Overcoming the same faults again and again', gift: 'Growing in character and virtue', name: 'Growing in virtue', reason: 'Builds virtue' },
      { id: 'scripture', label: 'Knowing the Bible better', gift: 'Knowing the Bible better', name: 'The Bible', reason: 'Opens up Scripture' },
      { id: 'saints', label: 'Getting to know Mary and the saints', gift: 'Mary and the saints', name: 'Mary and the saints', reason: 'Mary and the saints' },
      { id: 'purpose', label: 'Figuring out what God wants for my life', gift: 'Figuring out what God wants for their life', name: 'Purpose and calling', reason: 'For discerning your path' },
      { id: 'sharing', label: 'Helping others come closer to God', gift: 'Helping others come closer to God', name: 'Sharing the faith', reason: 'For sharing the faith' },
      { id: 'seasons', label: 'Living Advent, Lent and the feasts well', gift: 'Living Advent, Lent and the feasts', name: 'The Church’s seasons', reason: 'For Advent, Lent and the feasts' }
    ],

    reasons: {
      stage: { self: 'Fits \u201c{stage}\u201d', gift: 'Suits where they are today' },
      age: { self: 'Suits your age group', gift: 'Suits their age group' },
      format: { minutes: 'A few minutes a day', chapters: 'A chapter at a time', deep: 'For deep reading' }
    },

    consent: {
      mode: 'notice',
      text: 'We’ll email you the ebook, plus occasional reading suggestions picked for you. Unsubscribe anytime.',
      checkboxText: 'Yes, also send me occasional reading suggestions picked for me. I can unsubscribe anytime.',
      guardianText: 'We’ll email the ebook to you, the parent or guardian, plus occasional reading suggestions. Unsubscribe anytime.',
      guardianCheckboxText: 'Yes, also send me, the parent or guardian, occasional reading suggestions. I can unsubscribe anytime.',
      privacyUrl: 'https://scepterpublishers.org/policies/privacy-policy',
      privacyLabel: 'Privacy policy'
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
