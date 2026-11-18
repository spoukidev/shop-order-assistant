// Tests the "Verify Meta signature" Code node outside n8n.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SECRET = 'test-app-secret';
const src = fs.readFileSync(path.join(__dirname, '../code/verify_signature.js'), 'utf8');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

function run({ secret = SECRET, allowTest = true, body, rawBody, signature, withBinary = true }) {
  const code = src
    .replace(/const APP_SECRET = '[^']*';/, `const APP_SECRET = ${JSON.stringify(secret)};`)
    .replace(/const ALLOW_UNSIGNED_TEST_MESSAGES = (true|false);/, `const ALLOW_UNSIGNED_TEST_MESSAGES = ${allowTest};`);
  const raw = Buffer.from(rawBody ?? JSON.stringify(body));
  const headers = signature === undefined ? {} : { 'x-hub-signature-256': signature };
  const item = { json: { headers, body } };
  if (withBinary) item.binary = { data: { data: raw.toString('base64'), mimeType: 'application/json' } };
  const ctx = { helpers: { getBinaryDataBuffer: async () => raw } };
  const $input = { first: () => item, all: () => [item] };
  return new AsyncFunction('$input', 'require', code).call(ctx, $input, require);
}
const sign = (raw, secret = SECRET) => 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');

const meta = { object: 'whatsapp_business_account', entry: [] };
const metaRaw = JSON.stringify(meta);
const test = { channel: 'test', from: 'demo-1', text: 'salam' };

const cases = [
  ['valid Meta signature passes', () => run({ body: meta, signature: sign(metaRaw) }), 1],
  ['missing signature is dropped', () => run({ body: meta }), 0],
  ['wrong secret is dropped', () => run({ body: meta, signature: sign(metaRaw, 'other') }), 0],
  ['tampered body is dropped', () => run({ body: meta, rawBody: metaRaw.replace('[]', '[{}]'), signature: sign(metaRaw) }), 0],
  ['malformed header is dropped', () => run({ body: meta, signature: 'sha256=zz' }), 0],
  ['unsigned test payload passes when allowed', () => run({ body: test }), 1],
  ['unsigned test payload is dropped when not allowed', () => run({ body: test, allowTest: false }), 0],
  ['test payload with a bad signature is dropped', () => run({ body: test, signature: 'sha256=00' }), 0],
  ['placeholder secret throws on Meta traffic', () => run({ secret: 'CHANGE_ME_META_APP_SECRET', body: meta, signature: sign(metaRaw) }), 'throw'],
  ['missing raw body throws', () => run({ body: meta, signature: sign(metaRaw), withBinary: false }), 'throw'],
];

(async () => {
  let pass = 0;
  for (const [name, fn, want] of cases) {
    let got;
    try { got = (await fn()).length; } catch (e) { got = 'throw'; }
    const ok = got === want;
    console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (ok ? '' : ` (got ${got}, want ${want})`));
    pass += ok;
  }
  console.log(`\n${pass}/${cases.length} signature tests passed`);
  process.exit(pass === cases.length ? 0 : 1);
})();
