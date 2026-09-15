# Amani Africa

*"Amani" — Swahili for peace.*

A trusted civic-information proof of concept built for the **OSF × Andela Hackathon** (Stability & Social Cohesion track). Amani Africa gives informal market traders a fast, trustworthy way to check whether their market is calm before they travel to trade — and gives local market-association leaders / peace-committee reps a lightweight console to keep that information accurate.

## The problem

Rumors about unrest, closures, or violence near a market spread fast on WhatsApp and word of mouth, often faster and less reliably than any official channel. Traders — many of whom travel some distance and can't afford a wasted or dangerous trip — have no fast way to check whether a rumor is true, or whether their market is actually safe today. Meanwhile, trusted local leaders (market association heads, peace-committee members) have no simple tool to broadcast a verified status update.

## Who it's for

- **Traders** — the people who need a fast, reliable "is it safe to go today?" check, delivered where they already are: WhatsApp.
- **Verifiers** — a small number of trusted local leaders who confirm rumors and set the tension level for their market. Deliberately low-volume and high-trust, not a crowdsourced feed anyone can post to.

## How it works

A single backend serves two views of the same live data:

- **Trader Assistant** — a WhatsApp-style chat (quick-reply buttons, no typing required) where a trader asks "Is my market safe today?", requests to be vouched for as a known trader, or checks the latest verified fact-check.
- **Verifier Console** — a dashboard where verifiers set a market's tension level (Calm / Watch / High), post a fact-check against a specific rumor, and approve pending vouch requests. Includes a live map of all markets, color-coded by tension.

Because both views share the same backend, a change made in the Verifier Console (e.g. raising a market to "High tension") is reflected instantly in the Trader Assistant and on the map — that live loop is the core proof-of-concept moment.

The same message-handling logic (`whatsapp.js`) powers both the in-browser Trader Assistant simulator **and** a real WhatsApp number via Twilio's free Sandbox, so the "channel people already use" claim is a real, working integration, not a mockup.

## Information sources & trust approach

- Tension levels and fact-checks are only ever set by **verifiers** — a small, named set of local leaders, not the general public. This is a deliberate design choice: open crowdsourcing of safety claims is exactly the rumor problem this tool exists to solve.
- Every fact-check records who posted it and when, and states a claim, a verdict (True / False / Unverified), and an explanation — so traders see *why* something is or isn't true, not just a label.
- Vouching traders in requires review from a verifier before their status changes from "pending" to "approved," another manual trust gate rather than automatic self-registration.

This is a proof of concept: in a real deployment, verifier identity would be authenticated (not just a phone number) and tension-level changes would carry an audit trail.

## AI usage

- **Rumor/intent classification** (`ai.js`): incoming free-text WhatsApp messages are classified into an intent (asking about safety, requesting a vouch, asking for a fact-check, checking status) using the Claude API when a key is configured.
- **Swahili translation** (`ai.js`): responses can be translated to Swahili on demand.
- **Fallback by design**: if no `ANTHROPIC_API_KEY` is set, the app falls back to keyword matching so the demo never breaks and works with zero cost. This was a deliberate reliability choice for a judged, timed demo.
- Anthropic's free trial credit (no credit card, SMS verification only) is more than sufficient for a hackathon demo — classification/translation calls cost fractions of a cent each.

## Real-world constraints considered

- **Low bandwidth / accessibility**: the Trader Assistant works over WhatsApp text messages, no app install, no data-heavy media required, and quick-reply buttons minimize typing.
- **Trust & verification**: tension levels and fact-checks are gated behind a small set of named verifiers, not open to the public.
- **Multilingual access**: Swahili translation available via the AI layer; the architecture supports adding more languages the same way.
- **Local relevance**: markets, cities, and coordinates are configurable per deployment (`store.js`), not hardcoded to one region.
- **Clear next steps**: every WhatsApp reply tells the trader exactly what to say next (check status, ask for a fact-check, request vouching).

## Running it locally

```bash
npm install
cp .env.example .env   # optional - leave ANTHROPIC_API_KEY blank to use the keyword fallback
npm start
```

Then open:
- `http://localhost:3000` — landing page
- `http://localhost:3000/trader.html` — Trader Assistant (simulated WhatsApp chat)
- `http://localhost:3000/verifier.html` — Verifier Console + live map

**Live demo loop**: open the Verifier Console, raise a market to "High" or post a fact-check, then open the Trader Assistant and ask "Is it safe to trade today?" — the change appears immediately.

## Connecting a real WhatsApp number (optional, for the demo video)

1. Create a free [Twilio](https://www.twilio.com/try-twilio) account and open the **WhatsApp Sandbox** under Messaging → Try it out.
2. Follow the sandbox instructions to join from your own WhatsApp (send the given code to the given number).
3. Install [ngrok](https://ngrok.com/) and run `ngrok http 3000` to get a public HTTPS URL for your local server.
4. In the Twilio Sandbox settings, set "When a message comes in" to `https://<your-ngrok-url>/webhook/whatsapp` (HTTP POST).
5. Message the sandbox number from your phone — e.g. "Is Eastleigh safe today?" — and you'll get a real reply from your local server.

## Project structure

```
server.js        Express app: REST API + WhatsApp webhook
whatsapp.js       Shared bot logic (used by both the webhook and the web simulator)
ai.js             Claude API integration + keyword fallback
store.js          In-memory data store (markets, fact-checks, vouch requests)
public/           Landing page, Trader Assistant, Verifier Console, map, styles
```

## What's next (beyond this proof of concept)

- Persistent database instead of in-memory storage
- Authenticated verifier accounts instead of an open console
- SMS fallback (via Twilio) for traders without WhatsApp/data access
- Passive detection: scanning public social/news mentions of a market name plus trouble-related keywords to auto-suggest a verifier check it
