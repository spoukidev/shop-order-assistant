// Normalize message: turns a WhatsApp Cloud API or Instagram Messaging webhook
// (or a simple test payload) into one clean shape the rest of the workflow uses.
const raw = $('Incoming message').first().json;
const body = raw.body ?? raw;
const out = [];

function push(m) {
  if (!m.text || !String(m.text).trim()) return;
  out.push({ json: {
    channel: m.channel,                 // whatsapp | instagram | test
    customer_id: String(m.customer_id),
    customer_name: m.customer_name || '',
    business_id: m.business_id || '',   // phone_number_id (WhatsApp) or page/IG id
    message_id: m.message_id || '',
    text: String(m.text).trim(),
    received_at: new Date().toISOString(),
  }});
}

// 1) WhatsApp Cloud API
if (body.object === 'whatsapp_business_account') {
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const v = change.value || {};
      const names = Object.fromEntries((v.contacts || []).map(c => [c.wa_id, c.profile?.name || '']));
      for (const msg of v.messages || []) {
        if (msg.type !== 'text') continue;          // images, voice notes etc. are skipped
        push({
          channel: 'whatsapp',
          customer_id: msg.from,
          customer_name: names[msg.from] || '',
          business_id: v.metadata?.phone_number_id,
          message_id: msg.id,
          text: msg.text?.body,
        });
      }
    }
  }
}
// 2) Instagram Messaging (Messenger Platform)
else if (body.object === 'instagram' || body.object === 'page') {
  for (const entry of body.entry || []) {
    for (const ev of entry.messaging || []) {
      if (!ev.message || ev.message.is_echo) continue; // ignore our own replies
      push({
        channel: 'instagram',
        customer_id: ev.sender?.id,
        business_id: ev.recipient?.id,
        message_id: ev.message.mid,
        text: ev.message.text,
      });
    }
  }
}
// 3) Test payload: { "channel": "test", "from": "demo-1", "name": "Amine", "text": "..." }
else if (body.text) {
  push({
    channel: body.channel || 'test',
    customer_id: body.from || 'test-user',
    customer_name: body.name || '',
    message_id: 'test-' + Date.now(),
    text: body.text,
  });
}

// One message per run keeps every downstream step simple; Meta rarely batches.
return out.slice(0, 1);
