/* Typographic covers and brand marks, drawn from the book's own data.
   No images: every cover is the title, the author, a shelf colour and a motif
   seeded by the title, so each book looks like one of a series. */
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';

  // FNV-1a hash → mulberry32 PRNG: the same title always draws the same cover.
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const f = n => Math.round(n * 10) / 10;

  // Each motif takes `hero`: on a cover (hero false) it keeps clear of the type, which sits in the
  // lower half; in a hero it may fill the frame. The number of r() calls never depends on `hero`,
  // so a title draws the same picture in both places.

  // Topographic rings around a summit: the Scepter UK motif.
  function contour(r, W, H) {
    const cx = W * (0.55 + r() * 0.3), cy = H * (0.1 + r() * 0.16);
    const rings = 9 + Math.floor(r() * 4), step = 15 + r() * 7;
    const ph = [r() * 6.28, r() * 6.28, r() * 6.28], amp = [0.05 + r() * 0.07, 0.03 + r() * 0.05, 0.015 + r() * 0.03];
    let d = '';
    for (let i = 1; i <= rings; i++) {
      const base = i * step, pts = [];
      for (let k = 0; k <= 72; k++) {
        const t = (k / 72) * Math.PI * 2;
        const rr = base * (1 + amp[0] * Math.sin(2 * t + ph[0] + i * 0.25) + amp[1] * Math.sin(3 * t + ph[1] - i * 0.2) + amp[2] * Math.sin(5 * t + ph[2]));
        pts.push(f(cx + rr * Math.cos(t)) + ' ' + f(cy + rr * Math.sin(t) * 0.82));
      }
      d += 'M' + pts.join('L') + 'Z';
    }
    return `<path d="${d}" fill="none" stroke="var(--cv-ac)" stroke-width="0.7" opacity="0.5"/>` +
      `<circle cx="${f(cx)}" cy="${f(cy)}" r="1.6" fill="var(--cv-ac)"/>`;
  }

  // An eight-ray star with its light: the Sinag-Tala motif.
  function rays(r, W, H, hero) {
    const cx = W * (0.25 + r() * 0.5), cy = H * (0.14 + r() * 0.16);
    let out = '';
    for (let i = 1; i <= 5; i++) out += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(i * (18 + r() * 4))}" fill="none" stroke="var(--cv-ac)" stroke-width="0.5" opacity="${f(0.42 - i * 0.06)}"/>`;
    const n = 32 + Math.floor(r() * 16);
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.05;
      const r0 = 9 + r() * 4;
      let r1 = 40 + r() * (i % 4 === 0 ? 170 : 70);
      if (!hero && Math.sin(a) > 0) r1 = Math.min(r1, (H * 0.5 - cy) / Math.sin(a));
      d += `M${f(cx + r0 * Math.cos(a))} ${f(cy + r0 * Math.sin(a))}L${f(cx + r1 * Math.cos(a))} ${f(cy + r1 * Math.sin(a))}`;
    }
    out += `<path d="${d}" stroke="var(--cv-ac)" stroke-width="0.5" opacity="0.45"/>`;
    out += `<path transform="translate(${f(cx)} ${f(cy)}) scale(1.35)" d="${star8(9, 3.4)}" fill="var(--cv-ac)"/>`;
    for (let i = 0; i < 26; i++) out += `<circle cx="${f(r() * W)}" cy="${f(r() * H * (hero ? 0.62 : 0.42))}" r="${f(0.35 + r() * 0.8)}" fill="var(--cv-fg)" opacity="${f(0.2 + r() * 0.5)}"/>`;
    return out;
  }

  // Ridgelines rising to twin peaks: the Scepter Kenya motif. On a cover the range stands on a
  // horizon above the title, so the type always sits on the plain cover colour.
  function strata(r, W, H, hero) {
    const px = W * (0.48 + r() * 0.28), top = H * (hero ? 0.14 + r() * 0.07 : 0.1 + r() * 0.05), ground = H * (hero ? 0.6 : 0.47);
    let out = '';
    const layers = 4;
    for (let L = 0; L < layers; L++) {
      const y0 = top + L * (H * (hero ? 0.06 : 0.05)), pts = [`0 ${f(ground)}`];
      const spread = W * (0.42 + L * 0.2);
      for (let k = 0; k <= 24; k++) {
        const x = (k / 24) * W;
        const dist = Math.abs(x - px) / spread;
        let y = Math.min(ground, y0 + Math.min(1, dist) * (ground - y0) * 0.9 + (r() - 0.5) * 4);
        if (L === 0 && Math.abs(x - px) < W * 0.05) y = y0 + (x < px ? 4 : 0);
        pts.push(f(x) + ' ' + f(y));
      }
      pts.push(`${W} ${f(ground)}`);
      out += `<path d="M${pts.join('L')}Z" fill="var(--cv-ac)" opacity="${f(0.16 + L * 0.1)}"/>`;
    }
    out += `<path d="M0 ${f(ground)}H${W}" stroke="var(--cv-ac)" stroke-width="0.8" opacity="0.7"/>`;
    out += `<path transform="translate(${f(px)} ${f(top - 14)}) scale(0.9)" d="${star4(7, 1.8)}" fill="var(--cv-ac)"/>`;
    let tri = '';
    for (let x = 0; x < W; x += 10) tri += `M${x} ${H}L${x + 5} ${H - 6}L${x + 10} ${H}Z`;
    out += `<path d="${tri}" fill="var(--cv-ac)" opacity="0.55"/>`;
    return out;
  }

  // The Southern Cross over a horizon: the Scepter Australia motif.
  function southern(r, W, H, hero) {
    let out = '';
    for (let i = 0; i < 60; i++) out += `<circle cx="${f(r() * W)}" cy="${f(r() * H * (hero ? 0.7 : 0.44))}" r="${f(0.3 + r() * 0.7)}" fill="var(--cv-fg)" opacity="${f(0.15 + r() * 0.45)}"/>`;
    const cx = W * (0.5 + r() * 0.28), cy = H * (0.22 + r() * 0.08), s = 1.05 + r() * 0.35, rot = -18 + r() * 36;
    // Gacrux, Acrux, Becrux (Mimosa), Delta Crucis, Epsilon Crucis — relative positions.
    const cross = [[0, -34, 6], [4, 36, 7], [-24, 4, 6], [22, -6, 4.8], [9, 14, 3]];
    let st = '';
    cross.forEach(([x, y, k]) => { st += `<path transform="translate(${x} ${y})" d="${star4(k, k * 0.24)}"/>`; });
    out += `<g transform="translate(${f(cx)} ${f(cy)}) rotate(${f(rot)}) scale(${f(s)})" fill="var(--cv-ac)">${st}</g>`;
    const hy = H * (hero ? 0.62 + r() * 0.06 : 0.5 + r() * 0.04);
    out += `<path d="M0 ${f(hy)} Q ${f(W * 0.5)} ${f(hy - 10 - r() * 8)} ${W} ${f(hy + 4)} L${W} ${H} L0 ${H}Z" fill="var(--cv-ac)" opacity="0.14"/>`;
    out += `<path d="M0 ${f(hy)} Q ${f(W * 0.5)} ${f(hy - 10)} ${W} ${f(hy + 4)}" fill="none" stroke="var(--cv-ac)" stroke-width="0.8" opacity="0.6"/>`;
    return out;
  }

  function star8(R, r0) {
    const p = [];
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r0 : R; p.push(f(rr * Math.cos(a)) + ' ' + f(rr * Math.sin(a))); }
    return 'M' + p.join('L') + 'Z';
  }
  function star4(R, r0) {
    const p = [];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r0 : R; p.push(f(rr * Math.cos(a)) + ' ' + f(rr * Math.sin(a))); }
    return 'M' + p.join('L') + 'Z';
  }

  const MOTIFS = { contour, rays, strata, southern };

  // Brand marks: one staff, four finials. currentColor throughout.
  const MARKS = {
    // Orb and cross — the sovereign's sceptre.
    orb: '<svg viewBox="0 0 32 40" aria-hidden="true"><path d="M16 1.5v6M13 4h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="16" cy="12.5" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M11 12.5h10" stroke="currentColor" stroke-width="1"/><path d="M16 17.5 L17.3 38.5 H14.7 Z" fill="currentColor"/><path d="M12.5 21.5h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    // Twin peaks — Batian and Nelion — with a star above.
    peaks: '<svg viewBox="0 0 32 40" aria-hidden="true"><path d="M20.5 1l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill="currentColor"/><path d="M7 17.5 L12.5 8.5 L15.5 12.5 L19 6.5 L25 17.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/><path d="M16 17.5 L17.3 38.5 H14.7 Z" fill="currentColor"/><path d="M12.5 21.5h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    // The Southern Cross crowning the staff.
    cross: '<svg viewBox="0 0 32 40" aria-hidden="true"><g fill="currentColor"><path transform="translate(16 2.6)" d="' + star4(2.6, 0.7) + '"/><path transform="translate(16.7 14.2)" d="' + star4(3, 0.8) + '"/><path transform="translate(10.2 8.6)" d="' + star4(2.4, 0.65) + '"/><path transform="translate(21.8 7.8)" d="' + star4(2, 0.55) + '"/><path transform="translate(19 11.6)" d="' + star4(1.3, 0.4) + '"/></g><path d="M16 18.5 L17.3 38.5 H14.7 Z" fill="currentColor"/><path d="M12.5 22.5h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    // Eight rays — starlight.
    star: '<svg viewBox="0 0 40 40" aria-hidden="true"><path transform="translate(20 20)" d="' + star8(18, 6.5) + '" fill="currentColor"/><circle cx="20" cy="20" r="3.2" fill="var(--paper, #fff)"/></svg>',
  };

  function titleSize(t) {
    const n = t.length, longest = Math.max(...t.split(/\s+/).map(w => w.length));
    if (n <= 10 && longest <= 8) return 'xl';
    if (n <= 22 && longest <= 9) return 'l';
    if (n <= 40 && longest <= 11) return 'm';
    if (n <= 64 && longest <= 14) return 's';
    return 'xs';
  }

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Escaped title text with its fine typography: no break after "St." or inside a year range.
  const typo = s => esc(s).replace(/\b(St|Fr|Vol|No)\. /g, '$1.\u00a0').replace(/\((\d{4})-(\d{4})\)/g, '($1\u2011$2)');

  // Returns the cover's HTML. The cover sizes its type to its own width (container units).
  function cover(book, site, shelfIndex) {
    const pal = site.palette[shelfIndex % site.palette.length];
    const r = rng(hash(book.id || book.title));
    const W = 200, H = 300;
    const art = MOTIFS[site.motif](r, W, H);
    const kind = book.kind && book.kind !== 'book' ? `<span class="cv-kind">${esc(site.kinds[book.kind] || book.kind)}</span>` : '';
    return `<div class="cover cv-${book.kind || 'book'}" style="--cv-bg:${pal.bg};--cv-fg:${pal.fg};--cv-ac:${pal.ac}">` +
      `<svg class="cv-art" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${art}</svg>` +
      `<div class="cv-text"><span class="cv-author">${esc(book.authorShort || book.author || '')}</span>` +
      `<span class="cv-title cv-${titleSize(book.title)}">${typo(book.title)}</span></div>` +
      `<span class="cv-mark">${MARKS[site.mark]}</span>${kind}</div>`;
  }

  // A large motif for the hero, drawn in the site's own accent over its deep colour.
  function heroArt(site, seed) {
    const r = rng(hash(seed || site.key));
    return `<svg viewBox="0 0 200 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${MOTIFS[site.motif](r, 200, 300, true)}</svg>`;
  }

  window.Covers = { cover, heroArt, MARKS, hash, esc, typo };
})();
