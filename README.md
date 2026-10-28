# Shop Order Assistant (Instagram + WhatsApp)

An n8n workflow for online shops that sell through DMs. A customer writes in Darija, French, Arabic or English; the workflow reads the message with AI, prices the order with plain code, saves it to Google Sheets, confirms it to the customer in their own language, and alerts the shop owner on Telegram.

Built by Spouki · hamoudiahmediyad@gmail.com

## What it does

| Customer message | What happens |
| --- | --- |
| A complete order ("nheb 2 hoodie noir taille L, livraison l Béjaïa…") | Saved as **New** in the Orders sheet, confirmation with the exact total sent, owner alerted on Telegram |
| An order missing details (no size, wilaya, phone or address) | Saved as **Waiting for info**, the customer is asked only for what is missing |
| A follow-up with the missing details ("Taille M, 12 rue Ben Mhidi") | Completes the same order (same order ID) instead of creating a new one |
| A question ("بشحال الكاسكيطة؟") | Answered from your catalog and delivery fees, in the customer's language |
| Anything else (complaint, return) | Owner alerted on Telegram, customer told someone will reply |

Every conversation is also logged in the Inbox sheet.

**Design rule:** the AI only reads messages. Prices, delivery fees, totals and phone validation are done in plain code, so a customer never receives a wrong price.

## Files

- `shop-order-assistant.n8n.json`: the workflow (30 nodes), import it into n8n
- `sheet/Products.csv`, `Delivery.csv`, `Orders.csv`, `Inbox.csv`: the four tabs of the Google Sheet, with sample data for a demo shop
- `code/`: the Code-node source, readable on its own
- `test/run_tests.js`: logic tests (`node test/run_tests.js`)

## Setup (about 30 minutes)

1. **Google Sheet.** Create a new Google Sheet with four tabs named exactly `Products`, `Delivery`, `Orders`, `Inbox`. Import each CSV into its tab (File → Import → Replace current sheet). Replace the sample products with yours. Copy the sheet ID from its URL (the long part between `/d/` and `/edit`).
2. **Import the workflow.** In n8n: Workflows → Import from file → `shop-order-assistant.n8n.json`.
3. **Shop settings.** Open the **Shop settings** node and fill in the shop name, sheet ID, your Telegram chat ID and your WhatsApp phone number ID. This is the only node you need to edit.
4. **Credentials.** Create and select:
   - Google Sheets (OAuth2) on the five Google Sheets nodes
   - OpenAI on the two OpenAI model nodes (the workflow uses `gpt-4o-mini`)
   - Telegram (a bot from @BotFather) on the two Telegram nodes
   - Header Auth on the two "Send … reply" nodes: name `Authorization`, value `Bearer <your Meta access token>`
5. **Verify token.** In **Answer verification**, replace `CHANGE_ME_VERIFY_TOKEN` with a secret word of your choice.
6. **Connect Meta.** In your Meta app, set the webhook URL to `https://<your-n8n-domain>/webhook/shop-orders` with the same verify token, and subscribe to message events for WhatsApp and/or Instagram. Then activate the workflow.

## Test it without Meta

Activate the workflow and send a test message. Test messages go through the whole flow and are logged, but no reply is sent:

```bash
curl -X POST https://<your-n8n-domain>/webhook/shop-orders \
  -H "Content-Type: application/json" \
  -d '{"channel":"test","from":"demo-1","name":"Amine","text":"Salam, nheb 2 hoodie noir taille L, livraison l Bejaia, cité 1000 logements bt 12, 0555123456"}'
```

## Good to know

- Text messages only. Voice notes and photos are skipped for now.
- WhatsApp and Instagram let a business reply freely within 24 hours of the customer's last message, which is how this workflow uses them.
- The delivery fees in `Delivery.csv` are example values. Replace them with your courier's prices.
"# shop-order-assistant" 
