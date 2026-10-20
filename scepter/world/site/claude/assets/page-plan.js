/* The reading-plan page the email links to: ?plan= holds the plan. "Retake the quiz" goes back to the
   quiz that made it. */
(function () {
  'use strict';
  var code = new URLSearchParams(location.search).get('plan');
  var d = code ? ScepterEngine.decodePlan(code) : null;
  var variant = d && /^(mission|adventure|treasures)$/.test(d.variant) ? d.variant : 'mission';
  ScepterQuiz.mountPlanPage(document.getElementById('plan'), { rootUrl: worldStore, quizUrl: worldPages + variant + '/' });
})();
