// Prepare reply: every branch arrives here with { reply_text } plus the order
// data; this builds the exact API body for the customer's channel.
const o = $input.first().json;
const text = String(o.reply_text || '').slice(0, 1000);
let api_body = {};
if (o.channel === 'whatsapp') {
  api_body = { messaging_product: 'whatsapp', to: o.customer_id, type: 'text', text: { body: text } };
} else if (o.channel === 'instagram') {
  api_body = { recipient: { id: o.customer_id }, message: { text } };
}
return [{ json: { ...o, reply_text: text, api_body } }];
