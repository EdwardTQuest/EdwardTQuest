// The Scepter quizzes world at edwardthomas.quest/quizzes/: a private preview behind a password, in the
// same pattern as the Review room (sjm-review) and My family (family-videos): a sign-in page at
// /quizzes/login, then a cookie. Every page and file under /quizzes/ comes from public/quizzes/ only
// after sign-in, except two that show nothing from the quizzes: world-cover.svg (the portal's window
// onto this world) and og.jpg (the picture a shared link shows).
//
// The password is a secret, never a file: npx wrangler secret put PREVIEW_PASSWORD
// Changing it signs everyone out.

const BASE = '/quizzes';
const COOKIE = 'scepter_quizzes';
const DAYS = 30;
const PUBLIC = new Set([BASE + '/world-cover.svg', BASE + '/og.jpg']);

// The site's own policy: scripts and fonts from this origin only, no inline scripts, no frames.
const SECURITY = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' https: data:; connect-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'"
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === BASE) return redirect(BASE + '/' + url.search, 301);
    if (!path.startsWith(BASE + '/')) return text('Not found', 404);
    if (PUBLIC.has(path)) return dress(await env.ASSETS.fetch(request), 'public, max-age=86400');
    if (path === BASE + '/login') {
      if (request.method === 'POST') return login(request, env);
      return loginPage(safeNext(url.searchParams.get('next')), '', 200);
    }
    if (path === BASE + '/logout') return redirect(BASE + '/login', 303, { 'Set-Cookie': cookie('', 0) });
    if (!env.PREVIEW_PASSWORD) return text('This preview has no password yet. Set one with: npx wrangler secret put PREVIEW_PASSWORD', 503);
    if (!(await signedIn(request, env.PREVIEW_PASSWORD))) {
      return redirect(BASE + '/login?next=' + encodeURIComponent(path + url.search), 303);
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return text('Method not allowed', 405);
    return dress(await env.ASSETS.fetch(request), 'private, no-cache');
  }
};

async function login(request, env) {
  let form;
  try { form = await request.formData(); } catch { form = new FormData(); }
  const next = safeNext(form.get('next'));
  const given = String(form.get('password') || '');
  if (env.PREVIEW_PASSWORD && given && (await same(given, env.PREVIEW_PASSWORD))) {
    return redirect(next, 303, { 'Set-Cookie': cookie(await token(env.PREVIEW_PASSWORD), DAYS * 86400) });
  }
  await new Promise((resolve) => setTimeout(resolve, 600)); // slows guessing a little
  return loginPage(next, 'That isn’t the password.', 401);
}

// Only back into this world, never to another site.
function safeNext(value) {
  const s = String(value || '');
  const ok = s.startsWith(BASE + '/') && !s.startsWith(BASE + '//') && !/[\\\s]/.test(s) &&
    !s.startsWith(BASE + '/login') && !s.startsWith(BASE + '/logout');
  return ok ? s : BASE + '/';
}

const enc = new TextEncoder();
const hmacKey = (secret) => crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

// A session is "expiry.signature", signed with the password, so a new password ends every session.
async function token(secret) {
  const exp = String(Math.floor(Date.now() / 1000) + DAYS * 86400);
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode('quizzes|' + exp));
  return exp + '.' + b64url(sig);
}
async function signedIn(request, secret) {
  const m = (request.headers.get('Cookie') || '').match(new RegExp('(?:^|;\\s*)' + COOKIE + '=(\\d+)\\.([A-Za-z0-9_-]+)'));
  if (!m || Number(m[1]) < Date.now() / 1000) return false;
  try {
    return await crypto.subtle.verify('HMAC', await hmacKey(secret), unb64url(m[2]), enc.encode('quizzes|' + m[1]));
  } catch {
    return false;
  }
}
// Compares in constant time: verify() checks one HMAC against the other.
async function same(a, b) {
  const key = await hmacKey('scepter-quizzes-compare');
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(a));
  return crypto.subtle.verify('HMAC', key, sig, enc.encode(b));
}
function cookie(value, maxAge) {
  return `${COOKIE}=${value}; Path=${BASE}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function dress(res, cacheControl) {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(SECURITY)) out.headers.set(k, v);
  out.headers.set('Cache-Control', cacheControl);
  return out;
}
function redirect(location, status, extra = {}) {
  return new Response(null, { status, headers: { ...SECURITY, Location: location, 'Cache-Control': 'no-store', ...extra } });
}
function text(body, status) {
  return new Response(body, { status, headers: { ...SECURITY, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function loginPage(next, error, status) {
  const about = 'A private preview of Scepter’s quizzes. Sign in to continue.';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Scepter quizzes</title>
<meta name="description" content="${about}">
<meta property="og:type" content="website"><meta property="og:site_name" content="edwardthomas.quest">
<meta property="og:title" content="Scepter quizzes"><meta property="og:description" content="${about}">
<meta property="og:url" content="https://edwardthomas.quest${BASE}/"><meta property="og:image" content="https://edwardthomas.quest${BASE}/og.jpg">
<meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Scepter quizzes, over an open book giving light on a dark green field">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="Scepter quizzes"><meta name="twitter:description" content="${about}"><meta name="twitter:image" content="https://edwardthomas.quest${BASE}/og.jpg">
<style>
:root{--bg:#f4f1ea;--card:#fff;--ink:#16201b;--muted:#56665c;--line:#d7e5d2;--accent:#84171d;--accent-ink:#fff;--top:#1f3d2e}
@media (prefers-color-scheme:dark){:root{--bg:#0f1c15;--card:#16271e;--ink:#f1ede4;--muted:#a9b8ab;--line:#2b4234;--accent:#e08a90;--accent-ink:#1a0d0e;--top:#a9c5a6}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;padding:16px}
form{background:var(--card);border:1px solid var(--line);border-top:4px solid var(--top);border-radius:14px;padding:28px;width:100%;max-width:360px}
h1{font:600 1.25rem/1.3 Georgia,serif;margin:0 0 4px}p{margin:0 0 18px;color:var(--muted);font-size:.92rem}
input{width:100%;font:inherit;padding:10px 12px;border:1px solid var(--line);border-radius:9px;background:transparent;color:inherit}
input:focus{outline:2px solid var(--accent);outline-offset:1px}
button{margin-top:12px;width:100%;font:600 1rem/1 system-ui,sans-serif;padding:11px;border:0;border-radius:9px;background:var(--accent);color:var(--accent-ink);cursor:pointer}
.err{color:var(--accent);font-size:.9rem;margin:10px 0 0}
</style></head><body><form method="post" action="${BASE}/login">
<h1>Scepter quizzes</h1><p>A private preview. Enter the password you were given.</p>
<input type="password" name="password" autocomplete="current-password" autofocus required aria-label="Password">
<input type="hidden" name="next" value="${esc(next)}">
<button type="submit">Enter</button>${error ? `<p class="err" role="alert">${esc(error)}</p>` : ''}
</form></body></html>`;
  return new Response(html, {
    status,
    headers: { ...SECURITY, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }
  });
}
