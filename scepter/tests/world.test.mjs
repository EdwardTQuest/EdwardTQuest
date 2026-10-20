// The quizzes world's password Worker (world/worker.js), with a fake asset store: what it serves
// without the password, the sign-in, the cookie, and where it will redirect.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../world/worker.js';

const env = { PREVIEW_PASSWORD: 'right horse battery', ASSETS: { fetch: (req) => Promise.resolve(new Response('asset ' + new URL(req.url).pathname, { status: 200 })) } };
const get = (path, headers = {}) => worker.fetch(new Request('https://edwardthomas.quest' + path, { headers, redirect: 'manual' }), env);
const login = (password, next = '/quizzes/claude/mission/') => worker.fetch(new Request('https://edwardthomas.quest/quizzes/login', {
  method: 'POST', body: new URLSearchParams({ password, next }), redirect: 'manual' }), env);

test('nothing but the cover and the preview picture without the password', async () => {
  assert.equal((await get('/quizzes/world-cover.svg')).status, 200);
  assert.equal((await get('/quizzes/og.jpg')).status, 200);
  for (const path of ['/quizzes/', '/quizzes/world.json', '/quizzes/claude/assets/scepter-temperament-havard.js']) {
    const r = await get(path);
    assert.equal(r.status, 303, path);
    assert.equal(r.headers.get('Location'), '/quizzes/login?next=' + encodeURIComponent(path));
    assert.match(r.headers.get('X-Robots-Tag'), /noindex/);
  }
  assert.equal((await get('/quizzes')).headers.get('Location'), '/quizzes/');
});

test('the right password gives a cookie that opens the world; a wrong or forged one does not', async () => {
  const bad = await login('wrong');
  assert.equal(bad.status, 401);
  const ok = await login('right horse battery');
  assert.equal(ok.status, 303);
  assert.equal(ok.headers.get('Location'), '/quizzes/claude/mission/');
  const cookie = ok.headers.get('Set-Cookie');
  assert.match(cookie, /HttpOnly; Secure; SameSite=Lax/);
  const r = await get('/quizzes/claude/mission/', { Cookie: cookie.split(';')[0] });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('Content-Security-Policy'), /script-src 'self';/);
  assert.equal((await get('/quizzes/', { Cookie: 'scepter_quizzes=9999999999.AAAA' })).status, 303);
  const other = await worker.fetch(new Request('https://edwardthomas.quest/quizzes/', { headers: { Cookie: cookie.split(';')[0] } }),
    { ...env, PREVIEW_PASSWORD: 'a new password' });
  assert.equal(other.status, 303, 'a new password ends old sessions');
});

test('after sign-in it only ever redirects inside the world', async () => {
  for (const next of ['https://evil.example/', '//evil.example/', '/quizzes//evil.example', '/other/', '/quizzes/login']) {
    assert.equal((await login('right horse battery', next)).headers.get('Location'), '/quizzes/', next);
  }
});

test('without a password set it serves nothing', async () => {
  const r = await worker.fetch(new Request('https://edwardthomas.quest/quizzes/'), { ASSETS: env.ASSETS });
  assert.equal(r.status, 503);
});
