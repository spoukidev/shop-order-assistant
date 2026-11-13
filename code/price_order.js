// Check & price order: the AI only reads the message. All prices, totals and
// validation happen here in plain code, so a customer never gets a wrong price.
const ctx = $('Build AI context').first().json;
const ai = $input.first().json.output ?? $input.first().json;
const settings = $('Shop settings').first().json;

const products = $('Load catalog').all().map(i => i.json);
const zones = $('Load delivery fees').all().map(i => i.json);

const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim();
const list = s => String(s ?? '').split(',').map(x => x.trim()).filter(Boolean);

// ---- items -------------------------------------------------------------
const lines = [];
const problems = [];
for (const it of ai.items || []) {
  const p = products.find(x => norm(x.sku) === norm(it.sku)) ||
            products.find(x => norm(x.name) === norm(it.product_name));
  if (!p) { problems.push(`unknown product "${it.product_name || it.sku}"`); continue; }
  if (String(p.in_stock).toLowerCase() === 'no') { problems.push(`${p.name} is out of stock`); continue; }
  const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
  const sizes = list(p.sizes), colors = list(p.colors);
  const size = sizes.find(s => norm(s) === norm(it.size)) || (sizes.length <= 1 ? (sizes[0] || '') : '');
  const color = colors.find(c => norm(c) === norm(it.color)) || (colors.length <= 1 ? (colors[0] || '') : '');
  const unit = Number(String(p.price_dzd).replace(/[^\d.]/g, '')) || 0;
  lines.push({ sku: p.sku, name: p.name, size, color, qty, unit_price: unit, line_total: unit * qty,
               needs_size: !size && sizes.length > 1, needs_color: !color && colors.length > 1 });
}

// ---- customer details ---------------------------------------------------
let phone = String(ai.phone ?? '').replace(/[\s.\-()]/g, '');
if (phone.startsWith('+213')) phone = '0' + phone.slice(4);
if (phone.startsWith('00213')) phone = '0' + phone.slice(5);
if (!phone && ctx.channel === 'whatsapp' && ctx.customer_id.startsWith('213')) phone = '0' + ctx.customer_id.slice(3);
const phoneOk = /^0[5-7]\d{8}$/.test(phone);

const zone = zones.find(z => norm(z.wilaya) === norm(ai.wilaya));
const delivery = zone ? Number(String(zone.fee_dzd).replace(/[^\d.]/g, '')) || 0 : 0;
const address = String(ai.address ?? '').trim();

// ---- what is still missing ---------------------------------------------
const missing = [];
if (!lines.length) missing.push('product');
if (lines.some(l => l.needs_size)) missing.push('size');
if (lines.some(l => l.needs_color)) missing.push('color');
if (!phoneOk) missing.push('phone');
if (!zone) missing.push('wilaya');
if (!address) missing.push('address');

const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
const d = new Date();
const orderId = ctx.pending_order_id || 'ORD-' + d.toISOString().slice(2, 10).replace(/-/g, '') + '-' + String(Math.floor(1000 + Math.random() * 9000));

let route = 'handoff';
if (ai.intent === 'order') route = missing.length ? 'order_missing_info' : 'order_complete';
else if (ai.intent === 'question') route = 'question';
if (ai.intent === 'order' && problems.length && !lines.length) route = 'handoff';

return [{ json: {
  route,
  order_id: orderId,
  channel: ctx.channel,
  customer_id: ctx.customer_id,
  business_id: ctx.business_id,
  customer_name: ai.customer_name || ctx.customer_name || '',
  language: ai.language || 'french',
  phone: phoneOk ? phone : '',
  wilaya: zone ? zone.wilaya : (ai.wilaya || ''),
  address,
  lines,
  items_text: lines.map(l => `${l.qty} x ${l.name}${l.size ? ' ' + l.size : ''}${l.color ? ' ' + l.color : ''}`).join(' + '),
  subtotal_dzd: subtotal,
  delivery_dzd: delivery,
  total_dzd: subtotal + delivery,
  missing,
  problems,
  question: ai.question || '',
  original_message: ctx.text,
  currency: settings.currency || 'DA',
  created_at: d.toISOString(),
}}];
