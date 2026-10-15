/* The shared segmentation model: every quiz sorts readers into these same categories, so the
 * email system, the reports and the book tags all speak one language.
 *
 *   age band      teen (under 18) · 18-24 · 25-34 · 35-49 · 50-64 · 65-plus   (child: gift recipients only)
 *   life season   student · single · married · parent-young · parent-teen · grown-children · carer · clergy
 *   stage         exploring → returning → beginning → growing → deepening   (reader-facing names below)
 *   needs         up to three, from the fourteen below
 *
 * Changing an id breaks email segments built on it; change names and copy freely.
 * The stage names are a journey, not a grade: every result is written to encourage.
 * American spelling throughout (Scepter sells in the US).
 */
(function (root) {
  'use strict';
  var SQ = root.ScepterQuiz = root.ScepterQuiz || {};
  SQ.data = SQ.data || {};

  SQ.data.segments = {
    ages: [
      { id: 'child', label: 'A child (under 13)', chip: 'Child', minor: true, giftOnly: true },
      { id: 'teen', label: 'Under 18', chip: 'Teen', minor: true },
      { id: '18-24', label: '18–24', chip: 'Age 18–24' },
      { id: '25-34', label: '25–34', chip: 'Age 25–34' },
      { id: '35-49', label: '35–49', chip: 'Age 35–49' },
      { id: '50-64', label: '50–64', chip: 'Age 50–64' },
      { id: '65-plus', label: '65 or older', chip: 'Age 65+' }
    ],

    lifeSeasons: [
      { id: 'student', label: 'Student', chip: 'Student' },
      { id: 'single', label: 'Single, widowed or divorced', chip: 'On my own' },
      { id: 'married', label: 'Married or engaged', chip: 'Married or engaged', reason: 'For couples' },
      { id: 'parent-young', label: 'Parent of young children', chip: 'Parent of young children', reason: 'For parents of young children' },
      { id: 'parent-teen', label: 'Parent of teens', chip: 'Parent of teens', reason: 'For parents of teens' },
      { id: 'grown-children', label: 'Children grown, retired, or a grandparent', chip: 'Children grown' },
      { id: 'carer', label: 'Caring for a parent or someone who is ill', chip: 'Caregiver' },
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
          'They may not be looking for faith right now. A good book within reach, clear and warm, gives them something to pick up whenever they are curious.'
        ],
        defaultNeed: 'basics',
        steps: [
          { title: 'Read one Gospel, slowly.', text: 'Start with Mark, the shortest. A chapter a day takes about ten minutes.' },
          { title: 'Say one honest prayer.', text: 'Use your own words, even if you are not sure anyone is listening. Saying honestly where you stand is already a prayer.' },
          { title: 'Sit in a church when it’s quiet.', text: 'Five minutes, no agenda. Many churches are open during the day.' }
        ]
      },
      {
        id: 'returning',
        name: 'Coming Home',
        tagline: 'The door is open, and you are wanted back.',
        portrait: [
          'You have known the faith before, and something is drawing you back. Whatever kept you away, you are not starting from nothing, and you are far from alone. Many people come back, and the Church is glad to see them.',
          'The first steps are simpler than they look, and every one of them is met with mercy.'
        ],
        giftPortrait: [
          'They knew the faith once. A warm, easy-to-read book can be an open door if they ever want one.'
        ],
        defaultNeed: 'sacraments',
        steps: [
          { title: 'Go to Mass this Sunday.', text: 'Sit wherever you like. Being there is enough for a first step. If it has been a long time, Confession is the way back to Communion, and there is no hurry.' },
          { title: 'Call or look up Confession times at a nearby parish.', text: 'Tell the priest it has been a while and that you are not sure how to begin. He will guide you through it. If your situation feels complicated, call the parish office and ask to talk with a priest. There is usually more help than people expect.' },
          { title: 'Give God five minutes a day.', text: 'Morning or night, in your own words. Tell Him you’re coming back.' }
        ]
      },
      {
        id: 'beginning',
        name: 'Taking Root',
        tagline: 'You want a real, daily friendship with God.',
        portrait: [
          'Your faith matters to you and you live it, even when the days are full. A simple rhythm of prayer, one that fits the day you actually have, can make it easier to stay close to God.',
          'Saints such as St. Josemaría Escrivá, the founder of Opus Dei, taught that holiness grows from small, faithful habits woven into the day you already have.'
        ],
        giftPortrait: [
          'Faith is part of their life, though it may be quiet. A book that makes daily prayer feel simple is a gift they can use.'
        ],
        defaultNeed: 'prayer',
        steps: [
          { title: 'Offer the day when you wake.', text: 'A short prayer, before your feet touch the floor, giving God the day ahead.' },
          { title: 'Pray ten minutes a day, same time, same place.', text: 'Talk to God about your day as you would to a friend. A short point from a good book gives you somewhere to start.' },
          { title: 'Look back on the day before sleep.', text: 'Take two minutes. Thank God for what went well, tell Him you are sorry for where you fell short, and pick one thing for tomorrow.' }
        ]
      },
      {
        id: 'growing',
        name: 'Growing Deeper',
        tagline: 'The habits are in place. Now you want more of Him.',
        portrait: [
          'You pray most days, go to Mass faithfully and try to live your faith at work and at home. Now you are looking for depth: prayer that is more than routine, a clearer sense of where God is leading, help with the habits you want to change.',
          'This is the season when good spiritual reading and wise guidance make the biggest difference.'
        ],
        giftPortrait: [
          'Their faith is already part of daily life, and they would welcome more depth. A substantial book for prayer or spiritual reading will be read, and reread.'
        ],
        defaultNeed: 'prayer',
        steps: [
          { title: 'Give your prayer a book.', text: 'Fifteen minutes with a daily meditation turns routine into conversation.' },
          { title: 'Make Confession a regular habit.', text: 'Many people go about once a month. Pick a date and keep it, and ask a priest what pace suits you.' },
          { title: 'Look for spiritual direction.', text: 'That means regular conversation with a priest or wise friend about your prayer. Ask someone you trust, or try a retreat or a quiet day of prayer.' }
        ]
      },
      {
        id: 'deepening',
        name: 'Bearing Fruit',
        tagline: 'Your faith runs deep, and your life is turning outward.',
        portrait: [
          'Prayer, the sacraments and spiritual reading are a steady part of your life. You may have known dry stretches and kept going. Many people at this point start to think about friends and family who might welcome what they have been given.',
          'Your next steps are about carrying your prayer into the workday, and friendships that bring others closer to God.'
        ],
        giftPortrait: [
          'Their faith is the center of their life. They will treasure a classic they can pray with for years, or a book they can share with others.'
        ],
        defaultNeed: 'sharing',
        steps: [
          { title: 'Read a saint’s life at length.', text: 'A little each day, all the way through. Let their example stretch you.' },
          { title: 'Make a retreat this year.', text: 'Put the dates in your calendar now; a few days of silence bear fruit all year.' },
          { title: 'Pray for one friend by name, and invite them closer when the moment comes.', text: 'Lend a book, bring someone to a talk, or start a small reading group.' }
        ]
      }
    ],

    // Needs: `label` reads in the quiz (first person), `gift` in the gift finder, `name` is the chip,
    // `reason` explains a book pick. Order is the tie-break when two needs score the same.
    needs: [
      { id: 'prayer', label: 'Learning to pray, or praying better', gift: 'Learning to pray, or praying better', name: 'Prayer', reason: 'Helps with prayer' },
      { id: 'peace', label: 'Finding peace when I worry', gift: 'Finding peace when they worry', name: 'Peace and trust', reason: 'For peace of heart' },
      { id: 'suffering', label: 'Getting through a hard time', gift: 'Getting through a hard time', name: 'Support in hard times', reason: 'For hard times' },
      { id: 'everyday', label: 'Living my faith at work and at home', gift: 'Living their faith at work and at home', name: 'Faith in daily life', reason: 'For ordinary life' },
      { id: 'marriage', label: 'My marriage, or preparing for one', gift: 'Their marriage, or preparing for one', name: 'Marriage', reason: 'For couples' },
      { id: 'parenting', label: 'Raising my children in the faith', gift: 'Raising their children in the faith', name: 'Raising children', reason: 'For parents' },
      { id: 'basics', label: 'Understanding what Catholics believe', gift: 'Understanding what Catholics believe', name: 'Understanding the faith', reason: 'Answers real questions' },
      { id: 'sacraments', label: 'Confession and the Mass: going back, or understanding them better', gift: 'Confession and the Mass', name: 'Confession and the Mass', reason: 'For Confession and the Mass' },
      { id: 'virtue', label: 'Growing in virtue, and working on the faults I keep coming back to', gift: 'Growing in character and virtue', name: 'Growing in virtue', reason: 'Builds virtue' },
      { id: 'scripture', label: 'Knowing the Bible better', gift: 'Knowing the Bible better', name: 'The Bible', reason: 'Opens up Scripture' },
      { id: 'saints', label: 'Getting to know Mary and the saints', gift: 'Mary and the saints', name: 'Mary and the saints', reason: 'Mary and the saints' },
      { id: 'purpose', label: 'Figuring out what God wants for my life', gift: 'Figuring out what God wants for their life', name: 'Purpose and calling', reason: 'For discerning your path' },
      { id: 'sharing', label: 'Helping others come closer to God', gift: 'Helping others come closer to God', name: 'Sharing the faith', reason: 'For sharing the faith' },
      { id: 'seasons', label: 'Living Advent, Lent and the feasts well', gift: 'Living Advent, Lent and the feasts', name: 'The Church’s seasons', reason: 'For Advent, Lent and the feasts' }
    ],

    reasons: {
      stage: { self: 'Suits where you are today', gift: 'Suits where they are today' },
      age: { self: 'Suits your age group', gift: 'Suits their age group' },
      format: { minutes: 'A few minutes a day', chapters: 'A chapter at a time', deep: 'For deep reading' }
    },

    // mode 'notice' (US): a notice under the button. Anything else asks for an unticked box, and a
    // parent or guardian's address always does.
    consent: {
      mode: 'notice',
      text: 'Scepter Publishers will email you the ebook, plus occasional reading suggestions picked for you. We use your answers only to choose what to suggest. You can unsubscribe anytime.',
      checkboxText: 'Yes, Scepter Publishers may also email me occasional reading suggestions picked for me. I can unsubscribe anytime.',
      guardianText: 'Scepter Publishers will email the ebook to you, the parent or guardian. You can unsubscribe anytime.',
      guardianCheckboxText: 'Yes, Scepter Publishers may also email me, the parent or guardian, occasional reading suggestions. I can unsubscribe anytime.',
      privacyUrl: 'https://scepterpublishers.org/policies/privacy-policy',
      privacyLabel: 'Privacy policy'
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
