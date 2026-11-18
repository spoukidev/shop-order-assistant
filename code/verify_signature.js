// Verify Meta signature: drops any POST that Meta did not sign, so nobody who
// finds the webhook URL can inject fake orders or Telegram alerts.
// Meta signs every webhook with your app secret (HMAC-SHA256 of the raw body,
// sent in the X-Hub-Signature-256 header).
// Needs: "Raw Body" enabled on the Incoming message webhook (already set) and
// NODE_FUNCTION_ALLOW_BUILTIN=crypto in your n8n environment.
const APP_SECRET = 'CHANGE_ME_META_APP_SECRET';   // Meta app → Settings → Basic → App secret
// Unsigned test payloads ({ "channel": "test", ... }) are only accepted while this
// is true. Set it to false once the shop is live.
const ALLOW_UNSIGNED_TEST_MESSAGES = true;

const crypto = require('crypto');
const item = $input.first();
const headers = item.json.headers || {};
const body = item.json.body || {};
const fromMeta = body.object !== undefined || headers['x-hub-signature-256'] !== undefined;

if (!fromMeta) return ALLOW_UNSIGNED_TEST_MESSAGES ? [item] : [];

if (!APP_SECRET || APP_SECRET.startsWith('CHANGE_ME')) {
  throw new Error('Set APP_SECRET in the "Verify Meta signature" node to your Meta app secret');
}
if (!item.binary || !item.binary.data) {
  throw new Error('Enable Options → Raw Body on the "Incoming message" webhook');
}

const raw = await this.helpers.getBinaryDataBuffer(0, 'data');
const header = String(headers['x-hub-signature-256'] || '');
const expected = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(raw).digest('hex');
const a = Buffer.from(header);
const b = Buffer.from(expected);
if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return [];   // forged or corrupted: stop here

return [item];
