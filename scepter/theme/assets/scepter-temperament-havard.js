/*!
 * Placeholder for Alexandre Havard's Temperament Test.
 *
 * His statements and result words are the copyright of Virtuous Leadership (HVLI), so they are not
 * in this public repository. Replace this file with the real one of the same name:
 *   - from the private Heron repository (scepter-havard/scepter-temperament-havard.js), or
 *   - by running `node scepter/tools/import-havard-test.mjs`, which reads the test from
 *     virtuousleadership.com and writes scepter/private/scepter-temperament-havard.js.
 * Use it on the store only with HVLI's permission. Until it is replaced, the temperament pop-up
 * runs the kit's stand-in questions.
 */
(function (root) {
  if (typeof module === 'object' && module.exports) { module.exports = null; return; }
  var sets = root.ScepterTemperamentSets = root.ScepterTemperamentSets || {};
  if (!('havard' in sets)) sets.havard = null;
})(typeof self !== 'undefined' ? self : this);
