# Amani Africa

*"Amani" — Swahili for peace.*

A proof of concept built for the **OSF × Andela Hackathon** (Stability & Social Cohesion, with Safety, Reporting & Protection elements). Amani Africa is a de-escalation tool for nationality-based and rumor-driven community tension — the pattern behind incidents like attacks on Burundian traders in Kenya, or attacks on Kenyan, Ghanaian, and other African nationals' businesses in South Africa. It gives communities a way to check verified information before acting on a rumor, report a concern confidentially before it escalates, and request protection — while giving trusted local verifiers a lightweight console to confirm or debunk claims and track tension by area.

**Sample data note**: the regions, reports, and fact-checks shipped in this repo (`store.js`) are illustrative placeholders for the demo only. None of them describe a real incident, community, or nationality — in a real deployment, all region data and fact-checks would come only from vetted local verifiers, never hardcoded.

## The problem

Attacks on people or businesses tied to nationality rarely start as violence — they start as an unverified claim ("a group from X did Y") spreading on WhatsApp and social media faster than anyone can check it. By the time a crowd has formed, it's too late for a fact-check to stop it. The gap is upstream: there's usually no fast, trusted way for (a) an ordinary person to check whether a claim is true before acting on it, (b) someone who sees a crowd forming or a rumor spreading to flag it *before* it escalates, without exposing themselves, or (c) a targeted person to quietly ask for help.

## Who it's for

- **Community members** — residents, traders, and business owners (of any nationality) who want to check whether an area is calm before traveling there, report a concerning rumor or gathering confidentially, or request a protection contact if they feel at risk.
- **Verifiers** — a small, trusted, and deliberately **cross-community** group (e.g. a local leader plus a representative of an affected diaspora community plus a neutral party like a faith leader or NGO/peace-committee member) who confirm or debunk specific claims and set the tension level for an area. This is not a crowdsourced feed — a single-community verifier pool would risk becoming another vector for the same narrative it's meant to check.

## How it works

A single backend serves two views of the same live data:

- **Community Assistant** — a WhatsApp-style chat (quick-reply buttons, minimal typing) where anyone can ask "Is this area calm today?", confidentially report a rumor/gathering/targeted business/attack in progress (with an optional photo or video attached as evidence), request a protection contact, subscribe to alerts for an area, or check the latest verified fact-check.
- **Verifier Console** — a dashboard with a live map of all areas color-coded **Green / Amber / Red**, an incoming-reports queue, a fact-check form (which can be pre-filled directly from a report), a protection-request queue, subscriber counts per area, and a log of every alert sent.

Because both views share the same backend, a report submitted anonymously in the Community Assistant appears immediately in the Verifier Console, and a tension-level change or fact-check posted by a verifier is reflected immediately back in the Community Assistant and on the map — that live loop (report → verify → debunk/confirm → area sees the result) is the core proof-of-concept moment, and it's the same loop that would need to run in minutes, not hours, to actually prevent an escalation.

**Checking is pull, alerts are push.** Asking "Is it calm here today?" only helps someone who thinks to ask. The part that actually reaches people who don't is subscriptions: anyone can subscribe to an area once (say "subscribe Eastleigh," or tap "Get alerts for this area"), and from then on every tension change and every fact-check for that area is pushed to them automatically over WhatsApp (`broadcast.js`) — no one has to ask first.

The same message-handling logic (`whatsapp.js`) powers both the in-browser Community Assistant simulator **and** a real WhatsApp number via Twilio's free Sandbox, so the "channel people already use" claim is a real, working integration, not a mockup.

## Design choices made specifically to prevent misuse

These aren't afterthoughts — they were the main design constraint once the target moved from "market logistics" to "nationality-based violence":

- **No identity registry.** There is no feature that lists "who is a foreign trader" or ties nationality to a public profile. The old idea of pre-registering/"vouching" traders by identity was deliberately dropped for this reason — in a xenophobic-violence context, that kind of list is a liability, not a safety feature.
- **Reports are anonymous by default.** A contact is optional and, if given, is visible only to verifiers — never published, never shown to other community members.
- **Tension level only changes on verifier action**, never automatically from raw report volume. This blocks a coordinated flood of false reports from being used to paint a community as dangerous (a realistic attack vector on a tool like this).
- **Verifier pool must be cross-community by design** (documented above) — a single-community verifier set can be captured by the same narrative the tool exists to counter.
- **Fact-checks always carry a claim, verdict, and explanation** — never just a status — so a debunked rumor visibly loses to a stated reason, not just an authority's say-so.
- **Attachments are optional evidence, never required.** A reporter can attach a photo or video (web form, or a real photo sent over WhatsApp) so a verifier has something concrete to check against, but the flow works the same without one - most reports won't have media, and that's fine.
- **Alerts are opt-in per area, never assumed.** Subscribing is a deliberate action; nobody is auto-enrolled, and unsubscribing is a single message.

This is a proof of concept: in a real deployment, verifier identity would be authenticated, verifier composition would be enforced (not just documented), and all actions would carry an audit trail.

## AI usage

- **Intent classification** (`ai.js`): incoming free-text WhatsApp messages are classified (checking safety, reporting a concern, requesting protection, asking for a fact-check, checking status) using the Claude API when a key is configured.
- **Swahili translation** (`ai.js`): responses can be translated to Swahili on demand; the architecture supports adding more languages the same way.
- **Fallback by design**: if no `ANTHROPIC_API_KEY` is set, the app falls back to keyword matching so the demo never breaks and works at zero cost. This was a deliberate reliability choice for a judged, timed demo.
- Anthropic's free trial credit (no credit card, SMS verification only) is more than sufficient for a hackathon demo — classification/translation calls cost fractions of a cent each.

