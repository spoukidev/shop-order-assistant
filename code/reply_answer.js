// Shared reply templates. Each reply node pastes the block it needs; kept in one
// file here so the wording stays consistent across French, Arabic, Darija and English.
const T = {
  french: {
    hello: n => `Merci${n ? ' ' + n : ''} !`,
    confirm: o => `Votre commande ${o.order_id} est bien enregistrée :\n${o.items_text}\nSous-total : ${fmt(o.subtotal_dzd)} DA\nLivraison ${o.wilaya} : ${fmt(o.delivery_dzd)} DA\nTotal : ${fmt(o.total_dzd)} DA, paiement à la livraison.\nNous vous appelons au ${o.phone} pour confirmer.`,
    ask: m => `Pour finaliser votre commande, il nous manque : ${m.join(', ')}.`,
    words: { product: 'le produit', size: 'la taille', color: 'la couleur', phone: 'votre numéro de téléphone', wilaya: 'votre wilaya', address: 'votre adresse' },
    handoff: `Merci pour votre message. Un membre de l'équipe vous répond très vite.`,
  },
  arabic: {
    hello: n => `شكراً${n ? ' ' + n : ''}!`,
    confirm: o => `تم تسجيل طلبك ${o.order_id}:\n${o.items_text}\nالمجموع: ${fmt(o.subtotal_dzd)} دج\nالتوصيل إلى ${o.wilaya}: ${fmt(o.delivery_dzd)} دج\nالإجمالي: ${fmt(o.total_dzd)} دج، الدفع عند الاستلام.\nسنتصل بك على ${o.phone} للتأكيد.`,
    ask: m => `لإكمال طلبك نحتاج: ${m.join('، ')}.`,
    words: { product: 'المنتج', size: 'المقاس', color: 'اللون', phone: 'رقم الهاتف', wilaya: 'الولاية', address: 'العنوان' },
    handoff: 'شكراً على رسالتك، سيرد عليك أحد أفراد الفريق قريباً.',
  },
  darija: {
    hello: n => `Saha${n ? ' ' + n : ''} !`,
    confirm: o => `Commande ${o.order_id} tsejlet :\n${o.items_text}\nSous-total : ${fmt(o.subtotal_dzd)} DA\nLivraison l ${o.wilaya} : ${fmt(o.delivery_dzd)} DA\nTotal : ${fmt(o.total_dzd)} DA, khlas ki tjik.\nN3aytoulek 3la ${o.phone} bach nconfirmiw.`,
    ask: m => `Bach nkemlou la commande, ba9i ykhessna : ${m.join(', ')}.`,
    words: { product: 'wech men produit', size: 'la taille', color: 'la couleur', phone: 'numéro ta3ek', wilaya: 'la wilaya', address: "l'adresse" },
    handoff: 'Saha 3la message ta3ek, wahed men l\'équipe yreplik doka.',
  },
  english: {
    hello: n => `Thanks${n ? ' ' + n : ''}!`,
    confirm: o => `Your order ${o.order_id} is confirmed:\n${o.items_text}\nSubtotal: ${fmt(o.subtotal_dzd)} DA\nDelivery to ${o.wilaya}: ${fmt(o.delivery_dzd)} DA\nTotal: ${fmt(o.total_dzd)} DA, cash on delivery.\nWe'll call you on ${o.phone} to confirm.`,
    ask: m => `To finish your order we still need: ${m.join(', ')}.`,
    words: { product: 'the product', size: 'the size', color: 'the colour', phone: 'your phone number', wilaya: 'your wilaya', address: 'your address' },
    handoff: 'Thanks for your message. Someone from the team will reply shortly.',
  },
};
function fmt(n) { return Number(n || 0).toLocaleString('fr-FR').replace(/ | /g, ' '); }
function lang(o) { return T[o.language] ? o.language : 'french'; }

const o = $('Check & price order').first().json;
const answer = String($input.first().json.text || '').trim();
const L = T[lang(o)];
return [{ json: { ...o, reply_type: 'answered_question', reply_text: answer || L.handoff } }];
