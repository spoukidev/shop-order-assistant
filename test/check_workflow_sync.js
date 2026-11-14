// Fails if a Code node in shop-order-assistant.n8n.json differs from its source
// file in code/. The tests run the files in code/, so drift would mean the tests
// pass while the importable workflow ships different logic.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const workflow = JSON.parse(fs.readFileSync(path.join(root, 'shop-order-assistant.n8n.json'), 'utf8'));

// Code node name -> source file. Keep in sync when adding a Code node.
const MAP = {
  'Shop settings': 'settings.js',
  'Normalize message': 'normalize.js',
  'Build AI context': 'build_context.js',
  'Check & price order': 'price_order.js',
  'Confirmation reply': 'reply_confirm.js',
  'Ask for missing info': 'reply_missing.js',
  'Format answer': 'reply_answer.js',
  'Handoff reply': 'reply_handoff.js',
  'Prepare reply': 'prepare_reply.js',
};

const errs = [];
const codeNodes = workflow.nodes.filter(n => n.parameters && typeof n.parameters.jsCode === 'string');
for (const node of codeNodes) {
  const file = MAP[node.name];
  if (!file) { errs.push(`Code node "${node.name}" has no entry in MAP`); continue; }
  const src = fs.readFileSync(path.join(root, 'code', file), 'utf8');
  if (src.trim() !== node.parameters.jsCode.trim()) errs.push(`"${node.name}" differs from code/${file}`);
}
for (const name of Object.keys(MAP)) {
  if (!codeNodes.some(n => n.name === name)) errs.push(`MAP entry "${name}" has no Code node in the workflow`);
}
// Every connection must point at a node that exists.
const names = new Set(workflow.nodes.map(n => n.name));
for (const [from, outputs] of Object.entries(workflow.connections || {})) {
  if (!names.has(from)) errs.push(`connection from unknown node "${from}"`);
  for (const branch of Object.values(outputs).flat()) {
    for (const link of branch || []) if (!names.has(link.node)) errs.push(`"${from}" connects to unknown node "${link.node}"`);
  }
}

if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
console.log(`OK: ${codeNodes.length} Code nodes match code/, ${names.size} nodes, connections valid`);