## Real-world constraints considered

- **Low bandwidth / accessibility**: the Community Assistant works over WhatsApp text messages, no app install, no data-heavy media, and quick-reply buttons minimize typing.
- **Trust & verification**: tension levels and fact-checks are gated behind a small, cross-community verifier group, not open to the public.
- **Privacy & safety**: no identity registry; reporting and protection requests are anonymous/confidential by default (see "Design choices" above).
- **Multilingual access**: Swahili translation available via the AI layer.
- **Local relevance**: areas, cities, and coordinates are configurable per deployment (`store.js`); the demo includes both Kenyan and South African sample regions to show the pattern isn't country-specific.
- **Clear next steps**: every response tells the person exactly what to do next (check status, report, request protection).

## Running it locally

```bash
npm install
cp .env.example .env   # optional - leave ANTHROPIC_API_KEY blank to use the keyword fallback
npm start
```

Then open:
- `http://localhost:3000` — landing page
- `http://localhost:3000/community.html` — Community Assistant (simulated WhatsApp chat)
- `http://localhost:3000/verifier.html` — Verifier Console + live map

**Live demo loop**: in the Community Assistant, tap "Report a concern" and submit a report for an area. Switch to the Verifier Console — the report appears immediately; click "Turn into fact-check," fill in a verdict and explanation, and post it. Switch back to the Community Assistant and ask for the latest fact-check, or raise/lower the area's tension level and ask "Is it calm here today?" — every change propagates instantly.

## Connecting a real WhatsApp number (optional, for the demo video)

1. Create a free [Twilio](https://www.twilio.com/try-twilio) account and open the **WhatsApp Sandbox** under Messaging → Try it out.
2. Follow the sandbox instructions to join from your own WhatsApp (send the given code to the given number).
3. Install [ngrok](https://ngrok.com/) and run `ngrok http 3000` to get a public HTTPS URL for your local server.
4. In the Twilio Sandbox settings, set "When a message comes in" to `https://<your-ngrok-url>/webhook/whatsapp` (HTTP POST).
5. Message the sandbox number from your phone — e.g. "Is Eastleigh calm today?" — and you'll get a real reply from your local server.
6. To see a real proactive alert, message "subscribe Eastleigh" from your phone, then (from the Verifier Console, or another terminal) raise Eastleigh's tension or post a fact-check — your phone should receive an unprompted WhatsApp message.

**Production note on proactive alerts**: the Twilio Sandbox can only message numbers that have joined it, and WhatsApp's own rules require a pre-approved message template for messages sent outside a 24-hour reply window. `broadcast.js` sends for real through Twilio when `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN` are set, and otherwise logs a `[broadcast:simulated]` line and records it in the Verifier Console's "Recent alerts sent" panel — so the mechanism is fully demonstrable without a Twilio account, and a judge or teammate without Twilio credentials still sees exactly what would have been sent, to whom, and how many people.

## Project structure

```
server.js         Express app: REST API + WhatsApp webhook
whatsapp.js        Shared bot logic (used by both the webhook and the web simulator)
ai.js              Claude API integration + keyword fallback
broadcast.js       Proactive WhatsApp alerts (real via Twilio, or simulated + logged)
store.js           In-memory data store (regions, fact-checks, reports, protection requests, subscriptions)
uploads/           Report photo/video attachments (created at runtime, not committed)
public/            Landing page, Community Assistant, Verifier Console, map, styles
```

## Relevance beyond this demo

The Kenya and South Africa examples in this README are illustrative, not the whole point. Three things make this more than a snapshot of one moment:

- **Reusable, not one-off.** Once a specific flare-up de-escalates, the same deployment keeps running quietly in Green mode — ready for the next one. Adding a new hotspot is a config change in `store.js` (a new region, a new verifier group), not a rebuild. The value is in early detection over time, the same way a smoke detector's value isn't tied to one fire.
- **Sustainable by design, not by luck.** Large open-crowd crisis-mapping platforms (Ushahidi's original model is the well-documented example) depend on sustained unpaid moderation across a high-volume public crowd, and that volunteer capacity is widely noted in the literature as a long-term sustainability weak point. Amani Africa deliberately avoids that shape: a small, named, cross-community verifier role that can sit inside a mandate that already exists (a peace committee, an NGO's community liaison), not a volunteer corps recruited from scratch. That's a mitigation, not a guarantee — an unpaid verifier role can still atrophy, which is why authenticated verifier accounts are on the roadmap below.
- **The pattern isn't Kenya/South-Africa-specific.** The same rumor-driven, nationality-targeted tension dynamic shows up in other African contexts — DRC intercommunal disputes, for instance — and the architecture (configurable regions, a language layer already proven with Swahili) is built to extend there without a rewrite. Scoped honestly, though: this is built for **pre-escalation community tension**, not for operating inside active armed conflict, which is a different problem with different risks (verifier safety itself becomes the danger in a warzone).

## What's next (beyond this proof of concept)

- Persistent database instead of in-memory storage
- Authenticated verifier accounts, with enforced cross-community composition rather than an open console
- SMS fallback (via Twilio) for people without WhatsApp/data access
- Rate-limiting / anomaly detection on the reports queue, to make a coordinated false-report flood visible to verifiers rather than just averaged away
- Passive detection: scanning public social/news mentions of an area name plus escalation-related keywords to auto-suggest a verifier check it
