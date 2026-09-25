/*!
 * Scepter temperament test — scoring and default content for the four classical temperaments
 * (choleric, melancholic, sanguine, phlegmatic) as Alexandre Havard presents them in
 * "From Temperament to Character".
 *
 * THE DEFAULT QUESTIONS ARE A STAND-IN written for this kit, not Havard's own test (his site
 * could not be reached from the build environment). Replace them with the official questions,
 * with HVLI's permission, from the theme editor (one block per question) or in QUESTIONS below;
 * see README "Temperament test". The scoring handles either format: forced choice with four
 * answers, or statements answered yes / somewhat / no.
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
      virtue: 'Magnanimity', virtueText: 'Dare great things. Your ideals are meant to be lived, not only contemplated.'
    },
    sanguine: {
      name: 'Sanguine', tagline: 'People-oriented',
      summary: 'You react quickly and brightly, and you move on just as quickly. You bring joy, warmth and energy into every room you enter.',
      strengths: 'Warm, enthusiastic, optimistic, generous: a natural connector.',
      watch: 'Superficiality, distraction, and starting much while finishing little.',
      virtue: 'Fortitude', virtueText: 'Constancy turns enthusiasm into lasting fruit: finish what you begin, and your joy will run deep.'
    },
    phlegmatic: {
      name: 'Phlegmatic', tagline: 'Peace-oriented',
      summary: 'You react slowly and mildly, and you keep an even keel. You are steady, patient, and a peacemaker by nature.',
      strengths: 'Calm, reliable, patient, diplomatic, and a wonderful listener.',
      watch: 'Passivity, comfort, avoiding conflict, and putting things off.',
      virtue: 'Courage', virtueText: 'Your peace is a gift. Courage turns it into initiative: say the word, take the step, lead.'
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

  return { KEYS: KEYS, TEMPERAMENTS: TEMPERAMENTS, QUESTIONS: QUESTIONS, SOURCE: 'stand-in', parseScore: parseScore, normaliseQuestions: normaliseQuestions, score: score };
});
