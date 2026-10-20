/* The pop-ups page: the free e-book offer and the temperament test, with the books and booklets the
   sections' presets choose, as they would run on the store. ?set=standin runs the kit's stand-in
   questions instead of Alexandre Havard's test. */
(function () {
  'use strict';
  var STORE = worldStore;
  worldJson(worldData + 'products.json').then(function (j) {
    var byHandle = {};
    j.products.forEach(function (p) { byHandle[p.handle] = p; });
    function book(handle, forWho) {
      var p = byHandle[handle];
      if (!p) return null;
      var it = worldProduct(p);
      return { handle: it.handle, title: it.title, url: it.url, image: it.image, price_cents: it.price_cents, variant: it.variant, for: forWho };
    }
    function booklet(key, label, handle, title, author) {
      var p = byHandle[handle];
      return { key: key, label: label, title: title, author: author, productUrl: STORE + 'products/' + handle, image: p ? worldProduct(p).image : '' };
    }
    var lead = { omnisend: { enabled: true, waitMs: 0 }, shopify: true };
    ScepterPopups.mountEbook(document.getElementById('ebook'), {
      rootUrl: STORE, testMode: true, triggers: { delay: 0, scroll: 0, exitIntent: false }, lead: lead, deliver: 'both',
      interests: [
        booklet('peace', 'Peace', 'why-suffer', 'Why Suffer?', 'Mary Ann Budnik'),
        booklet('prosperity', 'Prosperity', 'five-steps-to-a-financially-healthy-marriage', '5 Steps to a Financially Healthy Marriage', 'Joseph D. Salem'),
        booklet('enlightenment', 'Enlightenment', 'the-reasonableness-of-christianity', 'The Reasonableness of Christianity', 'Peter Kreeft')
      ]
    });

    var standin = /[?&]set=standin\b/.test(location.search);
    var hasHavard = !!(window.ScepterTemperamentSets && window.ScepterTemperamentSets.havard);
    var note = document.getElementById('w-set');
    note.innerHTML = standin
      ? 'The test is running the kit’s <strong>stand-in questions</strong>, which the store would use if Havard’s test can’t be. ' + (hasHavard ? '<a href="./#temperament-test">Run Alexandre Havard’s test</a>.' : '')
      : hasHavard ? 'The test is <strong>Alexandre Havard’s Temperament Test</strong>, in full, with his two stages and his twelve profiles. <a href="?set=standin#temperament-test">Try the stand-in questions</a>, which the store would use if his test can’t be.'
        : 'The test is running the kit’s <strong>stand-in questions</strong>: Alexandre Havard’s file is not in this build.';

    ScepterPopups.mountTemperament(document.getElementById('temperament'), {
      rootUrl: STORE, testMode: true, triggers: { launcher: true, launcherPosition: 'right', delay: 0, exitIntent: false }, lead: lead, askEmail: 'optional',
      questionSet: standin ? 'standin' : 'havard',
      // One Havard book per virtue-challenge: humility, boldness, persistence, magnanimity.
      books: [
        book('from-temperament-to-character', ['all']),
        book('copy-of-virtuous-leadership-an-agenda-for-personal-excellence', ['choleric']),
        book('coached-by-joan-of-arc', ['melancholic']),
        book('discovering-a-mission-alexandre-havard', ['sanguine']),
        book('created-for-greatness-the-power-of-magnanimity', ['phlegmatic'])
      ].filter(Boolean)
    });
  });
})();
