// Runs the workflow's Code nodes outside n8n with mocked node outputs.
const fs = require('fs');
const path = require('path');
const C = p => fs.readFileSync(path.join(__dirname, '../code', p), 'utf8');

function runNode(file, nodes, input) {
  const $ = name => {
    if (!(name in nodes)) throw new Error('node not mocked: ' + name);
    const items = [].concat(nodes[name]).map(j => ({ json: j }));
    return { first: () => items[0], all: () => items };
  };
  const $input = { first: () => ({ json: input }), all: () => [{ json: input }] };
  return new Function('$', '$input', C(file))($, $input);
}

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../sheet/products.json'), 'utf8'));
const fees = JSON.parse(fs.readFileSync(path.join(__dirname, '../sheet/delivery.json'), 'utf8'));
const settings = runNode('settings.js', {}, {})[0].json;

const cases = [
  { name: 'WhatsApp, Darija, complete order',
    hook: { body: { object: 'whatsapp_business_account', entry: [{ changes: [{ value: {
      metadata: { phone_number_id: '1111' }, contacts: [{ wa_id: '213555123456', profile: { name: 'Amine' } }],
      messages: [{ from: '213555123456', id: 'wamid.1', type: 'text', text: { body: 'Salam, nheb 2 hoodie noir taille L, livraison l Bejaia, cité 1000 logements bt 12' } }] } }] }] } },
    ai: { intent: 'order', language: 'darija', customer_name: 'Amine', phone: '', wilaya: 'Béjaïa', address: 'Cité 1000 logements, bt 12',
          items: [{ sku: 'HOOD-01', product_name: 'Hoodie oversize', size: 'L', color: 'Noir', quantity: 2 }] },
    expect: { route: 'order_complete', total_dzd: 7000 + 600, phone: '0555123456' } },
  { name: 'Instagram, French, missing size and address',
    hook: { body: { object: 'instagram', entry: [{ messaging: [{ sender: { id: 'IG77' }, recipient: { id: 'PAGE1' },
      message: { mid: 'm1', text: "Bonjour je veux le jogger beige, je suis à Oran, 0661 22 33 44" } }] }] } },
    ai: { intent: 'order', language: 'french', customer_name: '', phone: '0661 22 33 44', wilaya: 'Oran', address: '',
          items: [{ sku: 'JOG-03', product_name: 'Jogger cargo', size: '', color: 'Beige', quantity: 1 }] },
    expect: { route: 'order_missing_info', missing: ['size', 'address'] } },
  { name: 'Follow-up message completes the pending order',
    pending: [{ order_id: 'ORD-261027-5555', customer_id: 'IG77', status: 'Waiting for info', items: '1 x Jogger cargo Beige', wilaya: 'Oran', phone: '0661223344', missing: 'size, address' }],
    hook: { body: { object: 'instagram', entry: [{ messaging: [{ sender: { id: 'IG77' }, recipient: { id: 'PAGE1' },
      message: { mid: 'm3', text: 'Taille M, 12 rue Larbi Ben Mhidi' } }] }] } },
    ai: { intent: 'order', language: 'french', phone: '0661223344', wilaya: 'Oran', address: '12 rue Larbi Ben Mhidi',
          items: [{ sku: 'JOG-03', product_name: 'Jogger cargo', size: 'M', color: 'Beige', quantity: 1 }] },
    expect: { route: 'order_complete', order_id: 'ORD-261027-5555', total_dzd: 3400 } },
  { name: 'Arabic price question',
    hook: { body: { channel: 'test', from: 'demo-3', text: 'بشحال الكاسكيطة؟' } },
    ai: { intent: 'question', language: 'arabic', question: 'How much is the cap?', items: [] },
    expect: { route: 'question' } },
  { name: 'Complaint goes to a human',
    hook: { body: { channel: 'test', from: 'demo-4', text: "Ma commande n'est jamais arrivée !!" } },
    ai: { intent: 'other', language: 'french', items: [] },
    expect: { route: 'handoff' } },
  { name: 'Ignores Instagram echo of our own reply',
    hook: { body: { object: 'instagram', entry: [{ messaging: [{ sender: { id: 'PAGE1' }, recipient: { id: 'IG77' },
      message: { mid: 'm2', text: 'Merci !', is_echo: true } }] }] } },
    expect: { ignored: true } },
];

let pass = 0;
for (const c of cases) {
  const norm = runNode('normalize.js', { 'Incoming message': c.hook }, {});
  if (c.expect.ignored) { const ok = norm.length === 0; console.log((ok ? 'PASS' : 'FAIL') + '  ' + c.name); pass += ok; continue; }
  const msg = norm[0].json;
  const nodes = { 'Normalize message': msg, 'Load catalog': catalog, 'Load delivery fees': fees, 'Shop settings': settings, 'Find pending order': c.pending || [{}] };
  const ctx = runNode('build_context.js', nodes, {})[0].json;
  nodes['Build AI context'] = ctx;
  const order = runNode('price_order.js', nodes, { output: c.ai })[0].json;
  nodes['Check & price order'] = order;
  const file = { order_complete: 'reply_confirm.js', order_missing_info: 'reply_missing.js', handoff: 'reply_handoff.js', question: 'reply_answer.js' }[order.route];
  const reply = runNode(file, nodes, { text: 'الكاسكيطة بـ 1 200 دج، متوفرة بالأسود والأبيض.' })[0].json;
  const sent = runNode('prepare_reply.js', nodes, reply)[0].json;

  const errs = [];
  for (const [k, v] of Object.entries(c.expect)) {
    if (JSON.stringify(order[k]) !== JSON.stringify(v)) errs.push(`${k}: got ${JSON.stringify(order[k])}, want ${JSON.stringify(v)}`);
  }
  if (!sent.reply_text) errs.push('empty reply');
  console.log((errs.length ? 'FAIL' : 'PASS') + '  ' + c.name + (errs.length ? '\n      ' + errs.join('\n      ') : ''));
  console.log('      channel=' + msg.channel + ' route=' + order.route + '\n      reply: ' + sent.reply_text.replace(/\n/g, ' / '));
  if (msg.channel !== 'test') console.log('      api_body: ' + JSON.stringify(sent.api_body).slice(0, 110));
  if (!errs.length) pass++;
}
console.log(`\n${pass}/${cases.length} passed`);
process.exit(pass === cases.length ? 0 : 1);
