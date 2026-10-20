/* A formation quiz page: the variant is the page's data-variant. */
(function () {
  'use strict';
  var el = document.getElementById('quiz');
  worldConfig(el.getAttribute('data-variant') || 'mission').then(function (cfg) { ScepterQuiz.mount(el, cfg); });
})();
