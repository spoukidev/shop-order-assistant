// Build AI context: one item holding the customer message plus the shop catalog
// and delivery zones, written as short text the AI can read.
const msg = $('Normalize message').first().json;
const products = $('Load catalog').all().map(i => i.json)
  .filter(p => p.sku && String(p.in_stock).toLowerCase() !== 'no');
const zones = $('Load delivery fees').all().map(i => i.json).filter(z => z.wilaya);

const catalogText = products.map(p =>
  `- ${p.sku}: ${p.name} | ${p.price_dzd} DA | sizes: ${p.sizes || 'one size'} | colors: ${p.colors || 'one color'}` +
  (p.aliases ? ` | customers also say: ${p.aliases}` : '')
).join('\n');

const wilayaList = zones.map(z => z.wilaya).join(', ');
const deliveryText = zones.map(z => `${z.wilaya} ${z.fee_dzd} DA`).join(', ');

// A draft this customer left unfinished, so a follow-up like "L, cité 1000 logements" completes it
const pending = $('Find pending order').all().map(i => i.json)
  .filter(r => r.order_id && String(r.customer_id) === String(msg.customer_id) && r.status === 'Waiting for info')
  .pop();
const pendingText = pending
  ? `${pending.items || 'no items yet'}; wilaya: ${pending.wilaya || '?'}; address: ${pending.address || '?'}; phone: ${pending.phone || '?'}; still missing: ${pending.missing || '?'}`
  : 'none';

return [{ json: {
  ...msg,
  catalog_text: catalogText,
  wilaya_list: wilayaList,
  delivery_text: deliveryText,
  pending_order_id: pending ? pending.order_id : '',
  pending_text: pendingText,
  shop_name: $('Shop settings').first().json.shop_name,
}}];
