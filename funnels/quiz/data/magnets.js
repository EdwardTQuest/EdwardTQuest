/* The free ebooks a reader can ask for at the end of a quiz: Scepter's own out-of-print booklets,
 * which it already gives away (today in the Scepter app; before that as a free PDF by email).
 * Each quiz result offers exactly one, chosen by the same tag match as the books.
 *
 * BEFORE LAUNCH fill in `download` for each booklet: a direct link to the PDF or EPUB (for example
 * uploaded to Shopify > Content > Files, or the R2 bucket). With a link, the reader gets a
 * "Download now" button the moment they sign up. Without one, they are pointed to the Scepter app
 * and the email your email system sends (see funnels/PLAYBOOK.md, "Delivery email").
 *
 * Titles and product pages below were seen in web searches of scepterpublishers.org on
 * 2026-09-27. The full free library (50+ booklets) could not be listed from the build machine;
 * add more with the same fields. Tags use the ids in data/segments.js.
 */
(function (root) {
  'use strict';
  var SQ = root.ScepterQuiz = root.ScepterQuiz || {};
  SQ.data = SQ.data || {};
  var P = 'https://scepterpublishers.org/products/';
  var APP = { label: 'Read it free in the Scepter app', url: 'https://scepterpublishers.org/pages/free-spiritual-reading' };
  var SRC = 'web search, scepterpublishers.org product page, 2026-09-27';

  function m(o) {
    o.product = P + o.handle; delete o.handle;
    o.url = o.download || ''; delete o.download;
    o.alt = APP;
    o.source = SRC;
    return o;
  }

  SQ.data.magnets = [
    m({ id: 'how-to-pray', title: 'How to Pray', author: 'Rev. Francis Luna', handle: 'how-to-pray', download: '',
      blurb: 'A short, practical guide to making ten or fifteen minutes of personal prayer each day fruitful.',
      stages: ['returning', 'beginning', 'growing'], needs: ['prayer', 'peace'], priority: 3 }),
    m({ id: 'treasury-of-prayers', title: 'A Treasury of Prayers', author: '', handle: 'a-treasury-of-prayers', download: '',
      blurb: 'The prayers every Catholic knows by heart, and some worth learning: the Our Father, Hail Mary, Memorare, Salve Regina, and short prayers for any moment of the day.',
      stages: ['exploring', 'returning', 'beginning'], needs: ['prayer', 'saints', 'basics'], priority: 2 }),
    m({ id: 'norms-of-piety', title: 'Norms of Piety: A Plan for Everyday Living', author: '', handle: 'norms-of-piety', download: '',
      blurb: 'How to build a personal, realistic plan of prayer into everyday life.',
      stages: ['beginning', 'growing'], needs: ['everyday', 'prayer', 'virtue'], priority: 2 }),
    m({ id: 'sanctifying-ordinary-work', title: 'Sanctifying Ordinary Work', author: '', handle: 'sanctifying-ordinary-work', download: '',
      blurb: 'On the heart of St. Josemaría’s message: ordinary work, done well and offered to God, becomes a path to holiness.',
      stages: ['exploring', 'beginning', 'growing', 'deepening'], needs: ['everyday', 'purpose', 'sharing', 'parenting', 'marriage'], priority: 2 }),
    m({ id: 'why-suffer', title: 'Why Suffer?', author: '', handle: 'why-suffer', download: '',
      blurb: 'For anyone carrying something heavy: illness, a death, a lost job, a strained marriage, money troubles. What faith says about suffering, and where to find strength.',
      stages: ['exploring', 'returning', 'beginning', 'growing', 'deepening'], needs: ['suffering', 'peace'], priority: 1 }),
    m({ id: 'making-the-most-of-confession', title: 'Making the Most of Confession', author: '', handle: 'making-the-most-of-confession', download: '',
      blurb: 'A short guide to getting more out of Confession.',
      stages: ['returning', 'beginning'], needs: ['sacraments', 'basics', 'scripture'], priority: 2 }),
    m({ id: 'frequent-confession-booklet', title: 'Frequent Confession', author: '', handle: 'frequent-confession-1', download: '',
      blurb: 'On the practice of frequent Confession and what it does for the spiritual life.',
      stages: ['growing', 'deepening'], needs: ['sacraments', 'virtue'], priority: 1 }),
    m({ id: 'to-make-a-good-retreat', title: 'To Make a Good Retreat', author: '', handle: 'to-make-a-good-retreat', download: '',
      blurb: 'A short guide for anyone who has decided to make a retreat, or is thinking about it.',
      stages: ['growing', 'deepening'], needs: ['prayer', 'purpose', 'seasons'], priority: 1 }),
    m({ id: 'donkey-at-the-waterwheel', title: 'The Donkey at the Waterwheel', author: 'Malcolm Kennedy', handle: 'the-donkey-at-the-waterwheel', download: '',
      blurb: 'On perseverance in the spiritual life, built around St. Josemaría’s image of the donkey patiently turning the waterwheel.',
      stages: ['growing', 'deepening'], needs: ['virtue', 'everyday', 'sharing', 'scripture'], priority: 1 }),
    m({ id: 'devotion-to-st-joseph', title: 'Devotion to St. Joseph', author: '', handle: 'devotion-to-st-joseph', download: '',
      blurb: 'The Seven Sundays devotion, the Litany of St. Joseph and Pope Leo XIII’s letter on him: a companion for fathers, families and workers.',
      stages: ['beginning', 'growing', 'deepening'], needs: ['saints', 'parenting', 'marriage'], priority: 1 }),
    m({ id: 'thomas-more-making-of-a-saint', title: 'Sir Thomas More: The Making of a Saint', author: '', handle: 'sir-thomas-more-the-making-of-a-saint', download: '',
      blurb: 'How a lawyer, father and statesman became a saint: a short life of St. Thomas More.',
      stages: ['exploring', 'beginning', 'growing'], needs: ['saints', 'everyday', 'purpose', 'basics'], priority: 1 }),
    m({ id: 'advent-christmas-carols', title: 'Advent & Christmas Carols', author: '', handle: 'advent-christmas-carols', download: '',
      blurb: 'The best-loved Advent and Christmas carols and hymns in one free collection, for singing at home.',
      stages: ['exploring', 'returning', 'beginning', 'growing', 'deepening'], needs: ['seasons'], priority: 1 })
  ];
})(typeof window !== 'undefined' ? window : globalThis);
